import { useState, useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { StrategyWorkspace } from '@/features/strategy/components/StrategyWorkspace';
import { CommandStrategyCenter } from '@/features/strategy/components/CommandStrategyCenter';

import { SelectionBoardsManager } from '@/features/boards/components/SelectionBoardsManager';
import { CommandAdmin } from '@/features/admin/components/CommandAdmin';
import { SailorProfiles } from '@/features/roster/components/SailorProfiles';
import { useNavfitStore } from '@/store/useNavfitStore';

function App() {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar,
    selectedCycleId
  } = useNavfitStore();

  // Reset workspace view if tab changes
  useEffect(() => {
    setIsWorkspaceOpen(false);
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'strategy':
        if (isWorkspaceOpen && selectedCycleId) {
          return (
            <StrategyWorkspace
              onBack={() => setIsWorkspaceOpen(false)}
            />
          );
        }
        return (
          <CommandStrategyCenter
            onNavigateToRanking={() => setIsWorkspaceOpen(true)}
          />
        );
      case 'profiles':
        return <SailorProfiles />;
      case 'schedule':
        return <SelectionBoardsManager />;
      case 'admin':
        return <CommandAdmin />;
      default:
        return (
          <CommandStrategyCenter
            onNavigateToRanking={() => setIsWorkspaceOpen(true)}
          />
        );
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
    </AppLayout>
  );
}

export default App;
