/**
 * 统一的postinstall脚本，使用bundle-libraries.js进行二次打包
 */
async function runPostInstall() {
    console.log('开始执行postinstall流程...\n');

    try {
        // 导入并执行 bundle-libraries.js
        const { bundleLibraries } = await import('./bundle-libraries.js');
        await bundleLibraries();

        console.log('\n所有postinstall任务已完成！');
    } catch (error) {
        console.error('postinstall执行过程中出现错误:', error);
        process.exit(1);
    }
}

// 执行postinstall流程
runPostInstall();
