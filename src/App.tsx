import { AppLayout } from './components/layout/AppLayout';
import { StrategyWorkspace } from '@/features/strategy/components/StrategyWorkspace';
import { ReportsManager } from '@/features/strategy/components/ReportsManager';
import { SelectionBoardsManager } from '@/features/boards/components/SelectionBoardsManager';
import { CommandAdmin } from '@/features/admin/components/CommandAdmin';
import { SailorProfiles } from '@/features/roster/components/SailorProfiles';
import { useNavfitStore } from '@/store/useNavfitStore';

function App() {
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar
  } = useNavfitStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <StrategyWorkspace />;
      case 'reports':
        return <ReportsManager />;
      case 'profiles':
        return <SailorProfiles />;
      case 'schedule':
        return <SelectionBoardsManager />;
      case 'admin':
        return <CommandAdmin />;
      default:
        return <StrategyWorkspace />;
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
