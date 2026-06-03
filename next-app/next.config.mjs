/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['three', '@react-three/drei'],
  },
};

export default nextConfig;
