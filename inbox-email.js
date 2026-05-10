const axios = require('axios');
const { simpleParser } = require('mailparser');

const DEFAULT_API_BASE = 'https://temp-email-api.jzqkwl.com';

function trimBaseUrl(raw) {
    return String(raw || DEFAULT_API_BASE).trim().replace(/\/+$/, '') || DEFAULT_API_BASE;
}

/**
 * 在 inbox.jzqkwl.com (cloudflare_temp_email) 上新建一个临时邮箱地址
 * 返回 { jwt, address, password }
 */
async function createAddress({ baseUrl, name = '', domain = '', enablePrefix } = {}) {
    const url = `${trimBaseUrl(baseUrl)}/api/new_address`;
    const body = {};
    if (name) body.name = String(name);
    if (domain) body.domain = String(domain);
    if (typeof enablePrefix === 'boolean') body.enablePrefix = enablePrefix;

    const resp = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
        validateStatus: () => true
    });

    if (resp.status !== 200 || !resp.data || !resp.data.address || !resp.data.jwt) {
        const err = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data || {});
        throw new Error(`创建临时邮箱失败: HTTP ${resp.status} body=${err}`);
    }

    return {
        jwt: String(resp.data.jwt),
        address: String(resp.data.address).toLowerCase(),
        password: resp.data.password || null
    };
}

function looksLikeOpenAiVerification(subject, bodyText, fromAddr) {
    const haystack = `${subject || ''}\n${bodyText || ''}\n${fromAddr || ''}`.toLowerCase();
    return /openai|chatgpt|verification|verify|验证码/.test(haystack);
}

function extractSixDigitCodes(text) {
    const out = [];
    const re = /\b(\d{6})\b/g;
    let m = re.exec(text);
    while (m) { out.push(m[1]); m = re.exec(text); }
    return out;
}

function stripHtml(html) {
    return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * 在临时邮箱里轮询 OpenAI 验证码
 * @param {Object} opts
 * @param {string} opts.baseUrl - API base
 * @param {string} opts.jwt - 用户 JWT
 * @param {string} [opts.address] - 邮箱地址（仅用于日志）
 * @param {number} [opts.maxRetries=24]
 * @param {string} [opts.excludeCode] - 上一次拿到的旧验证码，用于排除
 * @param {Function} [opts.onNoNewCodeFor30Seconds]
 * @param {Function} [opts.onBeforePoll]
 */
async function fetchLatestOpenAiOtp({
    baseUrl,
    jwt,
    address = '',
    maxRetries = 24,
    excludeCode = '',
    onNoNewCodeFor30Seconds = null,
    onBeforePoll = null
} = {}) {
    if (!jwt) {
        throw new Error('缺少邮箱 JWT，无法拉取邮件');
    }

    const url = `${trimBaseUrl(baseUrl)}/api/mails?limit=10&offset=0`;
    const headers = { Authorization: `Bearer ${jwt}` };
    let lastResendAt = 0;

    console.log(`📨 [Inbox] 正在为 ${address || '(未知地址)'} 通过 ${baseUrl || DEFAULT_API_BASE} 获取验证码...`);

    for (let i = 0; i < maxRetries; i += 1) {
        // 每 5 轮打印一次进度，避免刷屏
        if (i === 0 || (i + 1) % 5 === 0 || i + 1 === maxRetries) {
            console.log(`📨 [Inbox] 轮询中 ${i + 1}/${maxRetries}...`);
        }
        if (onBeforePoll) {
            const recovered = await onBeforePoll(i + 1);
            if (recovered) {
                console.log('📨 [Inbox] 页面已恢复，继续等待新验证码...');
            }
        }

        try {
            const resp = await axios.get(url, { headers, timeout: 15000, validateStatus: () => true });
            if (resp.status !== 200) {
                console.warn(`⚠️  [Inbox] 拉取邮件 HTTP ${resp.status}: ${typeof resp.data === 'string' ? resp.data : ''}`);
            } else {
                const messages = Array.isArray(resp.data?.results) ? resp.data.results : [];
                if (messages.length === 0) {
                    // (静默) 邮件列表为空
                } else {
                    // 按 id 倒序：cloudflare_temp_email 的 id 是自增主键，越大越新
                    messages.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
                    for (const msg of messages) {
                        const fromAddr = String(msg.source || msg.from || '');
                        const raw = String(msg.raw || '');
                        if (!raw) continue;

                        let parsed;
                        try {
                            parsed = await simpleParser(raw);
                        } catch (_) {
                            continue;
                        }

                        const subject = parsed.subject || msg.subject || '';
                        const bodyText = [parsed.text || '', stripHtml(parsed.html || '')].join('\n');

                        if (!looksLikeOpenAiVerification(subject, bodyText, fromAddr)) {
                            continue;
                        }

                        const codes = extractSixDigitCodes(`${subject}\n${bodyText}`);
                        for (const code of codes) {
                            if (code && code !== excludeCode) {
                                console.log(`📨 [IMAP] 成功获取验证码: ${code}`);
                                return code;
                            }
                        }
                    }
                    // (静默) 暂未读取到符合条件的新验证码
                }
            }
        } catch (err) {
            console.error(`⚠️  [Inbox] 本次轮询失败: ${err.message}`);
        }

        if (excludeCode && onNoNewCodeFor30Seconds && (i + 1) % 6 === 0) {
            const now = Date.now();
            if (now - lastResendAt >= 28000) {
                lastResendAt = now;
                await onNoNewCodeFor30Seconds();
            }
        }

        for (let waitTick = 0; waitTick < 10; waitTick += 1) {
            if (onBeforePoll) {
                const recovered = await onBeforePoll(i + 1);
                if (recovered) {
                    console.log('📨 [Inbox] 页面恢复完成，继续等待...');
                    break;
                }
            }
            await new Promise((r) => setTimeout(r, 500));
        }
    }

    throw new Error('获取验证码超时');
}

module.exports = {
    DEFAULT_API_BASE,
    createAddress,
    fetchLatestOpenAiOtp
};
