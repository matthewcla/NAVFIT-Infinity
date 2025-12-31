import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { StrategyWorkspace } from '@/features/strategy/components/StrategyWorkspace';
import { CommandStrategyCenter } from '@/features/strategy/components/CommandStrategyCenter';

import { SelectionBoardsManager } from '@/features/boards/components/SelectionBoardsManager';
import { CommandAdmin } from '@/features/admin/components/CommandAdmin';
import { SailorProfiles } from '@/features/roster/components/SailorProfiles';
import { useNavfitStore } from '@/store/useNavfitStore';

function App() {
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar
  } = useNavfitStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'strategy':
        if (selectedCycleId) {
          return <StrategyWorkspace onBack={() => {
            setSelectedCycleId(null);
            // Clear the store selection too
            useNavfitStore.getState().setSelectedCompetitiveGroupKey(null);
          }} />;
        }
        return <CommandStrategyCenter onNavigateToRanking={(id) => setSelectedCycleId(id)} />;
      case 'profiles':
        return <SailorProfiles />;
      case 'schedule':
        return <SelectionBoardsManager />;
      case 'admin':
        return <CommandAdmin />;
      default:
        // Default to Strategy Center logic
        if (selectedCycleId) {
          return <StrategyWorkspace onBack={() => {
            setSelectedCycleId(null);
            useNavfitStore.getState().setSelectedCompetitiveGroupKey(null);
          }} />;
        }
        return <CommandStrategyCenter onNavigateToRanking={(id) => setSelectedCycleId(id)} />;
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
