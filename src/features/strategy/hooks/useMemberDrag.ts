import { useState, useEffect, useCallback } from 'react';
import type { Member } from '@/types';

export function useMemberDrag<T extends Member>(initialGroups: Record<string, T[]>) {
    const [groupOrder, setGroupOrder] = useState<Record<string, string[]>>({});

    // Sync groupOrder with incoming groups (maintenance of state)
    useEffect(() => {
        const t = setTimeout(() => {
            setGroupOrder(prev => {
                const newOrder = { ...prev };
                let hasChanges = false;

                Object.entries(initialGroups).forEach(([key, list]) => {
                    if (!newOrder[key]) {
                        // Initial sort alphabetical
                        newOrder[key] = list
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(m => m.id);
                        hasChanges = true;
                    } else {
                        // Check for new members not in order list
                        const existingIds = new Set(newOrder[key]);
                        const newMembers = list.filter(m => !existingIds.has(m.id));
                        if (newMembers.length > 0) {
                            newOrder[key] = [...newOrder[key], ...newMembers.map(m => m.id)];
                            hasChanges = true;
                        }
                    }
                });

                return hasChanges ? newOrder : prev;
            });
        }, 0);
        return () => clearTimeout(t);
    }, [initialGroups]);

    const handleDragStart = useCallback((e: React.DragEvent, memberId: string, groupKey: string) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ memberId, groupKey }));
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetMemberId: string, targetGroupKey: string) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;

        try {
            const { memberId: draggedId, groupKey: sourceGroupKey } = JSON.parse(data);

            if (sourceGroupKey !== targetGroupKey) return; // Constraint: Only same group
            if (draggedId === targetMemberId) return;

            setGroupOrder(prev => {
                const currentOrder = prev[targetGroupKey] ? [...prev[targetGroupKey]] : [];
                const fromIndex = currentOrder.indexOf(draggedId);
                const toIndex = currentOrder.indexOf(targetMemberId);

                if (fromIndex === -1 || toIndex === -1) return prev;

                // Move item
                currentOrder.splice(fromIndex, 1);
                currentOrder.splice(toIndex, 0, draggedId);

                return {
                    ...prev,
                    [targetGroupKey]: currentOrder
                };
            });

        } catch (err) {
            console.error("Drop failed", err);
        }
    }, []);

    const getSortedGroupList = useCallback((key: string, list: T[]) => {
        const order = groupOrder[key];
        if (!order) return list.sort((a, b) => a.name.localeCompare(b.name));

        // Create map for fast lookup
        const map = new Map(list.map(m => [m.id, m]));

        // Return ordered list, filter out any missing ids (safety)
        const sorted = order.map(id => map.get(id)).filter(Boolean) as T[];

        // Append any potentially missing members (safety)
        const returnedIds = new Set(sorted.map(m => m.id));
        const missing = list.filter(m => !returnedIds.has(m.id));

        return [...sorted, ...missing];
    }, [groupOrder]);

    return {
        handleDragStart,
        handleDragOver,
        handleDrop,
        getSortedGroupList
    };
}
