import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getSupabase } from './lib/supabase';
import { LoginScreen } from './screens/LoginScreen';
import { SetupWizardScreen } from './screens/SetupWizardScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { PackingScreen } from './screens/PackingScreen';

const queryClient = new QueryClient();

export type Screen = 'loading' | 'login' | 'setup' | 'dashboard' | 'packing';

interface StationConfig {
  orgId: string;
  storeId: string;
  stationId: string;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [config, setConfig] = useState<StationConfig | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setScreen('login');
      return;
    }

    const savedStationId = await window.electronAPI?.getConfig('station_id');
    const savedOrgId = await window.electronAPI?.getConfig('org_id');
    const savedStoreId = await window.electronAPI?.getConfig('store_id');

    if (savedStationId && savedOrgId && savedStoreId) {
      setConfig({
        orgId: savedOrgId as string,
        storeId: savedStoreId as string,
        stationId: savedStationId as string,
      });
      setScreen('dashboard');
    } else {
      setScreen('setup');
    }
  }

  async function handleLogout() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    await window.electronAPI?.setConfig('station_id', null);
    await window.electronAPI?.setConfig('org_id', null);
    await window.electronAPI?.setConfig('store_id', null);
    setConfig(null);
    setScreen('login');
  }

  function handleSetupComplete(cfg: StationConfig) {
    setConfig(cfg);
    setScreen('dashboard');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen bg-background text-foreground font-sans antialiased flex flex-col">
        {screen === 'loading' && (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-4 text-muted-foreground">Loading PackagePro...</p>
            </div>
          </div>
        )}

        {screen === 'login' && (
          <LoginScreen onLogin={() => void checkSession()} />
        )}

        {screen === 'setup' && (
          <SetupWizardScreen
            onComplete={handleSetupComplete}
            onLogout={handleLogout}
          />
        )}

        {screen === 'dashboard' && config && (
          <DashboardScreen
            stationId={config.stationId}
            onStartPacking={(orderId) => {
              setActiveOrderId(orderId);
              setScreen('packing');
            }}
          />
        )}

        {screen === 'packing' && activeOrderId && config && (
          <PackingScreen
            orderId={activeOrderId}
            stationId={config.stationId}
            onFinish={() => {
              setActiveOrderId(null);
              setScreen('dashboard');
            }}
          />
        )}
      </div>
    </QueryClientProvider>
  );
}
