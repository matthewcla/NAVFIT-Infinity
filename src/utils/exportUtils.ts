import { useAuditStore } from '@/store/useAuditStore';
import { useNavfitStore } from '@/store/useNavfitStore';
import { DEFAULT_CONSTRAINTS } from '@/domain/rsca/constants';

export const exportSessionData = () => {
    const navfitStore = useNavfitStore.getState();
    const auditStore = useAuditStore.getState();

    // Gather Members (Flatten all summary groups or just the active one?
    // Requirement says "Final x_i vector", "anchors, constraints".
    // Usually this is done per context, but "Session Log" implies the whole session.
    // However, the model has multiple summary groups.
    // I will export all summary groups to be safe, or we could filter.
    // Given the requirement "Reproduce results", usually implies the current working context.
    // But since "rank order changes" are logged for session, I will dump the current full state.

    // If we want to be specific, we can find the "Active" group.
    // Let's dump all data to be safe.

    const summaryGroups = navfitStore.summaryGroups;
    const currentMembers = summaryGroups.flatMap(g => g.reports.map(r => ({
        groupId: g.id,
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        rank: g.reports.indexOf(r) + 1, // Assumes sorted
        mta: r.traitAverage,
        isAnchor: r.isLocked,
        anchorValue: r.isLocked ? r.traitAverage : undefined
    })));

    const exportData = {
        exportTimestamp: new Date().toISOString(),
        finalState: {
            summaryGroups: navfitStore.summaryGroups, // Raw data
            members: currentMembers, // Normalized
            constraints: DEFAULT_CONSTRAINTS, // Currently constant
            targetRSCA: navfitStore.rsConfig.targetRsca
        },
        sessionLog: auditStore.logs
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `rsca_audit_${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
