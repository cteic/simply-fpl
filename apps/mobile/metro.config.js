// Metro config for the SimplyFPL Expo app inside the pnpm monorepo.
// Lets Metro resolve the workspace packages (@simplyfpl/*) and the deps
// hoisted to the repo-root node_modules. See:
// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// The workspace packages (@simplyfpl/*) and Tamagui expose their entry points
// via the package.json "exports" field (with a react-native condition) rather
// than a legacy "main", so Metro must resolve via package exports.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
