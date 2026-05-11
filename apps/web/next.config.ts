import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@packagepro/shared',
    '@packagepro/shipstation',
    '@packagepro/supabase-client',
  ],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
