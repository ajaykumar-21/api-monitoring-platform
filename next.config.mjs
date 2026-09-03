/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg', 'bullmq', 'ioredis'],
};

export default nextConfig;
