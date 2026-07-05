/** @type {import('next').NextConfig} */

const { securityHeaders } = require('./next.config.security');

const isGithubPages = process.env.GITHUB_PAGES === 'true';
const githubPagesBasePath = '/RadiantKids';

const nextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: isGithubPages,
  },

  // GitHub Pages: static export at https://tinybeetlelabs.github.io/RadiantKids/
  ...(isGithubPages && {
    output: 'export',
    basePath: githubPagesBasePath,
    assetPrefix: `${githubPagesBasePath}/`,
    trailingSlash: true,
    images: { unoptimized: true },
  }),

  env: {
    NEXT_PUBLIC_GITHUB_PAGES: isGithubPages ? 'true' : 'false',
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? githubPagesBasePath : '',
  },

  // Security headers (not supported on static GitHub Pages export)
  ...(!isGithubPages && {
    async headers() {
      return [
        {
          source: '/:path*',
          headers: securityHeaders,
        },
      ];
    },
  }),

  poweredByHeader: false,
  compress: !isGithubPages,
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
