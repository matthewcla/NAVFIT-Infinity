import { useState, useMemo } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { StrategicPulseDashboard } from './components/dashboard/StrategicPulseDashboard';
import { ReportsManager } from './components/reports/ReportsManager';
import { SelectionBoardsManager } from './components/boards/SelectionBoardsManager';
import { CommandAdmin } from './components/admin/CommandAdmin';
import { SailorProfiles } from './components/profiles/SailorProfiles';
import type { Tab } from './components/layout/Sidebar';
import { INITIAL_ROSTER, INITIAL_RS_CONFIG } from './data/initialRoster';
import { generateSummaryGroups } from './lib/engines/reportGenerator';
import type { RosterMember, ReportingSeniorConfig } from './types/roster';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // --- Global State: Roster & Config ---
  const [roster] = useState<RosterMember[]>(INITIAL_ROSTER);
  const [rsConfig, setRsConfig] = useState<ReportingSeniorConfig>(INITIAL_RS_CONFIG);

  // --- Projection/Scenario State ---
  const [projections, setProjections] = useState<Record<string, number>>({});

  const handleUpdateProjection = (reportId: string, newAverage: number) => {
    setProjections(prev => ({
      ...prev,
      [reportId]: newAverage
    }));
  };

  // --- Logic Engine: Report Generation ---
  const summaryGroups = useMemo(() => {
    return generateSummaryGroups(roster, rsConfig, 2025, projections);
  }, [roster, rsConfig, projections]);

  // Navigation State: Request to open a specific report/member
  const [pendingReportRequest, setPendingReportRequest] = useState<{ memberId: string; name: string; rank?: string; reportId?: string } | null>(null);

  const handleOpenReport = (memberId: string, name: string, rank?: string, reportId?: string) => {
    setPendingReportRequest({ memberId, name, rank, reportId });
    setActiveTab('reports');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <StrategicPulseDashboard
            summaryGroups={summaryGroups}
            roster={roster}
            onOpenReport={handleOpenReport}
          />
        );
      case 'reports':
        return (
          <ReportsManager
            summaryGroups={summaryGroups} // Pass generated groups
            pendingRequest={pendingReportRequest}
            onClearRequest={() => setPendingReportRequest(null)}
            onUpdateReport={handleUpdateProjection} // Strategy Mode Callback
          />
        );
      case 'profiles':
        return <SailorProfiles roster={roster} reports={summaryGroups.flatMap(g => g.reports)} />;
      case 'schedule':
        return <SelectionBoardsManager />;
      case 'admin':
        return (
          <CommandAdmin
            roster={roster}
            rsConfig={rsConfig}
            onUpdateRsConfig={setRsConfig}

          />
        );
      default:
        return (
          <StrategicPulseDashboard
            summaryGroups={summaryGroups}
            roster={roster}
            onOpenReport={handleOpenReport}
          />
        );
    }
  };

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      collapsed={sidebarCollapsed}
      onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      {renderContent()}
    </AppLayout>
  );
}

export default App;
