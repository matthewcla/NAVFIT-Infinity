import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { StrategicPulseDashboard } from './components/dashboard/StrategicPulseDashboard';
import { StrategyScattergram } from './components/dashboard/StrategyScattergram';
import { ReportsManager } from './components/reports/ReportsManager';
import { SelectionBoardsManager } from './components/boards/SelectionBoardsManager';
import type { Tab } from './components/layout/Sidebar';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Navigation State: Request to open a specific report/member
  const [pendingReportRequest, setPendingReportRequest] = useState<{ memberId: string; name: string; rank?: string } | null>(null);

  const handleOpenReport = (memberId: string, name: string, rank?: string) => {
    setPendingReportRequest({ memberId, name, rank });
    setActiveTab('reports');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <StrategicPulseDashboard onOpenReport={handleOpenReport} />;
      case 'reports':
        return (
          <ReportsManager
            pendingRequest={pendingReportRequest}
            onClearRequest={() => setPendingReportRequest(null)}
          />
        );
      case 'groups':
        return (
          <div className="p-8 h-full overflow-hidden flex flex-col min-w-0">
            <StrategyScattergram onOpenReport={handleOpenReport} />
          </div>
        );
      case 'profiles':
        return <div className="p-8 text-slate-500">Sailor Profiles - Coming Soon</div>;
      case 'schedule':
        return <SelectionBoardsManager />;
      case 'admin':
        return <div className="p-8 text-slate-500">Command Admin - Coming Soon</div>;
      default:
        return <StrategicPulseDashboard onOpenReport={handleOpenReport} />;
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
