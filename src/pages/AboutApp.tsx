import React from 'react';
import { ArrowLeft, Shield, FileText, LifeBuoy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { safeStorage } from '../utils/safeStorage';

const SUPPORT_URL = 'https://chainnexlink.github.io/zijide/support.html';

const AboutApp: React.FC = () => {
  const navigate = useNavigate();
  const lang = safeStorage.getItem('language') || 'en';
  const isZh = lang === 'zh';
  const version = process.env.APP_VERSION || '1.0.0';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft size={20} />
          <span>{isZh ? '返回' : 'Back'}</span>
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-3xl">
            🛡️
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              WarRescue{isZh ? '：战区预警' : ': Air-Raid Alerts'}
            </h1>
            <p className="text-sm text-slate-400">
              {isZh ? '版本' : 'Version'} {version}
            </p>
          </div>
        </div>

        <p className="text-slate-300 leading-relaxed mb-8">
          {isZh
            ? 'WarRescue 是一款面向冲突地区平民的安全预警工具，聚合公开来源的空袭、炮击与灾害风险信息，按你的位置推送预警，并提供避难所导航、离线地图与一键 SOS，帮助你和家人更快做出避险决策。本应用仅用于预警与参考，不保证 100% 准确或安全。'
            : 'WarRescue is a civilian safety early-warning tool for conflict zones. It aggregates air-raid, shelling and disaster risk information from public sources, pushes location-based alerts, and provides shelter navigation, offline maps and one-tap SOS to help you and your family decide and take cover faster. This app is for early-warning and reference only and does not guarantee 100% accuracy or safety.'}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/privacy')}
            className="w-full flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors text-left"
          >
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <span>{isZh ? '隐私政策' : 'Privacy Policy'}</span>
          </button>
          <button
            onClick={() => navigate('/terms')}
            className="w-full flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors text-left"
          >
            <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <span>{isZh ? '使用条款 (EULA)' : 'Terms of Use (EULA)'}</span>
          </button>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors text-left"
          >
            <LifeBuoy className="w-5 h-5 text-teal-400 flex-shrink-0" />
            <span>{isZh ? '支持与反馈' : 'Support & Feedback'}</span>
          </a>
        </div>

        <p className="text-xs text-slate-500 mt-8 leading-relaxed">
          {isZh
            ? '© 2026 WarRescue。预警信息来自公开来源，仅供参考；请始终以官方民防指引为准。'
            : '© 2026 WarRescue. Alert information is aggregated from public sources for reference only; always follow official civil-defense guidance.'}
        </p>
      </div>
    </div>
  );
};

export default AboutApp;
