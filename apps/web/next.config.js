import { withTamagui } from '@tamagui/next-plugin';

/** @type {import('next').NextConfig} */
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
};

export default withTamagui({
  config: './tamagui.config.ts',
  components: ['tamagui', '@simplyfpl/ui'],
  appDir: true,
  outputCSS: process.env.NODE_ENV === 'production' ? './public/tamagui.css' : null,
  disableExtraction: process.env.NODE_ENV === 'development',
})(nextConfig);
