// const withBundleAnalyzer = require("@next/bundle-analyzer")({
//   enabled: process.env.ANALYZE === "true",
// });

// module.exports = withBundleAnalyzer({
//   eslint: {
//     dirs: ["."],
//   },
//   basePath: "",
//   paths: {
//     "@/components/*": ["components/*"],
//     "@/target/*": ["target/*"],
//     "@/utils/*": ["utils/*"],
//     "@/styles/*": ["styles/*"],
//     "@/context/*": ["context/*"],
//   },
//   reactStrictMode: true,
// });

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  eslint: {
    dirs: ["."],
  },
  basePath: "",
  paths: {
    "@/components/*": ["components/*"],
    "@/target/*": ["target/*"],
    "@/utils/*": ["utils/*"],
    "@/styles/*": ["styles/*"],
    "@/context/*": ["context/*"],
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
