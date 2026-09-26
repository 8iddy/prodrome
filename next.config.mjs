/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  // Cloudflare Pages compatibility
  trailingSlash: true,
}

export default nextConfig
