import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { StrategyWorkspace } from '@/features/strategy/components/StrategyWorkspace';
import { CommandStrategyCenter } from '@/features/strategy/components/CommandStrategyCenter';
import { AppScaler } from '@/components/layout/AppScaler';

import { SelectionBoardsManager } from '@/features/boards/components/SelectionBoardsManager';
import { CommandAdmin } from '@/features/admin/components/CommandAdmin';
import { SailorProfiles } from '@/features/roster/components/SailorProfiles';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useRedistributionStore } from '@/store/useRedistributionStore';
import { DevTools } from '@/features/dev/DevTools';

function App() {
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar,
    selectedCycleId,
    strategyViewMode,
    setStrategyViewMode,
    loadData,
    isLoading
  } = useNavfitStore();

  // Initialize Data
  useEffect(() => {
    useRedistributionStore.getState().initWorker();
    loadData();
  }, [loadData]);

  // Reset workspace view if tab changes
  useEffect(() => {
    // Optional: Reset to landing when leaving strategy tab?
    // For now, we can keep the user's place or reset.
    // Let's reset to be safe if they leave the tab context.
    if (activeTab !== 'strategy') {
      setStrategyViewMode('landing');
    }
  }, [activeTab, setStrategyViewMode]);

  const renderContent = () => {
    switch (activeTab) {
      case 'strategy':
        if (strategyViewMode === 'workspace' && selectedCycleId) {
          return <StrategyWorkspace />;
        }
        return <CommandStrategyCenter />;
      case 'profiles':
        return <SailorProfiles />;
      case 'schedule':
        return <SelectionBoardsManager />;
      case 'admin':
        return <CommandAdmin />;
      default:
        return <CommandStrategyCenter />;
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
  );
}

export default App;
