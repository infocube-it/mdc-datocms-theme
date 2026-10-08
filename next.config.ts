import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Netlify gives the runtime no variable set in `netlify.toml`, only those
  // set in its UI. Inlining at build time makes the deploy context's
  // environment reach the server code either way.
  env: { DATOCMS_ENVIRONMENT: process.env.DATOCMS_ENVIRONMENT ?? '' },
};

export default nextConfig;
