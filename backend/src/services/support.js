const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { supportTickets, supportMessages, users } = require("../db/demoStore");
const { queueEmail } = require("./email");

function serializeMessage(row = {}) {
  return {
    id: row.id,
    ticket_id: row.ticket_id,
    sender_id: row.sender_id,
    sender_name: row.sender_name || row.sender_email || "EarnWave Support",
    sender_email: row.sender_email || "",
    sender_role: row.sender_role || "user",
    message: row.message,
    internal: Boolean(row.internal),
    created_at: row.created_at
  };
}

function serializeTicket(row = {}, messages = []) {
  return {
    id: row.id,
    user_id: row.user_id,
    user_name: row.user_name || row.name || "Member",
    username: row.username || "",
    user_email: row.user_email || row.email || "",
    subject: row.subject,
    category: row.category,
    message: row.message,
    status: row.status,
    priority: row.priority,
    created_at: row.created_at,
    updated_at: row.updated_at,
    messages: messages.map(serializeMessage)
  };
}

function demoTicketWithContext(ticket) {
  const owner = users.get(String(ticket.user_id)) || {};
  const messages = supportMessages
    .filter(message => String(message.ticket_id) === String(ticket.id))
    .map(message => {
      const sender = users.get(String(message.sender_id)) || {};
      return {
        ...message,
        sender_name: sender.name || sender.email || (message.internal ? "EarnWave Admin" : "Member"),
        sender_email: sender.email || "",
        sender_role: sender.role || "user"
      };
    });

  return serializeTicket({
    ...ticket,
    user_name: owner.name,
    username: owner.username,
    user_email: owner.email
  }, messages);
}

async function createTicket({ userId, subject, category, message, priority }) {
  let ticket;
  if (!env.DATABASE_URL) {
    const row = {
      id: String(supportTickets.length + 1),
      user_id: userId,
      subject,
      category,
      message,
      status: "open",
      priority: priority || (category === "payout" ? "high" : "normal"),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    supportTickets.unshift(row);
    supportMessages.push({ id: String(supportMessages.length + 1), ticket_id: row.id, sender_id: userId, message, internal: false, created_at: row.created_at });
    ticket = demoTicketWithContext(row);
  } else {
    const result = await query(
      "INSERT INTO support_tickets (user_id, subject, category, message, priority) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [userId, subject, category, message, priority || (category === "payout" ? "high" : "normal")]
    );
    await query("INSERT INTO support_messages (ticket_id, sender_id, message) VALUES ($1, $2, $3)", [result.rows[0].id, userId, message]);
    const tickets = await listTickets(userId, false);
    ticket = tickets.find(item => String(item.id) === String(result.rows[0].id)) || serializeTicket(result.rows[0]);
  }

  await queueEmail({
    userId,
    to: env.SUPPORT_EMAIL,
    subject: `[EarnWave Support] ${ticket.category}: ${ticket.subject}`,
    body: [
      "A new EarnWave support ticket was created.",
      "",
      `Ticket ID: ${ticket.id}`,
      `User ID: ${ticket.user_id}`,
      `User: ${ticket.user_name || "Member"} ${ticket.user_email ? `<${ticket.user_email}>` : ""}`,
      `Category: ${ticket.category}`,
      `Priority: ${ticket.priority}`,
      `Subject: ${ticket.subject}`,
      "",
      "Message:",
      ticket.message
    ].join("\n")
  });

  return ticket;
}

async function listTickets(userId, isAdmin = false) {
  if (!env.DATABASE_URL) {
    return supportTickets.filter(ticket => isAdmin || String(ticket.user_id) === String(userId)).map(demoTicketWithContext);
  }

  const result = isAdmin
    ? await query(`
        SELECT st.*, u.name AS user_name, u.username, u.email AS user_email
        FROM support_tickets st
        LEFT JOIN users u ON u.id = st.user_id
        ORDER BY st.updated_at DESC
        LIMIT 100
      `)
    : await query(`
        SELECT st.*, u.name AS user_name, u.username, u.email AS user_email
        FROM support_tickets st
        LEFT JOIN users u ON u.id = st.user_id
        WHERE st.user_id = $1
        ORDER BY st.updated_at DESC
        LIMIT 100
      `, [userId]);

  const tickets = [];
  for (const row of result.rows) {
    const messages = await query(`
      SELECT sm.*, sender.name AS sender_name, sender.email AS sender_email, sender.role AS sender_role
      FROM support_messages sm
      LEFT JOIN users sender ON sender.id = sm.sender_id
      WHERE sm.ticket_id = $1
      ORDER BY sm.created_at ASC
    `, [row.id]);
    tickets.push(serializeTicket(row, messages.rows));
  }
  return tickets;
}

async function replyToTicket({ ticketId, senderId, message, status = "pending", internal = false, notifyUser = true }) {
  if (!env.DATABASE_URL) {
    const ticket = supportTickets.find(item => String(item.id) === String(ticketId));
    if (!ticket) throw new Error("Ticket not found");
    ticket.status = status || ticket.status;
    ticket.updated_at = new Date().toISOString();
    supportMessages.push({
      id: String(supportMessages.length + 1),
      ticket_id: ticket.id,
      sender_id: senderId,
      message,
      internal: Boolean(internal),
      created_at: ticket.updated_at
    });
    const owner = users.get(String(ticket.user_id));
    if (notifyUser && !internal && owner?.email) {
      await queueEmail({
        userId: ticket.user_id,
        to: owner.email,
        subject: `[EarnWave Support] Reply: ${ticket.subject}`,
        body: ["EarnWave support replied to your ticket.", "", message, "", `Ticket ID: ${ticket.id}`].join("\n")
      });
    }
    return demoTicketWithContext(ticket);
  }

  const existing = await query(`
    SELECT st.*, u.email AS user_email
    FROM support_tickets st
    LEFT JOIN users u ON u.id = st.user_id
    WHERE st.id = $1
  `, [ticketId]);
  if (!existing.rows[0]) throw new Error("Ticket not found");

  await query(
    "INSERT INTO support_messages (ticket_id, sender_id, message, internal) VALUES ($1, $2, $3, $4)",
    [ticketId, senderId, message, Boolean(internal)]
  );
  const result = await query(
    "UPDATE support_tickets SET status = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [status, ticketId]
  );
  if (!result.rows[0]) throw new Error("Ticket not found");

  if (notifyUser && !internal && existing.rows[0].user_email) {
    await queueEmail({
      userId: existing.rows[0].user_id,
      to: existing.rows[0].user_email,
      subject: `[EarnWave Support] Reply: ${existing.rows[0].subject}`,
      body: ["EarnWave support replied to your ticket.", "", message, "", `Ticket ID: ${ticketId}`].join("\n")
    });
  }

  const tickets = await listTickets(existing.rows[0].user_id, true);
  return tickets.find(ticket => String(ticket.id) === String(ticketId)) || serializeTicket(result.rows[0]);
}

module.exports = { createTicket, listTickets, replyToTicket };