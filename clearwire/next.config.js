/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Removed so API routes work on Vercel
  eslint: {
    ignoreDuringBuilds: true, // Speeds up initial MVP deployments
  },
  typescript: {
    ignoreBuildErrors: true, // Prevents strict type errors from blocking Vercel MVP builds
  }
};
module.exports = nextConfig;
