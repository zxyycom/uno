import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// ==================== 配置区 ====================
// 修改以下参数以调整输出效果
const CONFIG = {
    inputDir: 'assets/res/image/org', // 图片源目录
    outputDir: 'assets/res/image/h200', // 输出目录
    width: null, // 输出宽度（px），高度按比例自动计算
    height: 200, // 输出高度（px），宽度按比例自动计算（二选一）
};

// ==================== 工具函数 ====================
// 确保目录存在，不存在则创建
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// ==================== 核心逻辑 ====================
// 图片缩放函数：保持宽高比，无损输出
// 指定宽度时高度按比例缩放，指定高度时宽度按比例缩放
async function resizeImage(inputPath, outputPath, targetWidth, targetHeight) {
    // 获取原始图片元数据（宽高等信息）
    const metadata = await sharp(inputPath).metadata();

    let width = metadata.width;
    let height = metadata.height;

    // 计算宽高比
    const aspectRatio = width / height;

    // 根据配置计算目标尺寸
    if (targetWidth !== null) {
        // 指定宽度，高度按比例缩放
        width = targetWidth;
        height = Math.round(targetWidth / aspectRatio);
    } else if (targetHeight !== null) {
        // 指定高度，宽度按比例缩放
        height = targetHeight;
        width = Math.round(targetHeight * aspectRatio);
    } else {
        throw new Error('必须指定 width 或 height 之一');
    }

    // 使用 sharp 进行缩放并输出无损 PNG
    await sharp(inputPath)
        .resize(width, height)
        .png({ compressionLevel: 0 }) // 无损压缩
        .toFile(outputPath);

    return {
        width,
        height,
        originalWidth: metadata.width,
        originalHeight: metadata.height,
    };
}

// ==================== 主流程 ====================
// 遍历输入目录中的所有图片，进行缩放处理
async function processImages() {
    ensureDir(CONFIG.outputDir);

    // 确定目标尺寸
    const targetWidth = CONFIG.width ?? null;
    const targetHeight = CONFIG.height ?? null;

    if (targetWidth === null && targetHeight === null) {
        console.error('错误：必须指定 width 或 height 之一');
        process.exit(1);
    }

    // 读取输入目录，只保留 png/jpg/jpeg 文件
    const files = fs
        .readdirSync(CONFIG.inputDir)
        .filter((file) => /\.(png|jpg|jpeg)$/i.test(file));

    console.log(`Found ${files.length} images to process\n`);

    const results = [];

    // 逐个处理图片
    for (const file of files) {
        const inputPath = path.join(CONFIG.inputDir, file);
        const outputPath = path.join(CONFIG.outputDir, file);

        try {
            const result = await resizeImage(
                inputPath,
                outputPath,
                targetWidth,
                targetHeight
            );
            results.push({ file, status: 'ok', ...result });
            console.log(
                `[OK] ${file}: ${result.originalWidth}x${result.originalHeight} -> ${result.width}x${result.height}`
            );
        } catch (err) {
            results.push({ file, status: 'error', error: err.message });
            console.log(`[FAIL] ${file}: ${err.message}`);
        }
    }

    // 输出处理结果统计
    console.log(
        `\nDone. ${results.filter((r) => r.status === 'ok').length}/${results.length} images processed.`
    );

    const successRate =
        (results.filter((r) => r.status === 'ok').length / results.length) *
        100;
    if (successRate < 100) {
        console.log(
            `Warning: ${results.length - results.filter((r) => r.status === 'ok').length} images failed.`
        );
    }
}

// 启动脚本
processImages();
