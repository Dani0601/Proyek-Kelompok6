const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit workers to prevent Node.js Worker postMessage DataCloneError / OOM
config.maxWorkers = 2;

module.exports = config;
