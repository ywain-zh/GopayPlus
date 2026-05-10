const readline = require('readline');
const { runFullProtocolFlow } = require('./oauth_login');

function normalizeCloudEmail(email) {
    let normalized = String(email || '').trim().toLowerCase();
    normalized = normalized.replace(/@chiyiyi\.cloud(?:\.cloud)+$/i, '@chiyiyi.cloud');
    if (normalized && !normalized.includes('@')) {
        normalized = `${normalized}@chiyiyi.cloud`;
    }
    return normalized;
}

function askEmail() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('请输入邮箱: ', (answer) => {
            rl.close();
            resolve(String(answer || '').trim());
        });
    });
}

async function main() {
    let email = normalizeCloudEmail(process.argv[2] || '');
    if (!email) {
        email = normalizeCloudEmail(await askEmail());
    }

    if (!email) {
        console.error('缺少邮箱，示例: node run_oauth.js example@domain.com');
        process.exit(1);
    }

    console.log(`[OAuth] 开始提取协议，邮箱: ${email}`);
    const result = await runFullProtocolFlow(email);

    console.log('[OAuth] 提取成功');
    console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
    console.error('[OAuth] 提取失败:', error.message);
    process.exit(1);
});
