import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { ManningWaterfall } from './components/dashboard/ManningWaterfall';
import type { Tab } from './components/layout/Sidebar';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ManningWaterfall />;
      case 'reports':
        return <div className="p-8 text-slate-500">Reports Manager - Coming Soon</div>;
      case 'groups':
        return <div className="p-8 text-slate-500">Summary Groups - Coming Soon</div>;
      case 'schedule':
        return <div className="p-8 text-slate-500">Board Schedule - Coming Soon</div>;
      default:
        return <ManningWaterfall />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AppLayout>
  );
}

export default App;
