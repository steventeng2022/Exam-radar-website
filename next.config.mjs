const cloudflare = process.env.CLOUDFLARE_BUILD === '1';

/** @type {import('next').NextConfig} */
const config = cloudflare ? { output: 'export', trailingSlash: true } : {};

export default config;
