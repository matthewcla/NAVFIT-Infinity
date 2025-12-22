import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { StrategicPulseDashboard } from './components/dashboard/StrategicPulseDashboard';
import { StrategyScattergram } from './components/dashboard/StrategyScattergram';
import type { Tab } from './components/layout/Sidebar';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <StrategicPulseDashboard />;
      case 'reports':
        return <div className="p-8 text-slate-500">Reports Manager - Coming Soon</div>;
      case 'groups':
        return (
          <div className="p-8 h-full overflow-y-auto">
            <StrategyScattergram />
          </div>
        );
      case 'schedule':
        return <div className="p-8 text-slate-500">Board Schedule - Coming Soon</div>;
      default:
        return <StrategicPulseDashboard />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AppLayout>
  );
}

export default App;
