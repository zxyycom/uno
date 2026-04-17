import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import fs from 'fs';
import path from 'path';
import dts from 'rollup-plugin-dts';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * 自定义插件：替换测试环境判断
 * 将 process.env.NODE_ENV 相关判断替换为固定值
 */
function replaceEnvironmentChecks() {
    return {
        name: 'replace-environment-checks',
        transform(code) {
            // 替换 process.env.NODE_ENV !== 'production' 为 false
            let modified = code.replace(
                /process\.env\.NODE_ENV\s*!==?\s*['"]production['"]/g,
                'false'
            );

            // 替换 process.env.NODE_ENV === 'production' 为 true
            modified = modified.replace(
                /process\.env\.NODE_ENV\s*===?\s*['"]production['"]/g,
                'true'
            );

            // 删除完整的 if (process.env.NODE_ENV !== 'production') { ... } 块
            modified = modified.replace(
                /if\s*\(\s*process\.env\.NODE_ENV\s*!==?\s*['"]production['"]\s*\)\s*\{[\s\S]*?\n\s*\}/g,
                ''
            );

            // 删除完整的 if (process.env.NODE_ENV === 'production') { ... } 块
            modified = modified.replace(
                /if\s*\(\s*process\.env\.NODE_ENV\s*===?\s*['"]production['"]\s*\)\s*\{[\s\S]*?\n\s*\}/g,
                ''
            );

            if (modified !== code) {
                return {
                    code: modified,
                    map: null,
                };
            }
        },
    };
}

/**
 * 确保目标目录存在
 */
function ensureOutputDir(outputDir) {
    return {
        name: 'ensure-output-dir',
        buildStart() {
            const dir = path.join(rootDir, outputDir);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        },
    };
}

export default [
    // ========== Neverthrow ==========
    {
        input: 'node_modules/neverthrow/dist/index.es.js',
        output: {
            file: 'assets/libs/npm/neverthrow/neverthrow.js',
            format: 'es',
            sourcemap: false,
        },
        plugins: [
            ensureOutputDir('assets/libs/npm/neverthrow'),
            resolve({
                browser: true,
            }),
            commonjs(),
        ],
        external: [],
    },

    // Neverthrow Type definitions
    {
        input: 'node_modules/neverthrow/dist/index.d.ts',
        output: {
            file: 'assets/libs/npm/neverthrow/neverthrow.d.ts',
            format: 'es',
        },
        plugins: [
            dts({
                respectExternal: true,
            }),
        ],
    },

    // ========== nanostores ==========
    {
        input: 'node_modules/nanostores/index.js',
        output: {
            file: 'assets/libs/npm/nanostores/nanostores.js',
            format: 'es',
            sourcemap: false,
        },
        plugins: [
            ensureOutputDir('assets/libs/npm/nanostores'),
            resolve({
                browser: true,
            }),
            commonjs(),
            replaceEnvironmentChecks(),
        ],
        external: [],
    },

    // nanostores Type definitions
    {
        input: 'node_modules/nanostores/index.d.ts',
        output: {
            file: 'assets/libs/npm/nanostores/nanostores.d.ts',
            format: 'es',
        },
        plugins: [
            dts({
                respectExternal: true,
            }),
        ],
    },

    // ========== xstate ==========
    {
        input: 'node_modules/xstate/dist/xstate.esm.js',
        output: {
            file: 'assets/libs/npm/xstate/xstate.js',
            format: 'es',
            sourcemap: false,
        },
        plugins: [
            ensureOutputDir('assets/libs/npm/xstate'),
            resolve({
                browser: true,
            }),
            commonjs(),
        ],
        external: [],
    },

    // xstate Type definitions
    {
        input: 'node_modules/xstate/dist/declarations/src/index.d.ts',
        output: {
            file: 'assets/libs/npm/xstate/xstate.d.ts',
            format: 'es',
        },
        plugins: [
            dts({
                respectExternal: true,
                compilerOptions: {
                    paths: {
                        xstate: ['node_modules/xstate/dist/declarations/src'],
                    },
                },
            }),
        ],
    },
];
