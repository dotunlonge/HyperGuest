## Implementation Explanation

### The Problem
The original queue had no proper message tracking AND allowed database race conditions. When workers called `Confirm()`, nothing happened, causing messages to be processed multiple times. Additionally, multiple workers could simultaneously process different messages targeting the same database key, creating lost update problems.

### My Solution
I implemented **key-level concurrency control** with three-stage message tracking:

1. **Pending**: Messages wait in the main `messages` array
2. **Key Locking**: Only one worker can process messages for a specific database key at a time
3. **In-Progress**: Messages move to an `inProgress` Map when dequeued, with key locks preventing conflicts

### How It Works

**Dequeue**: 
- Scan queue for processable messages (not processed, not in-progress, key not locked)
- Remove message from queue → lock the database key to this worker
- Add to `inProgress` Map with worker ID

**Confirm**: 
- Remove message from `inProgress` Map 
- Mark message as permanently processed
- Release the key lock for other workers

**Size**: Count both pending + in-progress messages

### Why This Fixes Both Issues

**Message Duplication Prevention**:
- Once dequeued, message is instantly "claimed" by that worker
- Other workers can't access claimed messages
- Only the claiming worker can confirm completion

**Database Race Condition Prevention**:
- Key locks ensure only one worker processes a specific database key at a time
- Workers can still process different keys in parallel (maintaining performance)
- Sequential processing per key eliminates lost updates

### Result
- Each message gets processed exactly once
- Database operations on the same key happen sequentially
- Parallel processing continues across different keys
- Correct totals: 50 + (0+1+2...+9) = 95 per item, consistently