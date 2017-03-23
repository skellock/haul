/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 * 
 * makeReactNativeConfig.js
 * 
 * @flow
 */
const webpack = require("webpack");
const HappyPack = require("happypack");
const path = require("path");
const findProvidesModule = require("./findProvidesModule");

const PLATFORMS = ["ios", "android"];

type ConfigOptions = {
  port: number,
  cwd: string,
  dev: boolean
};

type Env = ConfigOptions & {
  platform: "ios" | "android",  
};

// @todo type this
type WebpackConfig = {
  entry: Array<string> | string
};

type WebpackConfigFactory =
  | ((ConfigOptions, WebpackConfig) => WebpackConfig)
  | WebpackConfig;

/**
 * Returns default config based on environment 
 */
const getDefaultConfig = ({ platform, cwd, dev, port }): WebpackConfig => ({
  // Default polyfills and entry-point setup
  entry: [require.resolve("./polyfillEnvironment.js")],
  // Built-in loaders
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: "happypack/loader?id=babel",
        exclude: /node_modules\/(?!react)/,
      },
      {
        test: /\.json$/,
        loader: "json-loader"
      }
    ]
  },
  output: {
    path: "/",
    filename: `index.${platform}.bundle`
  },
  // Default plugins
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: dev
    }),
    // Use HappyPack to speed up Babel build times
    // significantly
    new HappyPack({
      id: "babel",
      loaders: [
        `babel-loader?presets[]=react-native&plugins[]=${require.resolve("./fixRequireIssues")}`
      ],
      verbose: false,
    })
  ],
  // Default resolve
  resolve: {
    alias: findProvidesModule([path.resolve(cwd, "node_modules/react-native")]),
    extensions: [`.${platform}.js`, ".js"]
  },
});

/**
 * Creates an array of configs based on changing `env` for every
 * platform and returns
 */
function makeReactNativeConfig(
  userWebpackConfig: WebpackConfigFactory,
  options: ConfigOptions
): Array<WebpackConfig> {
  return PLATFORMS.map(platform => {
    const env: Env = Object.assign({}, options, { platform });
    const defaultWebpackConfig = getDefaultConfig(env);

    const config = Object.assign(
      {},
      defaultWebpackConfig,
      typeof userWebpackConfig === "function"
        ? userWebpackConfig(env, defaultWebpackConfig)
        : userWebpackConfig
    );

    // For simplicity, we don't require users to extend
    // default config.entry but do it for them.
    // $FlowFixMe: Doesn't work with union here
    config.entry = defaultWebpackConfig.entry.concat(config.entry);

    return config;
  });
}

module.exports = makeReactNativeConfig;
