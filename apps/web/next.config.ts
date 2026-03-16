import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@packagepro/shared', '@packagepro/supabase-client'],
};

export default nextConfig;
