const test = require("node:test");
const assert = require("node:assert/strict");
const { acquireLock, releaseLock } = require("../src/services/mutex");

test("mutex prevents concurrent locks for the same resource", async () => {
  const resource = "payout:test-user-1";
  
  // Acquire the lock first time
  const lock1 = await acquireLock(resource);
  assert.equal(lock1, true, "First lock should be acquired");

  // Attempt to acquire the lock a second time concurrently
  const lock2 = await acquireLock(resource);
  assert.equal(lock2, false, "Second lock attempt should fail while first is held");

  // Release the lock
  await releaseLock(resource);

  // Attempt to acquire the lock after release
  const lock3 = await acquireLock(resource);
  assert.equal(lock3, true, "Third lock should be acquired after release");

  await releaseLock(resource);
});
