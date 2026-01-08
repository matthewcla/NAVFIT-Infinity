import { useAuditStore } from '@/store/useAuditStore';
import { useNavfitStore } from '@/store/useNavfitStore';
import { DEFAULT_CONSTRAINTS } from '@/domain/rsca/constants';

export const exportSessionData = () => {
    const navfitStore = useNavfitStore.getState();
    const auditStore = useAuditStore.getState();

    // Full State Export for Restore
    const exportData = {
        exportTimestamp: new Date().toISOString(),
        version: '1.0',
        roster: navfitStore.roster,
        summaryGroups: navfitStore.summaryGroups,
        rsConfig: navfitStore.rsConfig,

        // Audit Data (kept for context, though redundant if state is perfect)
        audit: {
            sessionLog: auditStore.logs,
            constraints: DEFAULT_CONSTRAINTS
        }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `rsca_data_${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
