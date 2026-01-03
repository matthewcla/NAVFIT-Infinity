import { create } from 'zustand';
import type { Constraints, Member } from '@/domain/rsca/types';

export type SessionAuditEventType =
  | 'RANK_ORDER_CHANGE'
  | 'ANCHOR_SELECTION_CHANGE'
  | 'ANCHOR_MTA_EDIT'
  | 'REDISTRIBUTION_RUN'
  | 'INFEASIBILITY_DETECTED';

export interface SessionAuditEvent {
  id: string;
  timestamp: string;
  type: SessionAuditEventType;
  details: Record<string, unknown>;
}

export interface SessionExportData {
  exportTimestamp: string;
  finalState: {
    members: Member[];
    constraints: Constraints;
    targetRSCA: number;
  };
  sessionLog: SessionAuditEvent[];
}

interface AuditStore {
  logs: SessionAuditEvent[];
  addLog: (type: SessionAuditEventType, details: Record<string, unknown>) => void;
  clearLogs: () => void;
}

// Helper for ID generation
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const useAuditStore = create<AuditStore>((set) => ({
  logs: [],
  addLog: (type, details) => {
    const entry: SessionAuditEvent = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      type,
      details,
    };
    set((state) => ({ logs: [...state.logs, entry] }));
  },
  clearLogs: () => set({ logs: [] }),
}));
