// craco.config.js - Fixed version with proper devServer configuration
const path = require("path");

const webpackConfig = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      // Reduce production build memory usage
      if (process.env.NODE_ENV === 'production') {
        // Disable source maps for production builds
        webpackConfig.devtool = false;
        // Disable minification to avoid high memory usage (Terser)
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          minimize: false,
        };
      }

      return webpackConfig;
    },
  },
  devServer: (devServerConfig) => {
    // Configure dev server to properly bind to port 3000
    devServerConfig.port = process.env.PORT || 3000;
    devServerConfig.host = process.env.HOST || '0.0.0.0';
    devServerConfig.allowedHosts = 'all';
    devServerConfig.historyApiFallback = true;
    
    // WebSocket configuration
    if (!devServerConfig.client) {
      devServerConfig.client = {};
    }
    devServerConfig.client.webSocketURL = {
      hostname: 'localhost',
      port: process.env.PORT || 3000,
      protocol: 'ws',
    };
    
    console.log(`📡 Dev Server Config: http://${devServerConfig.host}:${devServerConfig.port}`);
    
    return devServerConfig;
  },
};

module.exports = webpackConfig;
