import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import prettier from 'prettier';
import { fileURLToPath } from 'url';

import { applyXstateReplacements } from './xstate-spread-replace.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * 打包外部依赖库
 */
async function bundleLibraries() {
    console.log('\n开始打包外部依赖库...');

    try {
        // 清理旧的打包文件
        cleanOldBuilds();

        // 使用 rollup 打包
        console.log('\n正在执行 rollup 打包...');
        execSync('rollup -c ./scripts/rollup.config.libraries.mjs', {
            stdio: 'inherit',
            cwd: rootDir,
        });

        console.log('\n外部依赖库打包完成！');

        // 应用补丁
        applyXstateReplacements();

        // 格式化打包后的文件
        await formatBundledFiles();
    } catch (error) {
        console.error('打包失败:', error);
        process.exit(1);
    }
}

/**
 * 清理旧的打包文件
 */
function cleanOldBuilds() {
    const libraries = ['neverthrow', 'nanostores', 'xstate'];

    for (const lib of libraries) {
        const libDir = path.join(rootDir, `assets/libs/npm/${lib}`);
        if (fs.existsSync(libDir)) {
            console.log(`清理旧文件: ${libDir}`);
            fs.rmSync(libDir, { recursive: true, force: true });
        }
    }
}

/**
 * 查找指定目录下所有指定扩展名的文件
 */
async function findFiles(dir, extensions) {
    const files = [];

    function traverse(currentDir) {
        const items = fs.readdirSync(currentDir);

        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                traverse(fullPath);
            } else if (stat.isFile()) {
                const ext = path.extname(item);
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }
    }

    traverse(dir);
    return files;
}

/**
 * 格式化打包后的文件
 */
async function formatBundledFiles() {
    console.log('\n开始格式化打包后的文件...');
    const libraries = ['neverthrow', 'nanostores', 'xstate'];
    let formattedCount = 0;

    for (const lib of libraries) {
        const libDir = path.join(rootDir, `assets/libs/npm/${lib}`);

        if (!fs.existsSync(libDir)) {
            console.log(`跳过不存在的目录: ${libDir}`);
            continue;
        }

        console.log(`\n处理 ${lib} 库文件...`);

        try {
            const files = await findFiles(libDir, ['.js', '.d.ts', '.ts']);

            for (const file of files) {
                const content = fs.readFileSync(file, 'utf8');

                try {
                    const config = await prettier.resolveConfig(file);
                    const formatted = await prettier.format(content, {
                        ...config,
                        filepath: file,
                    });

                    fs.writeFileSync(file, formatted, 'utf8');
                    formattedCount++;
                    console.log(
                        `  ✓ 已格式化: ${path.relative(rootDir, file)}`
                    );
                } catch (error) {
                    console.warn(
                        `  ✗ 格式化失败 ${path.relative(rootDir, file)}:`,
                        error.message
                    );
                }
            }
        } catch (error) {
            console.error(`处理 ${lib} 目录时出错:`, error);
        }
    }

    console.log(`\n格式化完成！共格式化了 ${formattedCount} 个文件。`);
}

export function isMainModule() {
    return (
        import.meta.url ===
            `file:///${path.resolve(process.argv[1]).replace(/\\/g, '/')}` ||
        (import.meta.url === fileURLToPath(import.meta.url)) ===
            path.resolve(process.argv[1])
    );
}

if (isMainModule) {
    await bundleLibraries();
}

// 导出函数供其他脚本调用
export { bundleLibraries };
