// Karma configuration
// Generated on Sat Oct 31 2015 13:42:19 GMT-0700 (PDT)

module.exports = function (config) {
  config.set({
    browsers: [ 'Chrome' ],
    singleRun: false,
    frameworks: [ 'jasmine' ],
    files: ['./test/**/*.ts'],
    preprocessors: {'./test/*.ts': [ 'webpack', 'sourcemap' ]},
    reporters: [ 'dots' ],
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-jasmine'),
      require('karma-sourcemap-loader'),
      require('karma-webpack')
    ],
    webpack: {
      devtool: 'source-map',
      module: {
        loaders: [
          {test: /\.ts/, loaders: ['ts-loader'], exclude: /node_modules/}
        ]
      },
      resolve: {
        extensions: ["", ".js", ".ts"]
      }
    },
    webpackServer: {
      noInfo: true
    }
  });
};

