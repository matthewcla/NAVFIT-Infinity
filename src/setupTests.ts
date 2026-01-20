import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import { WorkerMock } from './test/mocks/workerMock';

// Replace global Worker
(globalThis as any).Worker = WorkerMock;
if (typeof window !== 'undefined') {
    (window as any).Worker = WorkerMock;
}

beforeEach(() => {
    WorkerMock.reset();
});

afterEach(() => {
    vi.clearAllMocks();
});

// Polyfill for ResizeObserver if needed (mentioned in memory)
class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserver;
