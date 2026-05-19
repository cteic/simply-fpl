import { withTamagui } from '@tamagui/next-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['tamagui', '@tamagui/core', '@tamagui/web', 'react-native-web'],
};

export default withTamagui({
  config: './tamagui.config.ts',
  components: ['tamagui'],
  appDir: true,
  outputCSS: null,
  disableExtraction: true,
})(nextConfig);
