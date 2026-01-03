import { processWorkerMessage } from './workerLogic';
import type { WorkerInput } from './types';

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const output = processWorkerMessage(e.data);
    self.postMessage(output);
};
