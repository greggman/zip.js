require('source-map-support').install();  // eslint-disable-line

// const webpackConfig = require('./webpack.config.js');
// webpackConfig.entry = {};

module.exports = function (config) {
  config.set({
    preprocessors: {
      'test/test_index.js': ['webpack'],
    },
    // preprocessors: {
    //   'src/**/*.js': ['babel'],
    //   'test/**/*.js': ['babel'],
    // },
    // babelPreprocessor: {
    //   options: {
    //     presets: ['@babel/env'],
    //     plugins: ["transform-es2015-modules-umd"],
    //     sourceMap: 'inline',
    //   },
    //   filename: function (file) {
    //     return file.originalPath.replace(/\.js$/, '.js');
    //   },
    //   sourceFileName: function (file) {
    //     return file.originalPath;
    //   },
    // },
    frameworks: ['mocha', 'chai'],
    files: [
      'node_modules/@babel/polyfill/dist/polyfill.js',
      'test/test_index.js',
//      'zip-test.js',
//      'src/zip.js',
//      'src/zip-fs.js',
//      'src/zip-ext.js',
//      'src/mime-types.js',
//      'test/browser/config.js',
//      'test/browser/util.js',
      // 'test/**/*.test.js',
//      'test/test.js',
      { pattern: 'src/zlib-asm/*', watched: false, served: true, included: false, },
      { pattern: 'src/pako/*', watched: false, served: true, included: false, },
      { pattern: 'src/z-worker.js', watched: false, served: true, included: false, },
      { pattern: 'src/deflate.js', watched: false, served: true, included: false, },
      { pattern: 'src/inflate.js', watched: false, served: true, included: false, },
      { pattern: 'test/browser/lorem*', watched: false, served: true, included: false, },
    ],
    reporters: ['progress'],
    port: 9876, // karma web server port
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['ChromeHeadless'],
    autoWatch: false,
    // singleRun: false, // Karma captures browsers, runs the tests and exits
    concurrency: Infinity,


//    webpack: webpackConfig,

    webpackMiddleware: {
      noInfo: true
    },
  });
};
