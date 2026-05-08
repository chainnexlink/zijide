import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
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
          {isZh ? '隐私政策' : 'Privacy Policy'}
        </h1>
        <p className="text-slate-400 mb-8">
          {isZh ? '最后更新：2026年5月1日' : 'Last Updated: May 1, 2026'}
        </p>

        <div className="space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '1. 概述' : '1. Introduction'}
            </h2>
            <p>
              {isZh
                ? 'WarRescue（以下简称"我们"）致力于保护您的隐私。本隐私政策说明了我们在您使用 WarRescue 应用程序（以下简称"本应用"）时如何收集、使用、存储和保护您的个人信息。'
                : 'WarRescue ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the WarRescue application ("the App").'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '2. 我们收集的信息' : '2. Information We Collect'}
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>{isZh ? '账户信息：' : 'Account Information: '}</strong>
                {isZh
                  ? '电子邮件地址、用户名、密码（加密存储）。'
                  : 'Email address, username, password (encrypted).'}
              </li>
              <li>
                <strong>{isZh ? '位置数据：' : 'Location Data: '}</strong>
                {isZh
                  ? '在您授权后，我们收集您的实时位置信息，用于提供预警通知、避难所导航和紧急救援服务。'
                  : 'With your permission, we collect your real-time location to provide alert notifications, shelter navigation, and emergency rescue services.'}
              </li>
              <li>
                <strong>{isZh ? '紧急医疗信息：' : 'Emergency Medical Info: '}</strong>
                {isZh
                  ? '血型、过敏信息、紧急联系人等，仅在紧急情况下与救援人员共享。'
                  : 'Blood type, allergies, emergency contacts — shared with rescuers only during emergencies.'}
              </li>
              <li>
                <strong>{isZh ? '设备信息：' : 'Device Information: '}</strong>
                {isZh
                  ? '设备型号、操作系统版本、应用版本，用于优化服务和排查问题。'
                  : 'Device model, OS version, app version — used for service optimization and troubleshooting.'}
              </li>
              <li>
                <strong>{isZh ? '订阅信息：' : 'Subscription Information: '}</strong>
                {isZh
                  ? '订阅状态和交易记录，通过 Apple/Google 支付系统处理，我们不存储您的支付卡信息。'
                  : 'Subscription status and transaction records processed through Apple/Google payment systems. We do not store your payment card details.'}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '3. 信息使用目的' : '3. How We Use Your Information'}
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>{isZh ? '提供战区预警和安全通知服务' : 'Provide war zone alerts and safety notifications'}</li>
              <li>{isZh ? '显示附近避难所和规划逃生路线' : 'Display nearby shelters and plan escape routes'}</li>
              <li>{isZh ? '发送和接收 SOS 紧急求助信号' : 'Send and receive SOS emergency signals'}</li>
              <li>{isZh ? '家庭成员位置共享和安全状态监控' : 'Family member location sharing and safety monitoring'}</li>
              <li>{isZh ? '互助救援匹配和协调' : 'Mutual aid matching and coordination'}</li>
              <li>{isZh ? '改进和优化应用功能' : 'Improve and optimize app features'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '4. 数据存储与安全' : '4. Data Storage and Security'}
            </h2>
            <p>
              {isZh
                ? '您的数据存储在 Supabase 提供的安全云服务器上，所有数据传输均通过 HTTPS/TLS 加密。我们采取行业标准的安全措施保护您的个人信息，包括数据加密、访问控制和定期安全审计。'
                : 'Your data is stored on secure cloud servers provided by Supabase. All data transmissions are encrypted via HTTPS/TLS. We implement industry-standard security measures including data encryption, access controls, and regular security audits.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '5. 数据共享' : '5. Data Sharing'}
            </h2>
            <p>
              {isZh
                ? '我们不会向第三方出售您的个人信息。我们仅在以下情况下共享您的数据：'
                : 'We do not sell your personal information to third parties. We only share your data in the following circumstances:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>{isZh ? '在您触发 SOS 或同城预警时，与附近的互助救援人员共享您的位置' : 'Sharing your location with nearby mutual aid rescuers when you trigger SOS or city alerts'}</li>
              <li>{isZh ? '与您的家庭组成员共享安全状态和位置信息' : 'Sharing safety status and location with your family group members'}</li>
              <li>{isZh ? '法律法规要求时配合相关部门' : 'Complying with legal requirements when mandated by law'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '6. 您的权利' : '6. Your Rights'}
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>{isZh ? '访问和导出您的个人数据' : 'Access and export your personal data'}</li>
              <li>{isZh ? '更正不准确的信息' : 'Correct inaccurate information'}</li>
              <li>{isZh ? '删除您的账户和相关数据' : 'Delete your account and associated data'}</li>
              <li>{isZh ? '随时撤回位置数据的授权' : 'Withdraw location data permissions at any time'}</li>
              <li>{isZh ? '选择退出非必要的通知' : 'Opt out of non-essential notifications'}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '7. 第三方服务' : '7. Third-Party Services'}
            </h2>
            <p>
              {isZh
                ? '本应用使用以下第三方服务：Google Maps（地图和导航）、Supabase（数据存储和认证）、Apple/Google 支付系统（订阅管理）。这些服务有各自的隐私政策，建议您查阅。'
                : 'The App uses the following third-party services: Google Maps (mapping and navigation), Supabase (data storage and authentication), Apple/Google payment systems (subscription management). These services have their own privacy policies, which we recommend reviewing.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '8. 儿童隐私' : '8. Children\'s Privacy'}
            </h2>
            <p>
              {isZh
                ? '本应用不面向 13 岁以下的儿童。我们不会故意收集 13 岁以下儿童的个人信息。如果您发现您的孩子向我们提供了个人信息，请联系我们，我们将立即删除。'
                : 'The App is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you discover your child has provided us with personal information, please contact us and we will promptly delete it.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '9. 紧急服务与定位服务免责声明' : '9. Emergency Services & Location Disclaimer'}
            </h2>
            <p>
              {isZh
                ? 'WarRescue 使用基于位置的服务来辅助紧急情况下的沟通和协调。重要免责声明：'
                : 'WarRescue uses location-based services to assist with communication and coordination during emergencies. Important disclaimers:'}
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                {isZh
                  ? 'WarRescue 不是官方紧急服务替代品。本应用不直接连接政府紧急响应系统（如110、119、120或911）。在紧急情况下，请始终首先拨打当地紧急服务电话。'
                  : 'WarRescue is NOT a replacement for official emergency services. The App does not directly connect to government emergency response systems (such as 911, 112, or local equivalents). In an emergency, always call your local emergency services first.'}
              </li>
              <li>
                {isZh
                  ? '本应用的 SOS 功能仅用于通知您预先设置的紧急联系人和 WarRescue 社区中的互助志愿者。我们无法保证在所有情况下都能及时获得救援响应。'
                  : 'The SOS feature in this App is designed to notify your pre-configured emergency contacts and mutual aid volunteers within the WarRescue community. We cannot guarantee timely rescue response in all circumstances.'}
              </li>
              <li>
                {isZh
                  ? '位置数据的准确性取决于您设备的 GPS 信号、网络连接和环境条件。在室内、地下或信号受阻区域，位置精度可能受到影响。'
                  : 'The accuracy of location data depends on your device\'s GPS signal, network connectivity, and environmental conditions. Location accuracy may be affected in indoor, underground, or signal-obstructed areas.'}
              </li>
              <li>
                {isZh
                  ? '我们不对因网络中断、设备故障、GPS 不准确或任何技术问题导致的服务不可用或定位不准确承担责任。'
                  : 'We are not liable for service unavailability or location inaccuracy caused by network outages, device failures, GPS inaccuracy, or any technical issues.'}
              </li>
              <li>
                {isZh
                  ? '在战争和冲突地区，基础设施可能受损，网络和 GPS 服务可能不可靠。请勿将本应用作为您唯一的安全保障手段。'
                  : 'In war and conflict zones, infrastructure may be damaged and network/GPS services may be unreliable. Do not rely on this App as your sole means of safety.'}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '10. 隐私政策变更' : '10. Changes to This Policy'}
            </h2>
            <p>
              {isZh
                ? '我们可能会不时更新本隐私政策。更新后的版本将在应用内发布，重大变更时我们会通过应用通知您。'
                : 'We may update this Privacy Policy from time to time. Updated versions will be posted within the App, and we will notify you of significant changes through the App.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              {isZh ? '11. 联系我们' : '11. Contact Us'}
            </h2>
            <p>
              {isZh
                ? '如果您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：'
                : 'If you have any questions or suggestions about this Privacy Policy, please contact us at:'}
            </p>
            <p className="mt-2">
              {isZh ? '邮箱：' : 'Email: '}
              <a href="mailto:support@warrescue.com" className="text-blue-400 hover:text-blue-300">support@warrescue.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
