## Implementation Explanation

### The Problem
The original queue had no proper message tracking. When workers called `Confirm()`, nothing happened, causing messages to be processed multiple times by different workers.

### My Solution
I added **two-stage message tracking**:

1. **Pending**: Messages wait in the main `messages` array
2. **In-Progress**: Messages move to an `inProgress` Map when dequeued

### How It Works

**Dequeue**: Remove message from queue → immediately add to `inProgress` Map with worker ID
**Confirm**: Remove message from `inProgress` Map (marking it complete)
**Size**: Count both pending + in-progress messages

### Why This Fixes It
- Once dequeued, message is instantly "claimed" by that worker
- Other workers can't access claimed messages
- Only the claiming worker can confirm completion
- Parallel processing continues safely on different messages

### Result
Each message gets processed exactly once, giving correct totals: 50 + (0+1+2...+9) = 95 per item.