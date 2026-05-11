export type DashboardIssueCode =
  | 'CONFIG_BACKEND_URL_MISSING'
  | 'CONFIG_STATION_MISSING'
  | 'AUTH_SESSION_MISSING'
  | 'BACKEND_HEALTH_DEGRADED'
  | 'NETWORK_UNAVAILABLE'
  | 'STATION_HEARTBEAT_FAILED'
  | 'ORDERS_LOAD_FAILED';

export interface DashboardHealthIssue {
  code: DashboardIssueCode;
  title: string;
  message: string;
  fixSteps: string[];
  autoFixAvailable: boolean;
}

type DiagnoseDashboardIssueInput = {
  missingBackendUrl?: boolean;
  missingStationConfig?: boolean;
  missingSession?: boolean;
  backendDegraded?: boolean;
  rawErrorMessage?: string;
  failedCheck?: 'heartbeat' | 'orders';
};

const networkMessagePatterns = ['failed to fetch', 'network', 'load failed'];

const authMessagePatterns = ['unauthorized', 'forbidden'];
const stationConfigPatterns = ['resource not found', 'station is not assigned'];

export function diagnoseDashboardIssue(input: DiagnoseDashboardIssueInput): DashboardHealthIssue {
  if (input.missingBackendUrl) {
    return {
      code: 'CONFIG_BACKEND_URL_MISSING',
      title: 'Backend URL is missing',
      message: 'The station does not know which PackagePro backend it should talk to.',
      fixSteps: [
        'Open setup again to verify the backend URL.',
        'If the URL is blank, the app can restore the default backend automatically.',
      ],
      autoFixAvailable: true,
    };
  }

  if (input.missingStationConfig) {
    return {
      code: 'CONFIG_STATION_MISSING',
      title: 'Station setup is incomplete',
      message: 'The app is missing its organization, store, or station registration details.',
      fixSteps: ['Reconnect this machine to an existing station or complete setup again.'],
      autoFixAvailable: false,
    };
  }

  if (input.missingSession) {
    return {
      code: 'AUTH_SESSION_MISSING',
      title: 'Your desktop sign-in session expired',
      message: 'The station cannot authenticate to the backend until you sign in again.',
      fixSteps: ['Sign in again to refresh the desktop session.'],
      autoFixAvailable: false,
    };
  }

  if (input.backendDegraded) {
    return {
      code: 'BACKEND_HEALTH_DEGRADED',
      title: 'The PackagePro backend is degraded',
      message: 'The web service is reachable, but one or more backend health checks are failing.',
      fixSteps: [
        'Open the web dashboard health panel to review server-side checks.',
        'Use the self-heal action if it is offered there.',
      ],
      autoFixAvailable: true,
    };
  }

  const rawError = input.rawErrorMessage?.toLowerCase() ?? '';
  if (networkMessagePatterns.some((pattern) => rawError.includes(pattern))) {
    return {
      code: 'NETWORK_UNAVAILABLE',
      title: 'Network connection failed',
      message: 'The station could not reach PackagePro over the network.',
      fixSteps: [
        'Check internet access or VPN connectivity.',
        'The station will retry automatically after a short delay.',
      ],
      autoFixAvailable: true,
    };
  }

  if (authMessagePatterns.some((pattern) => rawError.includes(pattern))) {
    return {
      code: 'AUTH_SESSION_MISSING',
      title: 'The backend rejected this station session',
      message: input.rawErrorMessage || 'Sign in again to refresh the desktop session.',
      fixSteps: ['Sign in again so the station can refresh its backend token.'],
      autoFixAvailable: false,
    };
  }

  if (stationConfigPatterns.some((pattern) => rawError.includes(pattern))) {
    return {
      code: 'CONFIG_STATION_MISSING',
      title: 'This station is no longer linked correctly',
      message:
        input.rawErrorMessage || 'The backend could not find or accept this station registration.',
      fixSteps: ['Open setup and reconnect this machine to the correct station.'],
      autoFixAvailable: false,
    };
  }

  if (input.failedCheck === 'heartbeat') {
    return {
      code: 'STATION_HEARTBEAT_FAILED',
      title: 'Station heartbeat failed',
      message: input.rawErrorMessage || 'The backend rejected the station heartbeat.',
      fixSteps: [
        'Verify the station is still registered to this store.',
        'Reconnect this machine to the correct station if needed.',
      ],
      autoFixAvailable: true,
    };
  }

  return {
    code: 'ORDERS_LOAD_FAILED',
    title: 'Orders could not be loaded',
    message: input.rawErrorMessage || 'The station could not refresh the order queue.',
    fixSteps: [
      'Retry the queue refresh.',
      'If this persists, open the web dashboard health panel for more diagnostics.',
    ],
    autoFixAvailable: true,
  };
}
