/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '50mb' } },
  webpack: (config) => {
    // epub2 does `require('zipfile')` in a code path we never hit (file-path
    // inputs — we pass Buffers). Stub it out to silence the resolution warning.
    config.resolve.fallback = { ...config.resolve.fallback, zipfile: false };
    return config;
  },
};
export default nextConfig;
