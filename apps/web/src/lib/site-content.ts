export type DocEntry = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: {
    heading: string;
    body: string[];
  }[];
};

export const docs: DocEntry[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'Create your account, set up your organization, and connect your first warehouse station.',
    intro:
      'Use this guide to get from a blank account to a working PackagePro workspace with a connected WooCommerce store and the first packing station.',
    sections: [
      {
        heading: 'Create the workspace',
        body: [
          'Sign up for a PackagePro account and create your organization slug during onboarding.',
          'Use the onboarding flow to create the first store record before installing the WooCommerce plugin.',
        ],
      },
      {
        heading: 'Connect the store',
        body: [
          'Install the PackagePro WooCommerce plugin on your store and enter the pairing code shown in the dashboard.',
          'Verify that the store status changes from pending to paired after the plugin handshake succeeds.',
        ],
      },
      {
        heading: 'Register the first station',
        body: [
          'Name the station after the physical packing bench so order locks and audit logs stay clear.',
          'Install the desktop app, sign in with the same PackagePro account, and confirm camera and printer settings.',
        ],
      },
    ],
  },
  {
    slug: 'desktop-app',
    title: 'Desktop App Guide',
    description: 'Configure cameras, scanners, printers, and the day-to-day packing workflow.',
    intro:
      'The desktop app is designed for fulfillment operators who need a barcode-first workflow with large controls and obvious status changes.',
    sections: [
      {
        heading: 'Station setup',
        body: [
          'Choose the overhead camera, confirm the crop frame, and keep audio disabled unless a merchant explicitly needs it.',
          'Test the keyboard-wedge barcode scanner and confirm the label printer before going live on the floor.',
        ],
      },
      {
        heading: 'Packing workflow',
        body: [
          'Claim exactly one order at a time, start recording, pack the order, and finish the session before scanning the next order.',
          'If the operator makes a mistake, discard or rerecord the clip instead of trying to reassign it to another order.',
        ],
      },
      {
        heading: 'Recovery',
        body: [
          'Encrypted temp files are kept locally until upload completes.',
          'If the network drops or the app restarts, the upload queue can resume without losing the clip.',
        ],
      },
    ],
  },
  {
    slug: 'woocommerce-plugin',
    title: 'WooCommerce Plugin',
    description: 'Install the plugin, pair it securely, and expose proof-of-packing data inside WooCommerce.',
    intro:
      'The PackagePro plugin is HPOS-compatible and uses WooCommerce CRUD APIs to sync order state and attach video metadata back to the store.',
    sections: [
      {
        heading: 'Installation',
        body: [
          'Upload the plugin ZIP from the WooCommerce admin and activate it on a store that already has WooCommerce enabled.',
          'The plugin performs activation checks to avoid fatal errors when WooCommerce is missing or partially loaded.',
        ],
      },
      {
        heading: 'Pairing',
        body: [
          'Paste the PackagePro pairing code into the plugin settings page to connect the store to the cloud backend.',
          'The plugin stores only internal metadata, never raw public video URLs.',
        ],
      },
      {
        heading: 'Store operations',
        body: [
          'Admins can review video status in the order metabox, resend the customer email, and inspect connection health.',
          'Periodic reconciliation jobs help recover if webhooks are delayed or fail.',
        ],
      },
    ],
  },
  {
    slug: 'shipstation',
    title: 'ShipStation Setup',
    description: 'Connect ShipStation, map stores, and run label creation inside the packing flow.',
    intro:
      'PackagePro treats ShipStation as the shipping engine for rate lookup, label generation, reprints, and shipment updates.',
    sections: [
      {
        heading: 'Credentials',
        body: [
          'Enter ShipStation credentials in the admin portal and confirm the connection test before enabling live label creation.',
          'Credentials are encrypted at rest and kept server-side whenever possible.',
        ],
      },
      {
        heading: 'Store mapping',
        body: [
          'Map each WooCommerce store to the correct ShipStation store to avoid ambiguous order matching.',
          'If an order cannot be matched safely, PackagePro leaves it unresolved instead of guessing.',
        ],
      },
      {
        heading: 'Station workflow',
        body: [
          'Operators can select package, carrier, and service in the same order flow used for recording.',
          'Labels can be created, printed, reprinted, and voided without leaving the station app.',
        ],
      },
    ],
  },
  {
    slug: 'security',
    title: 'Security Model',
    description: 'How PackagePro protects customer videos, tenant boundaries, and third-party secrets.',
    intro:
      'Security is part of the main flow, not an afterthought. Video privacy, order isolation, and safe secret handling are core system requirements.',
    sections: [
      {
        heading: 'Video privacy',
        body: [
          'Videos live in a private Supabase bucket and are resolved through opaque tokens.',
          'Customer viewer links are scoped to a single order and can require secondary verification.',
        ],
      },
      {
        heading: 'Tenant isolation',
        body: [
          'Supabase row-level security limits data visibility to organization members.',
          'Station locking prevents two packers from capturing evidence for the same order at once.',
        ],
      },
      {
        heading: 'Secrets and callbacks',
        body: [
          'ShipStation keys and plugin secrets are encrypted at rest.',
          'Webhook and callback flows use signed or secret-backed verification to reject forged requests.',
        ],
      },
    ],
  },
  {
    slug: 'api-reference',
    title: 'API Reference',
    description: 'Summary of the PackagePro API surface for stores, stations, orders, videos, and viewer flows.',
    intro:
      'The PackagePro API supports onboarding, station registration, order locking, upload finalization, secure viewer access, and reconciliation tasks.',
    sections: [
      {
        heading: 'Core resources',
        body: [
          'Organizations, stores, and stations support account setup and workspace management.',
          'Orders, videos, and uploads support the fulfillment capture pipeline.',
        ],
      },
      {
        heading: 'Auth model',
        body: [
          'Admin users authenticate with Supabase Auth.',
          'Customer viewers use single-order access tokens rather than dashboard sessions.',
        ],
      },
      {
        heading: 'Operational routes',
        body: [
          'Webhook endpoints receive WooCommerce events and inbound sync callbacks.',
          'Admin maintenance routes support reconciliation, resend flows, and retention processing.',
        ],
      },
    ],
  },
];

export function getDocBySlug(slug: string) {
  return docs.find((doc) => doc.slug === slug);
}
