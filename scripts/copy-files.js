import fs from 'fs';
import path from 'path';

/**
 * 通用文件复制脚本（基础脚本）
 * 只能通过模块导入使用: import { copyFiles } from './copy-files.js'; copyFiles(sourcePath, targetPath)
 */

/**
 * 复制文件或目录的函数
 * @param {string} sourcePath - 源路径
 * @param {string} targetPath - 目标路径
 */
export function copyFiles(sourcePath, targetPath) {
    console.log(`\n正在从 "${sourcePath}" 复制文件到 "${targetPath}"`);

    try {
        // 检查源路径是文件还是目录
        const stat = fs.statSync(sourcePath);

        if (stat.isFile()) {
            // 确保目标目录存在
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            fs.copyFileSync(sourcePath, targetPath);
            console.log(`成功复制文件: ${sourcePath} -> ${targetPath}`);
        } else if (stat.isDirectory()) {
            // 确保目标目录存在
            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }

            // 递归处理目录中的所有文件和子目录
            const files = fs.readdirSync(sourcePath);

            for (const file of files) {
                const sourceFile = path.join(sourcePath, file);
                const targetFile = path.join(targetPath, file);

                // 递归调用处理文件和目录
                copyFiles(sourceFile, targetFile);
            }
        } else {
            throw new Error('源路径既不是文件也不是目录');
        }

        console.log(`${sourcePath}--->${targetPath} 复制完成！`);
    } catch (error) {
        console.error('复制过程中发生错误:', error);
        throw error;
    }
}
