/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ships untranspiled ESM helpers used by drei – let Next transpile them.
  transpilePackages: ['three'],
};

export default nextConfig;
