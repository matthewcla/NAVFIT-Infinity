export class WorkerMock implements Worker {
    onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
    onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null;
    onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;

    private listeners: Record<string, EventListenerOrEventListenerObject[]> = {};

    // Static registry to access instances from tests
    static instances: WorkerMock[] = [];
    static get latest(): WorkerMock {
        if (this.instances.length === 0) {
            throw new Error("No WorkerMock instances created");
        }
        return this.instances[this.instances.length - 1];
    }

    constructor() {
        WorkerMock.instances.push(this);
    }

    postMessage(message: any): void {
        // Optional: Store sent messages for assertions
        // console.log('[WorkerMock] Received:', message);
    }

    terminate(): void {
        // cleanup
    }

    // Standard EventTarget implementation
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(listener);
    }

    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        if (!this.listeners[type]) return;
        const index = this.listeners[type].indexOf(listener);
        if (index !== -1) {
            this.listeners[type].splice(index, 1);
        }
    }

    dispatchEvent(event: Event): boolean {
        const type = event.type;
        const chain = this.listeners[type] || [];

        // 1. Call onmessage/onerror property if exists
        if (type === 'message' && this.onmessage) {
            this.onmessage.call(this, event as MessageEvent);
        } else if (type === 'error' && this.onerror) {
            this.onerror.call(this, event as ErrorEvent);
        }

        // 2. Call listeners
        for (const listener of chain) {
            if (typeof listener === 'function') {
                listener.call(this, event);
            } else {
                listener.handleEvent(event);
            }
        }
        return true;
    }

    // --- Test Helper Methods ---

    /**
     * Manually trigger the onmessage handler to simulate a worker response
     */
    processMessage(data: any) {
        const event = new MessageEvent('message', { data });
        this.dispatchEvent(event);
    }
}
