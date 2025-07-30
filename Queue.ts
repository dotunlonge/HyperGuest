import { Message } from "./Database";

interface InProgressItem {
    message: Message;
    workerId: number;
    timestamp: number;
}

export class Queue {
    private messages: Message[] = [];
    private inProgress = new Map<string, InProgressItem>();
    private processedMessages = new Set<string>();
    private keyLocks = new Map<string, number>(); // Track which worker is processing each key

    constructor() {}

    Enqueue = (message: Message) => {
        this.messages.push(message);
    }

    Dequeue = (workerId: number): Message | undefined => {
        // Find the first message where:
        // 1. Message hasn't been processed
        // 2. Message isn't currently in progress  
        // 3. The message's key isn't locked by another worker
        for (let i = 0; i < this.messages.length; i++) {
            const message = this.messages[i];
            
            // Skip already processed messages
            if (this.processedMessages.has(message.id)) {
                continue;
            }
            
            // Skip messages currently being processed
            if (this.inProgress.has(message.id)) {
                continue;
            }
            
            // CRITICAL: Skip if another worker is processing this key
            const keyLockOwner = this.keyLocks.get(message.key);
            if (keyLockOwner !== undefined && keyLockOwner !== workerId) {
                continue;
            }
            
            // Found a processable message - remove it from queue
            this.messages.splice(i, 1);
            
            // Lock this key to this worker
            this.keyLocks.set(message.key, workerId);
            
            // Track as in progress
            this.inProgress.set(message.id, {
                message,
                workerId,
                timestamp: Date.now()
            });
            
            return message;
        }
        
        return undefined;
    }

    Confirm = (workerId: number, messageId: string) => {
        const inProgressItem = this.inProgress.get(messageId);
        
        if (inProgressItem && inProgressItem.workerId === workerId) {
            const message = inProgressItem.message;
            
            // Remove from in-progress tracking
            this.inProgress.delete(messageId);
            
            // Mark as processed
            this.processedMessages.add(messageId);
            
            // CRITICAL: Release the key lock
            if (this.keyLocks.get(message.key) === workerId) {
                this.keyLocks.delete(message.key);
            }
        }
    }

    Size = () => {
        // Count unprocessed messages not currently being worked on
        const availableMessages = this.messages.filter(msg => 
            !this.processedMessages.has(msg.id) && 
            !this.inProgress.has(msg.id)
        ).length;
        
        return availableMessages + this.inProgress.size;
    }
}