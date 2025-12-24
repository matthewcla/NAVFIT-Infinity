import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { StrategicPulseDashboard } from './components/dashboard/StrategicPulseDashboard';
import { StrategyScattergram } from './components/dashboard/StrategyScattergram';
import type { Tab } from './components/layout/Sidebar';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <StrategicPulseDashboard />;
      case 'reports':
        return <div className="p-8 text-slate-500">Reports Manager - Coming Soon</div>;
      case 'groups':
        return (
          <div className="p-8 h-full overflow-hidden flex flex-col min-w-0">
            <StrategyScattergram />
          </div>
        );
      case 'profiles':
        return <div className="p-8 text-slate-500">Sailor Profiles - Coming Soon</div>;
      case 'schedule':
        return <div className="p-8 text-slate-500">Selection Boards - Coming Soon</div>;
      case 'admin':
        return <div className="p-8 text-slate-500">Command Admin - Coming Soon</div>;
      default:
        return <StrategicPulseDashboard />;
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
