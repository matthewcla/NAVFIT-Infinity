/* eslint-disable @typescript-eslint/no-explicit-any */

export class WorkerMock {
    static instances: WorkerMock[] = [];

    // Helper to access the most recently created worker
    static get latest(): WorkerMock | undefined {
        return this.instances[this.instances.length - 1];
    }

    static reset() {
        this.instances = [];
    }

    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: ErrorEvent) => void) | null = null;

    // Store messages sent TO the worker
    sentMessages: any[] = [];

    constructor(_stringUrl?: string | URL, _options?: WorkerOptions) {
        WorkerMock.instances.push(this);
    }

    postMessage(message: any, _transfer?: Transferable[]) {
        this.sentMessages.push(message);
    }

    terminate() {
        // no-op
    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        if (type === 'message' && typeof listener === 'function') {
            this.onmessage = listener as (e: MessageEvent) => void;
        }
    }

    removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject) {
        // no-op
    }

    dispatchEvent(_event: Event): boolean {
        return true;
    }

    // --- Test Helpers ---

    /**
     * Simulate the worker sending a message back to the main thread.
     */
    triggerMessage(data: any) {
        if (this.onmessage) {
            this.onmessage({ data } as MessageEvent);
        }
    }

    /**
     * Get the last message sent to this worker.
     */
    getLastMessage() {
        return this.sentMessages[this.sentMessages.length - 1];
    }
}
