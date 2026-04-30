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

export default nextConfig;
