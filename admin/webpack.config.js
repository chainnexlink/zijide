const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode !== 'production';

  return {
    mode: isDev ? 'development' : 'production',
    entry: './admin/src/index.tsx',
    output: {
      path: path.resolve(__dirname, '..', 'dist-admin'),
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
                ['@babel/preset-react', { runtime: 'automatic', development: isDev }],
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
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      modules: [path.resolve(__dirname, '..', 'node_modules'), 'node_modules']
    },
    devServer: {
      port: 3268,
      allowedHosts: 'all',
      historyApiFallback: {
        index: '/index.html'
      }
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './admin/index.html',
        inject: 'body'
      })
    ]
  };
};
