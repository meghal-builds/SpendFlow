const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add wasm to asset extensions so expo-sqlite web build can resolve wa-sqlite.wasm
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'wasm'];

module.exports = config;
