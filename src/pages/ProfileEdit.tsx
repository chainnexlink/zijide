import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Camera,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

type Profile = Tables<'profiles'>;

const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'secret', label: '保密' }
];

export default function ProfileEdit() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    gender: '',
    birth_date: '',
    city: '',
    country: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setFormData({
        nickname: data.nickname || '',
        email: data.email || '',
        gender: data.gender || '',
        birth_date: data.birth_date || '',
        city: data.city || '',
        country: data.country || ''
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        nickname: formData.nickname,
        email: formData.email,
        gender: formData.gender,
        birth_date: formData.birth_date,
        city: formData.city,
        country: formData.country
      })
      .eq('id', user.id);

    setSaving(false);
    navigate('/settings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
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
              <span className="text-xl font-bold">个人资料</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 rounded-lg font-medium text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
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
          className="flex flex-col items-center mb-8"
        >
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center border-2 border-slate-800 hover:bg-slate-600 transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">昵称</label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="请输入昵称"
              className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">手机号</label>
            <input
              type="text"
              value={profile?.phone || ''}
              disabled
              className="w-full h-12 px-4 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">手机号不可修改</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">邮箱</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="请输入邮箱"
              className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">性别</label>
            <div className="flex gap-3">
              {genderOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormData({ ...formData, gender: option.value })}
                  className={`flex-1 h-12 rounded-xl font-medium transition-colors ${
                    formData.gender === option.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">生日</label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">所在城市</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="请输入所在城市"
              className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">国家/地区</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="请输入国家/地区"
              className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
