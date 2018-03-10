const webpack = require('webpack');
const path = require('path');
var plugins = require('webpack-load-plugins')();

module.exports = {
  entry: './src/bundle.js',
  output: {
    path: __dirname,
    filename: 'zip-test.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/, //'\.js',
        include: [
          path.join(__dirname, 'src/zip.js'),
          path.join(__dirname, 'test/test.js'),
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  }
};

