const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit workers to prevent Node.js Worker postMessage DataCloneError / OOM
config.maxWorkers = 2;

// Izinkan Metro membundel model TFLite sebagai aset (fitur AI perkiraan penjualan)
config.resolver.assetExts.push('tflite');

module.exports = config;