import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { StrategyWorkspace } from '@/features/strategy/components/StrategyWorkspace';
import { CommandStrategyCenter } from '@/features/strategy/components/CommandStrategyCenter';

import { SelectionBoardsManager } from '@/features/boards/components/SelectionBoardsManager';
import { CommandAdmin } from '@/features/admin/components/CommandAdmin';
import { SailorProfiles } from '@/features/roster/components/SailorProfiles';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useRedistributionStore } from '@/store/useRedistributionStore';
import { DevTools } from '@/features/dev/DevTools';

function App() {
  // Initialize Redistribution Worker
  useEffect(() => {
    useRedistributionStore.getState().initWorker();
  }, []);

  // const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);  <-- Removed local state
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar,
    selectedCycleId,
    strategyViewMode,
    setStrategyViewMode
  } = useNavfitStore();

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

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      collapsed={sidebarCollapsed}
      onToggleCollapse={toggleSidebar}
    >
      {renderContent()}
      <DevTools />
    </AppLayout>
  );
}

export default App;
