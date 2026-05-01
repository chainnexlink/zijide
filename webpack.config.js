const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isDev = argv.mode !== 'production';

  // Load .env file if it exists (dev convenience)
  try {
    const fs = require('fs');
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          const val = trimmed.slice(eqIndex + 1).trim();
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  } catch (_) { /* ignore */ }

  return {
    mode: isDev ? 'development' : 'production',
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.[contenthash:8].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-react',
                  {
                    runtime: 'automatic',
                    development: isDev
                  }
                ],
                '@babel/preset-env',
                '@babel/preset-typescript'
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    devServer: {
      port: 3267,
      allowedHosts: 'all',
      historyApiFallback: {
        index: '/index.html',
        rewrites: [
          { from: /^\/_p\/\d+\//, to: '/index.html' }
        ]
      }
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body'
      }),
      new webpack.DefinePlugin({
        'process.env.GOOGLE_MAPS_KEY': JSON.stringify(process.env.GOOGLE_MAPS_KEY || ''),
        'process.env.APP_VERSION': JSON.stringify(require('./package.json').version),
      })
    ]
  };
};
