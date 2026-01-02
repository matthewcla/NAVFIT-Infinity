import { processWorkerMessage } from './workerLogic';
import { WorkerInput } from './types';

self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const output = processWorkerMessage(e.data);
    self.postMessage(output);
};
