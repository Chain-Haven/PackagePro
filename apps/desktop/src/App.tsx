import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { PackingScreen } from './screens/PackingScreen';

const queryClient = new QueryClient();

export type Screen = 'login' | 'dashboard' | 'packing';

export function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [stationId, setStationId] = useState<string>('');

  useEffect(() => {
    window.electronAPI?.getConfig('station_id').then((id) => {
      if (typeof id === 'string') setStationId(id);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen bg-background text-foreground font-sans antialiased flex flex-col">
        {screen === 'login' && (
          <LoginScreen
            onLogin={(sid) => {
              if (sid) setStationId(sid);
              setScreen('dashboard');
            }}
          />
        )}
        {screen === 'dashboard' && (
          <DashboardScreen
            stationId={stationId}
            onStartPacking={(orderId) => {
              setActiveOrderId(orderId);
              setScreen('packing');
            }}
          />
        )}
        {screen === 'packing' && activeOrderId && (
          <PackingScreen
            orderId={activeOrderId}
            stationId={stationId}
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
