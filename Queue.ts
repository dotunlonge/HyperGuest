import { Message } from "./Database";

export class Queue {
    private messages: Message[]
    private inProgress: Map<string, { message: Message, workerId: number }>

    constructor() {
        this.messages = []
        this.inProgress = new Map()
    }

    Enqueue = (message: Message) => {
        this.messages.push(message)
    }

    Dequeue = (workerId: number): Message | undefined => {
        // Get the next available message
        const message = this.messages.shift()
        
        if (message) {
            // Mark this message as in progress for this worker
            this.inProgress.set(message.id, { message, workerId })
            return message
        }
        
        return undefined
    }

    Confirm = (workerId: number, messageId: string) => {
        // Remove the message from in-progress tracking
        const inProgressItem = this.inProgress.get(messageId)
        
        if (inProgressItem && inProgressItem.workerId === workerId) {
            this.inProgress.delete(messageId)
        }
    }

    Size = () => {
        // Total size includes both queued messages and messages in progress
        return this.messages.length + this.inProgress.size
    }
}