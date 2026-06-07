/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js transpilieren, damit drei/fiber sauber gebündelt werden
  transpilePackages: ['three'],
  // Statischer Export: erzeugt beim Build den Ordner out/ (rein statisch).
  output: 'export',
  images: { unoptimized: true },
  // Relative Pfade in Unterordnern erlauben (z. B. lokales Ansehen via Static-Server).
  trailingSlash: true,
};

export default nextConfig;
