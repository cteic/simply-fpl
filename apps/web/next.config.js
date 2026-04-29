/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@simplyfpl/ui',
    '@simplyfpl/fpl-client',
    '@simplyfpl/types',
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
