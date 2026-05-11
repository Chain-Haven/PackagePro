import Link from 'next/link';
import {
  Video,
  ShieldCheck,
  Printer,
  Package,
  Users,
  BarChart3,
  ScanBarcode,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Monitor,
  Globe,
  Zap,
  ChevronRight,
  Apple,
  Download,
} from 'lucide-react';
import { docs as docEntries } from '@/lib/site-content';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <Features />
      <SecuritySection />
      <IntegrationSection />
      <PricingSection />
      <DownloadSection />
      <DocsSection />
      <CTASection />
      <Footer />
    </div>
  );
}

/* ─── Navigation ──────────────────────────────────────────── */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Package className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">PackagePro</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </a>
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#security"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Security
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
          <a
            href="#docs"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─── Hero ────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_50%)] opacity-[0.04]" />
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="h-3.5 w-3.5" />
            Now with ShipStation label printing built in
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            Proof-of-packing
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              video for every order
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Record per-order fulfillment videos from your warehouse, print shipping labels, and send
            customers a secure link to watch their order being packed. All from one app.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 sm:w-auto"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#downloads"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-8 py-3.5 text-base font-semibold text-foreground transition-all hover:bg-muted sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Download Now
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required. Works with any WooCommerce store.
          </p>
        </div>

        {/* App Preview */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/5">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <div className="h-3 w-3 rounded-full bg-[#28c840]" />
              <div className="ml-4 flex-1 rounded-md bg-background/60 px-3 py-1 text-center text-xs text-muted-foreground">
                PackagePro Station — Packing Mode
              </div>
            </div>
            {/* App mockup */}
            <div className="grid grid-cols-3 gap-0">
              {/* Camera preview */}
              <div className="col-span-2 flex aspect-[16/10] flex-col items-center justify-center bg-[#1a1a2e] p-8">
                <div className="mb-4 flex items-center gap-2 rounded-full bg-[#ef4444] px-4 py-1.5">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  <span className="text-xs font-bold text-white tracking-wider">REC 02:34</span>
                </div>
                <Video className="h-16 w-16 text-white/20" />
                <p className="mt-3 text-sm text-white/40">Live camera preview</p>
                <div className="mt-6 w-48 border border-dashed border-white/10 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Crop guide</p>
                </div>
              </div>
              {/* Side panel */}
              <div className="flex flex-col border-l border-border bg-background p-5">
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
                  <p className="text-[10px] font-medium text-primary uppercase tracking-wider">
                    Active Order
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-primary">#1042</p>
                </div>
                <div className="mt-4 space-y-2">
                  {['Blue Widget x2', 'Red Gadget x1', 'Power Cable x1'].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto space-y-2 pt-4">
                  <div className="rounded-xl bg-[#ef4444] py-3 text-center text-sm font-bold text-white">
                    FINISH &amp; SEAL
                  </div>
                  <div className="rounded-xl border border-border py-2.5 text-center text-xs text-muted-foreground">
                    Cancel
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute -inset-x-20 -bottom-10 -z-10 h-40 bg-gradient-to-t from-primary/5 to-transparent blur-2xl" />
        </div>
      </div>
    </section>
  );
}

/* ─── Trust Bar ───────────────────────────────────────────── */

function TrustBar() {
  return (
    <section className="border-y border-border bg-muted/30 py-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6">
        {['WooCommerce', 'ShipStation', 'Supabase', 'Electron', 'HPOS Compatible'].map((name) => (
          <span
            key={name}
            className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-widest"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ─── How It Works ────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: ScanBarcode,
      title: 'Scan order barcode',
      desc: 'A warehouse worker scans an order barcode or selects an order in the queue. The system locks that order to the station.',
    },
    {
      num: '02',
      icon: Video,
      title: 'Record packing video',
      desc: 'An overhead webcam records only that order being packed. One order, one video, no mixups.',
    },
    {
      num: '03',
      icon: Printer,
      title: 'Print shipping label',
      desc: 'Create and print a ShipStation label from inside the same app. Weight, carrier, service — all in one flow.',
    },
    {
      num: '04',
      icon: Mail,
      title: 'Customer gets secure link',
      desc: 'The video uploads in the background. The customer receives an email with a private, secure link to watch their fulfillment video.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Four steps. Every order.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Designed for warehouse staff who pack hundreds of orders a day. No training manual
            required.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group relative rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="text-3xl font-extrabold text-muted-foreground/20">{step.num}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <step.icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-base font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ────────────────────────────────────────────── */

function Features() {
  const features = [
    {
      icon: Video,
      title: 'Per-Order Video Capture',
      desc: 'MediaRecorder-based webcam capture. WebM recorded, transcoded to H.264 MP4 for universal playback. Configurable resolution and framerate.',
    },
    {
      icon: Lock,
      title: 'One Order Per Station',
      desc: 'Hardware-enforced single-order locking. A second order cannot be claimed until the first is finalized or released. No accidental associations.',
    },
    {
      icon: Printer,
      title: 'ShipStation Labels',
      desc: 'Create, print, void, and reprint shipping labels directly from the packing station. Supports 4x6 and standard label printers.',
    },
    {
      icon: ScanBarcode,
      title: 'Barcode Scanner First',
      desc: 'Built for keyboard-wedge barcode scanners. Scan to start, scan to finish. No typing required for daily operations.',
    },
    {
      icon: ShieldCheck,
      title: 'Secure Video Delivery',
      desc: 'Private storage, opaque tokens, optional secondary verification (email or ZIP). Customers see only their own video. No enumeration.',
    },
    {
      icon: Mail,
      title: 'WooCommerce Emails',
      desc: "Send branded packing video emails through your store's WooCommerce mailer. Templates match your store's look and feel.",
    },
    {
      icon: Users,
      title: 'Multi-Tenant',
      desc: 'Multiple organizations, stores, stations, and users. Role-based access from org owner down to packer. Support viewer role for customer service.',
    },
    {
      icon: Monitor,
      title: 'Desktop + Web',
      desc: 'Electron desktop app for warehouse stations. Next.js admin portal for store owners. Everything syncs through the cloud backend.',
    },
    {
      icon: BarChart3,
      title: 'Audit Everything',
      desc: 'Full audit trail of every scan, lock, recording, upload, email send, and video access. Debug sync issues with complete logs.',
    },
    {
      icon: Globe,
      title: 'HPOS Compatible',
      desc: 'The WooCommerce plugin works with High-Performance Order Storage. Uses CRUD APIs only. No direct post/postmeta assumptions.',
    },
    {
      icon: Zap,
      title: 'Resilient Uploads',
      desc: 'Videos are encrypted locally, uploaded in the background with retry. If the network drops, the clip is safe. Upload resumes on reconnection.',
    },
    {
      icon: Package,
      title: 'Order Queue',
      desc: 'Filterable queue showing all packable orders. Status filters, station claim indicators, and real-time updates via Supabase Realtime.',
    },
  ];

  return (
    <section id="features" className="bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Features</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything your fulfillment team needs
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-background p-6 transition-all hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Security ────────────────────────────────────────────── */

function SecuritySection() {
  const points = [
    'Private Supabase Storage bucket — no public URLs',
    'Signed playback URLs with 1-hour expiry',
    '32-byte crypto-random viewer tokens, SHA-256 hashed in DB',
    'AES-256-GCM encryption for all third-party credentials at rest',
    'HMAC-SHA256 signed plugin ↔ backend callbacks',
    'Row-level security on every database table',
    'Rate-limited viewer endpoints (10 req/min per token)',
    'No video enumeration — one token, one video',
    'Local video files encrypted on disk, deleted after upload',
    'Optional secondary verification (email or postal code)',
  ];

  return (
    <section id="security" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Security</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Customer privacy is not optional
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Other customers must never see another customer&apos;s fulfillment video. PackagePro
              is designed from the ground up with this constraint.
            </p>
          </div>

          <div className="space-y-3">
            {points.map((point) => (
              <div
                key={point}
                className="flex items-start gap-3 rounded-lg border border-border bg-background p-3.5 transition-colors hover:border-success/30"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span className="text-sm leading-snug">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Integrations ────────────────────────────────────────── */

function IntegrationSection() {
  const integrations = [
    {
      name: 'WooCommerce',
      desc: 'HPOS-compatible plugin with custom REST endpoints, order metabox, email integration, and My Account video links.',
    },
    {
      name: 'ShipStation',
      desc: 'V1 + V2 API client. List stores, get rates, create labels, void labels, and sync shipment status. Rate-limit aware with backoff.',
    },
    {
      name: 'Supabase',
      desc: 'Postgres with RLS, Auth, Realtime subscriptions, and private Storage buckets. 17 tables with tenant isolation.',
    },
    {
      name: 'Vercel',
      desc: 'Next.js 15 admin portal and API deployed to Vercel. Serverless functions for all backend routes.',
    },
  ];

  return (
    <section className="bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Integrations
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Plugs into your existing stack
          </h2>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {integrations.map((i) => (
            <div key={i.name} className="rounded-2xl border border-border bg-background p-8">
              <h3 className="text-xl font-bold">{i.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{i.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────── */

function PricingSection() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Start free. Scale as you grow.</p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {/* Starter */}
          <div className="rounded-2xl border border-border bg-background p-8">
            <h3 className="text-lg font-bold">Starter</h3>
            <div className="mt-4">
              <span className="text-4xl font-extrabold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">For testing and small operations</p>
            <ul className="mt-6 space-y-3">
              {[
                '1 store',
                '1 station',
                '100 videos/month',
                '30-day retention',
                'Community support',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 block rounded-xl border border-border py-3 text-center text-sm font-semibold transition-colors hover:bg-muted"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl border-2 border-primary bg-background p-8 shadow-lg shadow-primary/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
              Most Popular
            </div>
            <h3 className="text-lg font-bold">Pro</h3>
            <div className="mt-4">
              <span className="text-4xl font-extrabold">$49</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">For growing fulfillment operations</p>
            <ul className="mt-6 space-y-3">
              {[
                '5 stores',
                '10 stations',
                'Unlimited videos',
                '90-day retention',
                'ShipStation integration',
                'Email support',
                'Custom email templates',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 block rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Enterprise */}
          <div className="rounded-2xl border border-border bg-background p-8">
            <h3 className="text-lg font-bold">Enterprise</h3>
            <div className="mt-4">
              <span className="text-4xl font-extrabold">Custom</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              For large-scale fulfillment centers
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Unlimited everything',
                'Custom retention',
                'SSO / SAML',
                'Dedicated support',
                'SLA guarantee',
                'On-prem storage option',
                'Custom integrations',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {f}
                </li>
              ))}
            </ul>
            <a
              href="mailto:sales@packagepro.io"
              className="mt-8 block rounded-xl border border-border py-3 text-center text-sm font-semibold transition-colors hover:bg-muted"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Docs ────────────────────────────────────────────────── */

function DocsSection() {
  return (
    <section id="docs" className="bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Documentation
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Built to be understood
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Comprehensive guides for every part of the system.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {docEntries.map((d) => (
            <Link
              key={d.slug}
              href={`/docs/${d.slug}`}
              className="group flex flex-col rounded-xl border border-border bg-background p-6 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <h3 className="font-bold">{d.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {d.description}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                Read docs{' '}
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Downloads ───────────────────────────────────────────── */

function DownloadSection() {
  return (
    <section id="downloads" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Downloads</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Get started in minutes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Download the desktop app for your packing station and the WooCommerce plugin for your
            store. Click any button to start downloading immediately.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DownloadCard
            icon={<Apple className="h-7 w-7" />}
            title="Desktop App for macOS"
            description="DMG installer for macOS. Supports Apple Silicon and Intel Macs. Includes webcam capture, barcode scanner, and ShipStation label printing."
            href="/download/desktop/macos"
            buttonText="Download .dmg"
          />
          <DownloadCard
            icon={<Monitor className="h-7 w-7" />}
            title="Desktop App for Windows"
            description="Windows ZIP package for Windows 10+. Extract the archive, then launch the included desktop app with webcam capture, barcode scanning, and ShipStation label printing."
            href="/download/desktop/windows"
            buttonText="Download .zip"
          />
          <DownloadCard
            icon={<Package className="h-7 w-7" />}
            title="WooCommerce Plugin"
            description="WordPress plugin ZIP. Upload via WP Admin &rarr; Plugins &rarr; Add New &rarr; Upload. HPOS compatible."
            href="/download/plugin/woocommerce"
            buttonText="Download .zip"
          />
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-muted/30 px-8 py-6">
          <h3 className="text-lg font-bold">Quick setup</h3>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">1.</span> Install the WooCommerce
              plugin on your store and note the pairing code it generates.
            </li>
            <li>
              <span className="font-semibold text-foreground">2.</span> Install the desktop app on
              your packing station and sign in with your PackagePro account.
            </li>
            <li>
              <span className="font-semibold text-foreground">3.</span> Enter the pairing code in
              the desktop app setup wizard to connect the store.
            </li>
            <li>
              <span className="font-semibold text-foreground">4.</span> Scan an order barcode to
              start recording. Print the label. Done.
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

function DownloadCard({
  icon,
  title,
  description,
  href,
  buttonText,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  buttonText: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-background p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p
        className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: description }}
      />
      <a
        href={href}
        download
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
      >
        <Download className="h-4 w-4" />
        {buttonText}
      </a>
    </div>
  );
}

/* ─── CTA ─────────────────────────────────────────────────── */

function CTASection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent p-12 text-center text-white md:p-20">
          <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_30%_50%,_white_0%,_transparent_50%)] opacity-10" />
          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Start recording proof-of-packing videos today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              Reduce disputes. Build trust. Give your customers full visibility into how their
              orders are packed.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary shadow-lg transition-all hover:bg-white/90"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="/download/desktop/macos"
                download
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                <Apple className="h-4 w-4" /> macOS
              </a>
              <a
                href="/download/desktop/windows"
                download
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                <Monitor className="h-4 w-4" /> Windows
              </a>
              <a
                href="/download/plugin/woocommerce"
                download
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                <Package className="h-4 w-4" /> WooCommerce Plugin
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Package className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-base font-bold">PackagePro</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Proof-of-packing video for WooCommerce fulfillment teams.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Product</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#security" className="text-sm text-muted-foreground hover:text-foreground">
                  Security
                </a>
              </li>
              <li>
                <Link
                  href="/download"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Download
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Resources</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
                  Documentation
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Chain-Haven/PackagePro"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link
                  href="/changelog"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Changelog
                </Link>
              </li>
              <li>
                <Link
                  href="/status"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Status
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="mailto:support@packagepro.io"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Support
                </a>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="mailto:sales@packagepro.io"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} PackagePro. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
