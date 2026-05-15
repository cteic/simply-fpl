import { withTamagui } from '@tamagui/next-plugin';

const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://fantasy.premierleague.com https://*.workers.dev",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.workers.dev https://*.supabase.co https://cloudflareinsights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig = {
  transpilePackages: [
    '@simplyfpl/ui',
    '@simplyfpl/features',
    '@simplyfpl/fpl-client',
    '@simplyfpl/types',
    'react-native',
    'react-native-web',
    'tamagui',
    '@tamagui/animations-react-native',
    '@tamagui/shorthands',
    '@tamagui/themes',
  ],
  experimental: {
    typedRoutes: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        'react-native$': 'react-native-web',
      };
    }
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
        'process.env.IS_STATIC': JSON.stringify(''),
        __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      })
    );
    return config;
  },
};

const tamaguiPlugin = withTamagui({
  config: './tamagui.config.ts',
  components: ['tamagui', '@simplyfpl/ui'],
  appDir: true,
  outputCSS: isProd ? './public/tamagui.css' : null,
  disableExtraction: !isProd,
  logTimings: true,
  doesMedia: true,
});

export default tamaguiPlugin(nextConfig);
