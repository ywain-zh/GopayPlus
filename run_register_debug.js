const fs = require('fs');
const path = require('path');
const { runRegistrationFlow } = require('./register_openai');

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function main() {
    const startedAt = new Date();
    console.log(`[RegisterDebug] 开始调试注册，时间: ${startedAt.toISOString()}`);

    const result = await runRegistrationFlow();

    const debugDir = path.join(__dirname, 'debug_screenshots', '注册');
    ensureDir(debugDir);

    const resultPath = path.join(
        debugDir,
        `register_debug_result_${Date.now()}.json`
    );

    fs.writeFileSync(resultPath, JSON.stringify({
        exported_at: new Date().toISOString(),
        result
    }, null, 2), 'utf8');

    console.log('[RegisterDebug] 注册成功');
    console.log(JSON.stringify(result, null, 2));
    console.log(`[RegisterDebug] 结果已保存: ${resultPath}`);
}

main().catch((error) => {
    console.error('[RegisterDebug] 注册失败:', error && error.stack ? error.stack : error);
    process.exit(1);
});
