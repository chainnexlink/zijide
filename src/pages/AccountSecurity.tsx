import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  Smartphone,
  Mail,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Check,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../supabase/client';

export default function AccountSecurity() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('新密码至少6位');
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('密码修改成功');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-xl font-bold">账号安全</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-green-400" />
            修改密码
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">当前密码</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="请输入当前密码"
                  className="w-full h-12 px-4 pr-12 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">新密码</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="请输入新密码（至少6位）"
                  className="w-full h-12 px-4 pr-12 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">确认新密码</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="请再次输入新密码"
                  className="w-full h-12 px-4 pr-12 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={saving}
              className="w-full h-12 bg-green-500 rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  保存中...
                </>
              ) : (
                '修改密码'
              )}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            安全设置
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">绑定手机号</p>
                  <p className="text-sm text-slate-400">已绑定</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">绑定邮箱</p>
                  <p className="text-sm text-slate-400">未绑定</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">两步验证</p>
                  <p className="text-sm text-slate-400">未开启</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
