import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Volume2,
  Vibrate,
  Zap,
  Moon,
  Loader2,
  Clock
} from 'lucide-react';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

type UserAlertSettings = Tables<'user_alert_settings'>;

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserAlertSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('user_alert_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings(data);
    } else {
      const { data: newSettings } = await supabase
        .from('user_alert_settings')
        .insert({ user_id: user.id })
        .select()
        .single();
      if (newSettings) {
        setSettings(newSettings);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    await supabase
      .from('user_alert_settings')
      .update({
        push_enabled: settings.push_enabled,
        sound_enabled: settings.sound_enabled,
        vibration_enabled: settings.vibration_enabled,
        flash_enabled: settings.flash_enabled,
        dnd_enabled: settings.dnd_enabled,
        dnd_start_time: settings.dnd_start_time,
        dnd_end_time: settings.dnd_end_time
      })
      .eq('id', settings.id);

    setSaving(false);
    navigate('/settings');
  };

  const toggleSetting = (key: keyof UserAlertSettings) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: !settings[key]
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

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
              <span className="text-xl font-bold">通知设置</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-purple-500 rounded-lg font-medium text-sm hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '保存'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-4">提醒方式</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">推送通知</p>
                  <p className="text-sm text-slate-400">接收预警推送</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('push_enabled')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings?.push_enabled ? 'bg-purple-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings?.push_enabled ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium">声音提醒</p>
                  <p className="text-sm text-slate-400">预警时播放声音</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('sound_enabled')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings?.sound_enabled ? 'bg-purple-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings?.sound_enabled ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Vibrate className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">震动提醒</p>
                  <p className="text-sm text-slate-400">预警时震动</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('vibration_enabled')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings?.vibration_enabled ? 'bg-purple-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings?.vibration_enabled ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-medium">红色闪烁</p>
                  <p className="text-sm text-slate-400">屏幕红色闪烁提醒</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('flash_enabled')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings?.flash_enabled ? 'bg-purple-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings?.flash_enabled ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <Moon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="font-medium">免打扰时段</p>
                <p className="text-sm text-slate-400">设置免打扰时间</p>
              </div>
            </div>
            <button
              onClick={() => toggleSetting('dnd_enabled')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings?.dnd_enabled ? 'bg-purple-500' : 'bg-slate-600'
              }`}
            >
              <motion.div
                animate={{ x: settings?.dnd_enabled ? 24 : 4 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full"
              />
            </button>
          </div>

          {settings?.dnd_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-4 border-t border-slate-700"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  开始时间
                </label>
                <input
                  type="time"
                  value={settings?.dnd_start_time?.slice(0, 5) || '22:00'}
                  onChange={(e) => setSettings({ ...settings, dnd_start_time: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  结束时间
                </label>
                <input
                  type="time"
                  value={settings?.dnd_end_time?.slice(0, 5) || '08:00'}
                  onChange={(e) => setSettings({ ...settings, dnd_end_time: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
