package com.warrescue.app.activity;

import android.graphics.Typeface;
import android.text.Html;
import android.text.method.LinkMovementMethod;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.warrescue.app.R;

/**
 * Displays Privacy Policy or Terms of Service content in-app.
 * Required by both Apple App Store and Google Play Store.
 */
public class LegalPageActivity extends BaseDetailActivity {

    private String pageType;

    @Override
    protected String getPageTitle() {
        pageType = getIntent().getStringExtra("type");
        if ("privacy".equals(pageType)) {
            return getString(R.string.privacy_policy);
        } else {
            return getString(R.string.terms_of_service);
        }
    }

    @Override
    protected void buildContent(LinearLayout container) {
        pageType = getIntent().getStringExtra("type");

        if ("privacy".equals(pageType)) {
            buildPrivacyPolicy(container);
        } else {
            buildTermsOfService(container);
        }
    }

    private void buildPrivacyPolicy(LinearLayout container) {
        addLegalSection(container, "隐私政策", true);
        addLegalSection(container, "最后更新: 2025年1月1日", false);

        addLegalSection(container, "\n1. 信息收集", true);
        addLegalParagraph(container,
                "我们收集以下类型的信息以提供和改进我们的服务：\n" +
                "• 账号信息：手机号码、电子邮件地址、昵称\n" +
                "• 位置信息：用于预警推送、避难所导航和紧急求助\n" +
                "• 设备信息：设备型号、操作系统版本、应用版本\n" +
                "• 使用数据：功能使用频率、崩溃报告");

        addLegalSection(container, "2. 信息使用", true);
        addLegalParagraph(container,
                "我们使用您的信息用于：\n" +
                "• 提供实时预警和紧急通知服务\n" +
                "• 规划逃生路线和定位避难所\n" +
                "• 处理订阅和支付\n" +
                "• 提供SOS紧急求助功能\n" +
                "• 家庭成员位置共享（需授权）\n" +
                "• 改进应用性能和用户体验");

        addLegalSection(container, "3. 信息共享", true);
        addLegalParagraph(container,
                "我们不会出售您的个人信息。仅在以下情况下共享：\n" +
                "• 紧急救援场景（向救援机构提供您的位置）\n" +
                "• 家庭组成员之间（需双方同意）\n" +
                "• 法律要求或合规需要\n" +
                "• 匿名统计数据用于改进服务");

        addLegalSection(container, "4. 数据安全", true);
        addLegalParagraph(container,
                "我们采用行业标准的加密技术保护您的数据。所有敏感信息通过HTTPS传输，并加密存储在安全的服务器上。");

        addLegalSection(container, "5. 数据保留与删除", true);
        addLegalParagraph(container,
                "\u2022 \u60a8\u53ef\u4ee5\u968f\u65f6\u5728\u300e\u4e2a\u4eba\u8d44\u6599\u300f\u9875\u9762\u8bf7\u6c42\u5220\u9664\u8d26\u53f7\n" +
                "• 删除账号后，您的个人数据将在30天内从服务器上永久删除\n" +
                "• 匿名化的统计数据可能会保留用于服务改进");

        addLegalSection(container, "6. 您的权利", true);
        addLegalParagraph(container,
                "您有权：\n" +
                "• 访问和更正您的个人信息\n" +
                "• 请求删除您的账号和数据\n" +
                "• 撤回定位等权限的授权\n" +
                "• 退出任何营销通信\n" +
                "• 导出您的个人数据");

        addLegalSection(container, "7. 儿童隐私", true);
        addLegalParagraph(container,
                "我们的服务不面向13岁以下的儿童。我们不会故意收集13岁以下儿童的个人信息。");

        addLegalSection(container, "8. 联系我们", true);
        addLegalParagraph(container,
                "如有隐私相关问题，请通过以下方式联系：\n" +
                "邮箱: privacy@warrescue.com\n" +
                "应用内: 设置 > 帮助与反馈");
    }

    private void buildTermsOfService(LinearLayout container) {
        addLegalSection(container, "服务条款", true);
        addLegalSection(container, "最后更新: 2025年1月1日", false);

        addLegalSection(container, "\n1. 服务说明", true);
        addLegalParagraph(container,
                "WarRescue 是一款战时预警与救援辅助应用，提供实时预警推送、避难所导航、SOS紧急求助、逃生路线规划等功能。本应用仅作为辅助工具，不能替代官方预警系统和专业救援服务。");

        addLegalSection(container, "2. 订阅服务", true);
        addLegalParagraph(container,
                "• 个人版: ¥39.99/月，包含实时预警、SOS求助、逃生路线等功能\n" +
                "• 家庭版: ¥99.99/月，包含个人版全部功能及家庭位置共享\n" +
                "• 新用户注册后享7天免费试用（个人版功能）\n" +
                "• 订阅按月计费，到期后自动续费\n" +
                "• 您可以随时在订阅管理页面取消自动续费\n" +
                "• 取消后，订阅权益保留至当前计费周期结束\n" +
                "• 退款政策按照相应应用商店的退款规则执行");

        addLegalSection(container, "3. 用户责任", true);
        addLegalParagraph(container,
                "• 提供真实准确的个人信息\n" +
                "• 不滥用SOS紧急求助功能\n" +
                "• 不利用平台发布虚假预警信息\n" +
                "• 保护自己的账号安全\n" +
                "• 遵守当地法律法规");

        addLegalSection(container, "4. 免责声明", true);
        addLegalParagraph(container,
                "• 预警信息仅供参考，请以官方渠道为准\n" +
                "• 避难所信息可能因实际情况变化\n" +
                "• 网络中断可能影响服务可用性\n" +
                "• 位置服务精度受设备和环境影响\n" +
                "• 本应用不对因使用服务导致的任何直接或间接损失承担责任");

        addLegalSection(container, "5. 账号终止", true);
        addLegalParagraph(container,
                "• 您可以随时在应用内删除账号\n" +
                "• 我们有权在用户违反条款时暂停或终止账号\n" +
                "• 账号终止后，您的数据将按隐私政策处理");

        addLegalSection(container, "6. 知识产权", true);
        addLegalParagraph(container,
                "应用内所有内容（包括但不限于文字、图片、代码、设计）均受知识产权法保护。未经授权，不得复制、修改或分发。");

        addLegalSection(container, "7. 条款修改", true);
        addLegalParagraph(container,
                "我们保留修改本条款的权利。重大修改将通过应用内通知告知用户。继续使用服务即表示您接受修改后的条款。");

        addLegalSection(container, "8. 联系信息", true);
        addLegalParagraph(container,
                "如有任何问题或建议，请联系：\n" +
                "邮箱: support@warrescue.com\n" +
                "应用内: 设置 > 帮助与反馈");
    }

    private void addLegalSection(LinearLayout container, String title, boolean isBold) {
        TextView tv = new TextView(this);
        tv.setText(title);
        tv.setTextColor(getColor(isBold ? R.color.white : R.color.slate_400));
        tv.setTextSize(isBold ? 16 : 13);
        if (isBold) tv.setTypeface(null, Typeface.BOLD);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(isBold ? 16 : 4);
        lp.bottomMargin = dp(4);
        tv.setLayoutParams(lp);
        container.addView(tv);
    }

    private void addLegalParagraph(LinearLayout container, String text) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextColor(getColor(R.color.slate_300));
        tv.setTextSize(14);
        tv.setLineSpacing(dp(4), 1f);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(8);
        tv.setLayoutParams(lp);
        container.addView(tv);
    }
}
