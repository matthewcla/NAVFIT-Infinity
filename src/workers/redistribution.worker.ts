import { redistributeMTA, RedistributionEngineResult } from '../domain/rsca/redistribution';
import { Member, Constraints } from '../domain/rsca/types';

self.onmessage = (e: MessageEvent) => {
    const { members, constraints, targetRSCA } = e.data;
    try {
        const result: RedistributionEngineResult = redistributeMTA(members, constraints, targetRSCA);
        self.postMessage({ result });
    } catch (error) {
        self.postMessage({ error: (error as Error).message });
    }
};
