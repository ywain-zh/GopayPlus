class ChatGPTService {
    constructor(request, token) {
        this.request = request;
        this.token = token;
        this.headers = {
            "Authorization": `Bearer ${this.token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
        // 固定的 Stripe hosted checkout fragment (从 HAR 抓包获取，所有账号通用)
        this.checkoutFragment = "#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdpamZkaWAnPyd%2FbScpJ3ZwZ3Zmd2x1cWxqa1BrbHRwYGtgdnZAa2RnaWBhJz9jZGl2YCknYnBkZmRoamlgU2R3bGRrcSc%2FJ2Zqa3F3amknKSdkdWxOYHwnPyd1blppbHNgWjA0TUp3VnJGM200a31Cakw2aVFEYldvXFN3fzFhUDZjU0pkZ3xGZk5XNnVnQE9icEZTRGl0Rn1hfUZQc2pXbTRdUnJXZGZTbGpzUDZuSU5zdW5vbTJMdG5SNTVsXVR2b2o2aycpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl";
    }

    /**
     * 简化流程：创建订单 → 拼接支付链接 → 返回给浏览器打开
     */
    async getPayPalApprovalUrl(config) {
        try {
            const checkoutSessionId = await this._createOrder(config.country);
            if (!checkoutSessionId) return null;

            // 直接拼接 Stripe Hosted Checkout 页面链接
            const payUrl = `https://pay.openai.com/c/pay/${checkoutSessionId}${this.checkoutFragment}`;
            console.log(`✅ 支付链接已生成`);
            return payUrl;
        } catch (e) {
            console.error("[-] 获取支付链接异常:", e.message);
            return null;
        }
    }

    async _createOrder(country) {
        // (静默) 准备创建订单（结果会以 ✅/❌ 输出）
        const response = await this.request.post("https://chatgpt.com/backend-api/payments/checkout", {
            headers: this.headers,
            data: {
                entry_point: "all_plans_pricing_modal",
                plan_name: "chatgptplusplan",
                billing_details: { country: "US", currency: "USD" },
                promo_campaign: {
                    promo_campaign_id: "plus-1-month-free", is_coupon_from_query_param: false
                },
                check_card_proxy: true
            }
        });
        if (response.status() !== 200) {
            const body = await response.text().catch(() => "");
            console.error(`[-] 订单创建失败 (Status: ${response.status()})`);
            console.error(`    响应: ${body}`);
            if (body.includes('not_eligible') || body.includes('permission') || body.includes('Offer not found')) {
                console.error("❌ [提示] 该账号无激活权限，请丢弃！(无激活权限)");
            }
            return null;
        }
        const data = await response.json();
        const sessionId = data.checkout_session_id || (JSON.stringify(data).match(/cs_live_[A-Za-z0-9]+/)?.[0]);
        console.log(`✅ 订单创建成功`);
        return sessionId;
    }
}

module.exports = ChatGPTService;
