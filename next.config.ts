import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: [
    'genkit',
    '@genkit-ai/googleai',
    '@genkit-ai/next',
    '@genkit-ai/firebase',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Provide empty module fallbacks for optional dependencies
      // that genkit/opentelemetry reference but aren't installed
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        '@opentelemetry/exporter-jaeger': false,
        '@genkit-ai/firebase': false,
      };
    }
    return config;
  },
};

export default nextConfig;
