import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@packagepro/shared', '@packagepro/shipstation', '@packagepro/supabase-client'],
};

export default nextConfig;
