import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfUse: React.FC = () => {
  const navigate = useNavigate();
  const lang = localStorage.getItem('language') || 'en';
  const isZh = lang === 'zh';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft size={20} />
          <span>{isZh ? '返回' : 'Back'}</span>
        </button>

        <h1 className="text-3xl font-bold text-white mb-2">
          {isZh ? '使用条款 (EULA)' : 'Terms of Use (EULA)'}
        </h1>
        <p className="text-slate-400 mb-8">
          {isZh ? '最后更新：2026年5月1日' : 'Last Updated: May 1, 2026'}
        </p>

        <div className="space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '1. 接受条款' : '1. Acceptance of Terms'}
            </h2>
            <p>
              {isZh
                ? '通过下载、安装或使用 WarRescue 应用程序（以下简称"本应用"），您同意受本最终用户许可协议（EULA）的约束。如果您不同意这些条款，请不要使用本应用。'
                : 'By downloading, installing, or using the WarRescue application ("the App"), you agree to be bound by this End User License Agreement (EULA). If you do not agree to these terms, do not use the App.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '2. 服务描述' : '2. Service Description'}
            </h2>
            <p>
              {isZh
                ? 'WarRescue 是一款战区安全预警应用，提供实时预警通知、避难所信息、逃生路线规划、SOS 紧急求助和家庭安全管理等功能。本应用使用位置服务来提供上述功能。'
                : 'WarRescue is a war zone safety alert application that provides real-time alert notifications, shelter information, escape route planning, SOS emergency assistance, and family safety management. The App uses location services to provide these features.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 text-red-400">
              {isZh ? '3. 紧急服务免责声明（重要）' : '3. Emergency Services Disclaimer (IMPORTANT)'}
            </h2>
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
              <p className="font-semibold mb-3">
                {isZh
                  ? '请仔细阅读以下免责声明：'
                  : 'Please read the following disclaimers carefully:'}
              </p>
              <ul className="list-disc pl-6 space-y-3">
                <li>
                  {isZh
                    ? 'WarRescue 不是也不能替代官方紧急服务（如110、119、120、911、112等）。本应用不直接连接任何政府运营的紧急响应系统或调度中心。'
                    : 'WarRescue is NOT and cannot replace official emergency services (such as 911, 112, or local equivalents). The App does NOT directly connect to any government-operated emergency response system or dispatch center.'}
                </li>
                <li>
                  {isZh
                    ? '本应用的 SOS 功能仅用于向您预设的紧急联系人和 WarRescue 互助社区中的志愿者发送通知。这些通知者不是专业急救人员，我们无法保证他们能够及时响应或到达您的位置。'
                    : 'The SOS feature in this App is designed solely to send notifications to your pre-configured emergency contacts and volunteer mutual aid members within the WarRescue community. These responders are not professional emergency personnel, and we cannot guarantee they will respond promptly or reach your location.'}
                </li>
                <li>
                  {isZh
                    ? '位置数据的准确性受限于您设备的 GPS 硬件能力、网络连接质量和环境条件（包括但不限于室内环境、地下空间、隧道、高楼密集区域和信号干扰区域）。我们不保证位置数据的绝对准确性。'
                    : 'Location data accuracy is limited by your device\'s GPS hardware capabilities, network connectivity quality, and environmental conditions (including but not limited to indoor environments, underground spaces, tunnels, dense urban areas, and signal-jammed areas). We do not guarantee absolute accuracy of location data.'}
                </li>
                <li>
                  {isZh
                    ? '在武装冲突和战争地区，通信基础设施可能被摧毁或中断，GPS 信号可能被干扰或欺骗。在此类环境下，本应用可能无法正常运行或提供准确信息。请勿将本应用作为您在紧急情况下的唯一安全保障。'
                    : 'In armed conflict and war zones, communication infrastructure may be destroyed or disrupted, and GPS signals may be jammed or spoofed. In such environments, the App may not function properly or provide accurate information. Do NOT rely on this App as your sole safety measure in emergency situations.'}
                </li>
                <li>
                  {isZh
                    ? '我们不对因以下原因导致的任何损失、伤害或死亡承担责任：应用服务中断、位置信息不准确、通知延迟或未送达、网络不可用或任何其他技术故障。'
                    : 'We are NOT liable for any loss, injury, or death resulting from: service interruptions, inaccurate location information, delayed or undelivered notifications, network unavailability, or any other technical failure.'}
                </li>
                <li>
                  {isZh
                    ? '在任何紧急情况下，请始终首先拨打当地官方紧急服务电话，并遵循当地政府和军方的安全指示。'
                    : 'In ANY emergency situation, ALWAYS call your local official emergency services first and follow safety instructions from local government and military authorities.'}
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '4. 订阅条款' : '4. Subscription Terms'}
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>{isZh ? '个人方案：$39.99/月（30天自动续期）' : 'Personal Plan: $39.99/month (30-day auto-renewal)'}</li>
              <li>{isZh ? '家庭方案：$99.99/月（30天自动续期）' : 'Family Plan: $99.99/month (30-day auto-renewal)'}</li>
              <li>{isZh ? '订阅费用将通过您的 Apple ID 账户收取' : 'Subscription fees are charged to your Apple ID account'}</li>
              <li>{isZh ? '订阅会在当前周期结束时自动续费，除非您在到期前至少24小时关闭自动续费' : 'Subscriptions auto-renew at the end of the current period unless you turn off auto-renewal at least 24 hours before expiration'}</li>
              <li>{isZh ? '您可以在 iPhone/iPad 的"设置" > "Apple ID" > "订阅"中管理或取消订阅' : 'You can manage or cancel subscriptions in iPhone/iPad Settings > Apple ID > Subscriptions'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '5. 使用限制' : '5. Usage Restrictions'}
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>{isZh ? '不得滥用 SOS 功能发送虚假求助信号' : 'Do not misuse the SOS feature to send false distress signals'}</li>
              <li>{isZh ? '不得使用本应用从事任何违法活动' : 'Do not use the App for any illegal activities'}</li>
              <li>{isZh ? '不得尝试逆向工程、修改或破解本应用' : 'Do not attempt to reverse engineer, modify, or crack the App'}</li>
              <li>{isZh ? '不得干扰其他用户正常使用本应用' : 'Do not interfere with other users\' normal use of the App'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '6. 知识产权' : '6. Intellectual Property'}
            </h2>
            <p>
              {isZh
                ? '本应用及其所有内容（包括但不限于软件、设计、文本、图形和商标）均为 WarRescue 或其许可方的财产，受国际版权法保护。'
                : 'The App and all its contents (including but not limited to software, design, text, graphics, and trademarks) are the property of WarRescue or its licensors, protected by international copyright laws.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '7. 免责声明' : '7. Limitation of Liability'}
            </h2>
            <p>
              {isZh
                ? '在法律允许的最大范围内，WarRescue 及其开发者、员工、合作伙伴不对因使用或无法使用本应用而产生的任何直接、间接、附带、特殊或后果性损害承担责任。本应用按"现状"提供，不提供任何明示或暗示的保证。'
                : 'To the maximum extent permitted by law, WarRescue and its developers, employees, and partners shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use or inability to use the App. The App is provided "as is" without any express or implied warranties.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '8. 联系方式' : '8. Contact Information'}
            </h2>
            <p>
              {isZh ? '如有问题，请联系：' : 'For questions, contact: '}
              <a href="mailto:support@warrescue.com" className="text-blue-400 hover:text-blue-300">support@warrescue.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
