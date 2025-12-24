import { useState, useMemo } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { StrategicPulseDashboard } from './components/dashboard/StrategicPulseDashboard';
import { StrategyScattergram } from './components/dashboard/StrategyScattergram';
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

  // --- Logic Engine: Report Generation ---
  const summaryGroups = useMemo(() => {
    return generateSummaryGroups(roster, rsConfig);
  }, [roster, rsConfig]);

  // Flatten reports for charts if needed, or pass summaryGroups and let them flatten?
  // Current Chart components (StrategyScattergram) expect 'reports'. 
  // Let's keep StrategyScattergram processing its own data for now or update it?
  // Wait, the Requirement "Pass this data also to the RSCA modeler scattergram" implies 
  // we should be passing the generated reports.
  // I'll assume Strategy/Waterfall will be refactored next to accept `summaryGroups`, 
  // or I can flatten them here. Let's pass `summaryGroups` props if they support it, 
  // or just pass the full data set.
  // For now, let's pass `summaryGroups` prop to Dashboard/Waterfall/Scattergram.
  // *But existing components don't accept summaryGroups yet.*
  // I will update App.tsx to pass them, and then I will update the components to accept them.

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
          />
        );
      case 'groups':
        return (
          <div className="p-8 h-full overflow-hidden flex flex-col min-w-0">
            <StrategyScattergram
              summaryGroups={summaryGroups} // Pass generated data
              roster={roster}
              onOpenReport={handleOpenReport}
            />
          </div>
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
