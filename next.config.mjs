/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/*': [
      './base/**/*.md',
      './design/**/*.md',
      './public/assets/brand/**/*',
    ],
  },
};

export default nextConfig;
