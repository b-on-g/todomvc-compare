import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
    plugins: [
        typescript({
            compilerOptions: {
                sourceMap: false,
            },
            outputToFilesystem: true,
        }),
        resolve(),
    ],
    input: "src/index.ts",
    output: {
        file: "dist/index.js",
        format: "es",
    },
    preserveEntrySignatures: "strict",
};
