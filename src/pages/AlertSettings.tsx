import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Rocket,
  Bomb,
  Swords,
  Moon,
  Loader2
} from 'lucide-react';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

type UserAlertSettings = Tables<'user_alert_settings'>;

export default function AlertSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserAlertSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [radius, setRadius] = useState(30);

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
      setRadius(data.monitor_radius_km || 30);
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
        monitor_radius_km: radius,
        alert_air_strike: settings.alert_air_strike,
        alert_artillery: settings.alert_artillery,
        alert_conflict: settings.alert_conflict,
        alert_curfew: settings.alert_curfew
      })
      .eq('id', settings.id);

    setSaving(false);
    navigate('/settings');
  };

  const toggleAlert = (type: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [type]: !settings[type as keyof UserAlertSettings]
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full"
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
              <span className="text-xl font-bold">预警设置</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-red-500 rounded-lg font-medium text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
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
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            监控范围
          </h3>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">范围</span>
              <span className="text-red-400 font-semibold">{radius} km</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5km</span>
              <span>100km</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
        >
          <h3 className="font-semibold mb-4">预警类型</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-medium">空袭预警</p>
                  <p className="text-sm text-slate-400">导弹、无人机袭击</p>
                </div>
              </div>
              <button
                onClick={() => toggleAlert('alert_air_strike')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings?.alert_air_strike ? 'bg-red-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings?.alert_air_strike ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Bomb className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-medium">炮击预警</p>
                  <p className="text-sm text-slate-400">火炮、火箭炮</p>
                </div>
              </div>
              <button
                onClick={() => toggleAlert('alert_artillery')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings?.alert_artillery ? 'bg-red-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings?.alert_artillery ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Swords className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="font-medium">冲突预警</p>
                  <p className="text-sm text-slate-400">地面部队交火</p>
                </div>
              </div>
              <button
                onClick={() => toggleAlert('alert_conflict')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings?.alert_conflict ? 'bg-red-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings?.alert_conflict ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Moon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">宵禁提醒</p>
                  <p className="text-sm text-slate-400">当地宵禁时间</p>
                </div>
              </div>
              <button
                onClick={() => toggleAlert('alert_curfew')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings?.alert_curfew ? 'bg-red-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: settings?.alert_curfew ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
