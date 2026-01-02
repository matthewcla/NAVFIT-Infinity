import React, { memo } from 'react';
import { GroupHeader } from './GroupHeader';
import { TimelineRow } from './TimelineRow';
import { useGroupMetrics } from '../hooks/useGroupMetrics';
import type { Member } from '@/types';
import { CO_DETACH_DATE } from '@/lib/constants';

interface WaterfallGroupProps {
    groupTitle: string;
    members: Member[];
    isExpanded: boolean;
    onToggle: () => void;
    startDate: Date;
    timelineMonths: any[];
    projections?: Record<string, number>;
    onOpenReport?: (memberId: string, name: string, rank?: string, reportId?: string) => void;
    onReportUpdate?: (reportId: string, newAverage: number) => void;
    dragHandlers: {
        onDragStart: (e: React.DragEvent, memberId: string, groupKey: string) => void;
        onDragOver: (e: React.DragEvent) => void;
        onDrop: (e: React.DragEvent, targetMemberId: string, targetGroupKey: string) => void;
    };
}

export const WaterfallGroup = memo(function WaterfallGroup({
    groupTitle,
    members,
    isExpanded,
    onToggle,
    startDate,
    timelineMonths,
    projections,
    onOpenReport,
    onReportUpdate,
    dragHandlers
}: WaterfallGroupProps) {

    // Use the extracted hook for expensive calculations
    const { trendPoints, currentRSCA, status, valueGap, sequencing, description } = useGroupMetrics({
        groupList: members,
        projections,
        startDate
    });

    return (
        <div>
            <GroupHeader
                title={groupTitle}
                count={members.length}
                isExpanded={isExpanded}
                onToggle={onToggle}
                trendPoints={trendPoints}
                targetRange={{ min: 3.8, max: 4.2 }}
                timelineMonths={timelineMonths}
                status={status}
                valueGap={valueGap}
                sequencing={sequencing}
                description={description}
            />
            {isExpanded && members.map((member, idx) => {
                const hasReport = true; // Simplified as per original

                return (
                    <TimelineRow
                        key={member.id}
                        member={member}
                        coDetachDate={CO_DETACH_DATE}
                        avgRSCA={currentRSCA}
                        timelineMonths={timelineMonths}
                        onOpenReport={(reportId) => {
                            if (onOpenReport) onOpenReport(member.id, member.name, member.rank, reportId);
                        }}
                        rankIndex={idx + 1}
                        onDragStart={(e) => dragHandlers.onDragStart(e, member.id, groupTitle)}
                        onDragOver={dragHandlers.onDragOver}
                        onDrop={(e) => dragHandlers.onDrop(e, member.id, groupTitle)}
                        isDraggable={hasReport}
                        onReportUpdate={onReportUpdate}
                        projections={projections}
                        periodicReportId={(member as any).periodicReportId}
                        transferReportId={(member as any).transferReportId}
                    />
                );
            })}
        </div>
    );
});
