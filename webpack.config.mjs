import path from 'node:path';
import { createRequire } from 'node:module';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const require = createRequire(import.meta.url);
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');

const ROOT = import.meta.dirname;
// 项目前缀：localStorage 键 / window 标志 / 自定义事件 / 正则 scriptName 全部带这个前缀。
const PROJECT = 'koi';

export default (_env = {}, argv = {}) => {
  const mode = argv.mode ?? 'production';
  const isProduction = mode === 'production';

  return {
    mode,
    // 正式产物必须是“一个 html 文件”，所以不留 sourceMappingURL 外链；
    // 开发模式保留 source map 便于在浏览器里断点。
    devtool: isProduction ? false : 'eval-source-map',
    entry: path.join(ROOT, 'src', PROJECT, 'index.tsx'),
    output: {
      path: path.join(ROOT, 'dist', PROJECT),
      filename: 'index.js',
      publicPath: '',
      clean: true,
    },
    target: 'web',
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.css'],
      alias: {
        '@': path.join(ROOT, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              noUnusedLocals: false,
              noUnusedParameters: false,
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: [
            // style-loader：CSS 打进 JS，运行时注入 <style>。
            // 这样整包都在 <body>，$('body').load() 搬进酒馆 iframe 时不会丢样式。
            'style-loader',
            { loader: 'css-loader', options: { url: false } },
            'postcss-loader',
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.join(ROOT, 'src', PROJECT, 'index.html'),
        filename: 'index.html',
        scriptLoading: 'module',
        // 脚本注入到 <body> 末尾（同 style-loader 的理由）。
        inject: 'body',
        cache: false,
      }),
      new HtmlInlineScriptPlugin(),
    ],
    optimization: {
      minimize: isProduction,
    },
    performance: {
      hints: false,
    },
  };
};
