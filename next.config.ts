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
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // Use IgnorePlugin to completely skip resolution of optional
      // dependencies that genkit/opentelemetry reference but aren't installed
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@opentelemetry\/exporter-jaeger$/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /^@genkit-ai\/firebase$/,
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
