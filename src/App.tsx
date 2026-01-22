import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { AppScaler } from '@/components/layout/AppScaler';

import { SelectionBoardsManager } from '@/features/boards/components/SelectionBoardsManager';
import { CommandAdmin } from '@/features/admin/components/CommandAdmin';
import { SailorProfiles } from '@/features/roster/components/SailorProfiles';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useRedistributionStore } from '@/store/useRedistributionStore';
import { CommandDeck } from '@/features/strategy/components/CommandDeck/CommandDeck';
import { CompetitiveGroupManager } from '@/features/strategy/components/CompetitiveGroupManager';
import { DevTools } from '@/features/dev/DevTools';
import { StartupAnimation } from '@/components/layout/StartupAnimation';
import { useState } from 'react';

function App() {
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar,
    setStrategyViewMode,
    loadData,
    isLoading
  } = useNavfitStore();

  const [showIntro, setShowIntro] = useState(true);

  // Initialize Data
  useEffect(() => {
    useRedistributionStore.getState().initWorker();
    loadData();
  }, [loadData]);

  // Reset workspace view if tab changes
  useEffect(() => {
    // Reset workspace view if navigating away from strategy areas
    if (activeTab !== 'summary_groups' && activeTab !== 'competitive_groups') {
      setStrategyViewMode('landing');
    }
  }, [activeTab, setStrategyViewMode]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CommandDeck />;
      case 'competitive_groups':
        return <CompetitiveGroupManager />;
      case 'summary_groups':
        // Legacy Redirect (Safety Net)
        return <CompetitiveGroupManager />;
      case 'profiles':
        return <SailorProfiles />;
      case 'schedule':
        return <SelectionBoardsManager />;
      case 'admin':
        return <CommandAdmin />;
      default:
        return <CommandDeck />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <div className="text-slate-600 dark:text-slate-400 font-medium">Loading Data...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showIntro && <StartupAnimation onComplete={() => setShowIntro(false)} />}
      <AppScaler>
        <AppLayout
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        >
          {renderContent()}
          <DevTools />
        </AppLayout>
      </AppScaler>
    </>
  );
}

export default App;
