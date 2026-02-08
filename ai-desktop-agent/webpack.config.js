module.exports = {
    mode: 'development',
    entry: './src/renderer/index.jsx',
    output: {
        path: __dirname + '/dist/renderer',
        filename: 'bundle.js'
    },
    target: 'electron-renderer',
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader', 'postcss-loader']
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx'],
        alias: {
            '@': __dirname + '/src/renderer'
        }
    },
    devtool: 'source-map'
};
