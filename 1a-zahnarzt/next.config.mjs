/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js transpilieren, damit drei/fiber sauber gebündelt werden
  transpilePackages: ['three'],
};

export default nextConfig;
