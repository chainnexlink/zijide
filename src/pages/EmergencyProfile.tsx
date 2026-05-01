import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  User,
  Pill,
  FileText,
  Phone,
  Loader2
} from 'lucide-react';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

type Profile = Tables<'profiles'>;

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

export default function EmergencyProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    blood_type: '',
    allergies: '',
    medical_history: '',
    current_medication: '',
    medical_notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: ''
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
        blood_type: data.blood_type || 'unknown',
        allergies: data.allergies || '',
        medical_history: data.medical_history || '',
        current_medication: data.current_medication || '',
        medical_notes: data.medical_notes || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        emergency_contact_relation: data.emergency_contact_relation || ''
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
        blood_type: formData.blood_type,
        allergies: formData.allergies,
        medical_history: formData.medical_history,
        current_medication: formData.current_medication,
        medical_notes: formData.medical_notes,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relation: formData.emergency_contact_relation
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
          className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full"
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
              <span className="text-xl font-bold">紧急医疗资料</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-rose-500 rounded-lg font-medium text-sm hover:bg-rose-600 transition-colors disabled:opacity-50"
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
          className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6"
        >
          <p className="text-sm text-rose-300 flex items-start gap-2">
            <Heart className="w-4 h-4 mt-0.5 flex-shrink-0" />
            这些信息将在紧急情况下提供给救援人员，帮助他们更好地为您提供救助。
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-rose-400" />
            基本信息
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">血型</label>
            <div className="grid grid-cols-5 gap-2">
              {bloodTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFormData({ ...formData, blood_type: type })}
                  className={`h-10 rounded-lg font-medium text-sm transition-colors ${
                    formData.blood_type === type
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type === 'unknown' ? '未知' : type}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-rose-400" />
            医疗信息
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">过敏史</label>
              <textarea
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="请输入过敏史（如药物过敏、食物过敏等）"
                rows={3}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-rose-500 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">病史</label>
              <textarea
                value={formData.medical_history}
                onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                placeholder="请输入既往病史"
                rows={3}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-rose-500 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">当前用药</label>
              <textarea
                value={formData.current_medication}
                onChange={(e) => setFormData({ ...formData, current_medication: e.target.value })}
                placeholder="请输入当前正在使用的药物"
                rows={3}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-rose-500 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">医疗备注</label>
              <textarea
                value={formData.medical_notes}
                onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                placeholder="其他需要救援人员了解的信息"
                rows={3}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-rose-500 focus:outline-none resize-none"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-rose-400" />
            紧急联系人
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">姓名</label>
              <input
                type="text"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                placeholder="请输入紧急联系人姓名"
                className="w-full h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">电话</label>
              <input
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                placeholder="请输入紧急联系人电话"
                className="w-full h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">关系</label>
              <input
                type="text"
                value={formData.emergency_contact_relation}
                onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                placeholder="如：配偶、父母、子女"
                className="w-full h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
