const { query } = require("../db/postgres");
const { env } = require("../config/env");
const { supportTickets, supportMessages } = require("../db/demoStore");

function serializeTicket(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    subject: row.subject,
    category: row.category,
    message: row.message,
    status: row.status,
    priority: row.priority,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function createTicket({ userId, subject, category, message }) {
  if (!env.DATABASE_URL) {
    const row = {
      id: String(supportTickets.length + 1),
      user_id: userId,
      subject,
      category,
      message,
      status: "open",
      priority: category === "payout" ? "high" : "normal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    supportTickets.unshift(row);
    supportMessages.push({ ticket_id: row.id, sender_id: userId, message, internal: false, created_at: row.created_at });
    return row;
  }

  const result = await query(
    "INSERT INTO support_tickets (user_id, subject, category, message, priority) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [userId, subject, category, message, category === "payout" ? "high" : "normal"]
  );
  await query("INSERT INTO support_messages (ticket_id, sender_id, message) VALUES ($1, $2, $3)", [result.rows[0].id, userId, message]);
  return serializeTicket(result.rows[0]);
}

async function listTickets(userId, isAdmin = false) {
  if (!env.DATABASE_URL) {
    return supportTickets.filter(ticket => isAdmin || String(ticket.user_id) === String(userId)).map(serializeTicket);
  }

  const result = isAdmin
    ? await query("SELECT * FROM support_tickets ORDER BY updated_at DESC LIMIT 100")
    : await query("SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100", [userId]);
  return result.rows.map(serializeTicket);
}

async function replyToTicket({ ticketId, senderId, message, status = "pending", internal = false }) {
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
    return serializeTicket(ticket);
  }

  await query(
    "INSERT INTO support_messages (ticket_id, sender_id, message, internal) VALUES ($1, $2, $3, $4)",
    [ticketId, senderId, message, Boolean(internal)]
  );
  const result = await query(
    "UPDATE support_tickets SET status = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [status, ticketId]
  );
  if (!result.rows[0]) throw new Error("Ticket not found");
  return serializeTicket(result.rows[0]);
}

module.exports = { createTicket, listTickets, replyToTicket };
