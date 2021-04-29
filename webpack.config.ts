import * as path from 'path';
import * as webpack from 'webpack';

export default function (env: any): webpack.Configuration {
    if (!env.out) throw new Error("webpack --env out=xxx");

    let map: any = {
        "umd.js": { target: "es5", module: "umd", mode: "development", libraryTarget: "umd" },
        "esm.js": { target: "ESNEXT", module: "ESNEXT", mode: "development", libraryTarget: "module" },
        "umd.min.js": { target: "es5", module: "umd", mode: "production", libraryTarget: "umd" },
        "esm.min.js": { target: "ESNEXT", module: "ESNEXT", mode: "production", libraryTarget: "module" },
    }

    let config = map[env.out];
    let isEsm = config.libraryTarget === "module";

    return {
        mode: config.mode,
        entry: "./src/index.ts",
        output: {
            filename: env.out,
            path: path.resolve(__dirname, 'dist'),
            libraryTarget: config.libraryTarget,
        },
        experiments: {
            outputModule: isEsm
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: "ts-loader",
                    options: {
                        compilerOptions: {
                            target: config.target,
                            module: config.module
                        }
                    }
                }
            ]
        },
        resolve: {
            extensions: [".ts", ".tsx", ".js"]
        },
        devtool: "source-map"
    };
}