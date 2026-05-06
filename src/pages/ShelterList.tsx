import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  MapPin,
  Users,
  Navigation,
  Search,
  Filter,
  ChevronRight,
  Shield,
  Droplets,
  Zap,
  Stethoscope,
  Clock,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import { useGeolocation } from '../hooks/useGeolocation';
import { STATIC_SHELTERS } from '../data/shelters';
import type { Tables } from '../supabase/types';

type Shelter = Tables<'shelters'>;

interface ShelterWithDistance extends Shelter {
  distance?: number;
}

const getStatusConfig = (t: (key: string) => string) => ({
  open: { label: t('open') || '开放中', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  crowded: { label: t('crowded') || '拥挤', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  full: { label: t('full') || '已满', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  closed: { label: t('closed') || '已关闭', color: 'text-slate-400', bgColor: 'bg-slate-500/20' }
});

const getFacilityIcons = (t: (key: string) => string) => [
  { key: 'has_water', icon: Droplets, label: t('water') || '水', color: 'text-blue-400' },
  { key: 'has_electricity', icon: Zap, label: t('electricity') || '电', color: 'text-yellow-400' },
  { key: 'has_medical', icon: Stethoscope, label: t('medical') || '医', color: 'text-red-400' }
];

export default function ShelterList() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { location } = useGeolocation();
  const [shelters, setShelters] = useState<ShelterWithDistance[]>([]);
  const [filteredShelters, setFilteredShelters] = useState<ShelterWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(['open']);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'distance' | 'capacity' | 'occupancy'>('distance');

  useEffect(() => {
    fetchShelters();
  }, []);

  useEffect(() => {
    filterAndSortShelters();
  }, [shelters, searchQuery, selectedStatus, selectedFacilities, sortBy, location]);

  const fetchShelters = async () => {
    const { data } = await supabase
      .from('shelters')
      .select('*')
      .order('created_at', { ascending: false });

    const rawShelters: ShelterWithDistance[] = (data && data.length > 0) ? data : STATIC_SHELTERS.map(s => ({ ...s, description: s.description ?? null, is_verified: s.is_verified ?? null, manager_name: s.manager_name ?? null } as Shelter));

    const sheltersWithDistance = rawShelters.map(shelter => {
      if (location && shelter.latitude && shelter.longitude) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          shelter.latitude,
          shelter.longitude
        );
        return { ...shelter, distance };
      }
      return shelter;
    });
    setShelters(sheltersWithDistance);
    setLoading(false);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filterAndSortShelters = () => {
    let filtered = [...shelters];

    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedStatus.length > 0) {
      filtered = filtered.filter(s => selectedStatus.includes(s.status || 'closed'));
    }

    if (selectedFacilities.length > 0) {
      filtered = filtered.filter(s =>
        selectedFacilities.every(fac => s[fac as keyof Shelter])
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (a.distance || Infinity) - (b.distance || Infinity);
        case 'capacity':
          return (b.capacity || 0) - (a.capacity || 0);
        case 'occupancy':
          const aRate = a.capacity ? (a.current_occupancy || 0) / a.capacity : 0;
          const bRate = b.capacity ? (b.current_occupancy || 0) / b.capacity : 0;
          return aRate - bRate;
        default:
          return 0;
      }
    });

    setFilteredShelters(filtered);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleFacility = (facility: string) => {
    setSelectedFacilities(prev =>
      prev.includes(facility)
        ? prev.filter(f => f !== facility)
        : [...prev, facility]
    );
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">{t('nearbyShelter') || '附近避难所'}</span>
              </div>
            </div>
            <button
              onClick={() => setShowFilterModal(true)}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
            >
              <SlidersHorizontal className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchShelters') || '搜索避难所...'}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 mb-4 overflow-x-auto pb-2"
          >
            {Object.entries(getStatusConfig(t)).map(([status, config]) => (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedStatus.includes(status)
                    ? `${config.bgColor} ${config.color} border border-current`
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {config.label}
              </button>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4"
          >
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>{filteredShelters.length} {t('sheltersFound') || '个避难所'}</span>
              <div className="flex items-center gap-2">
                <span>{t('sortBy') || '排序'}:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-500/50"
                >
                  <option value="distance">{t('distance') || '距离'}</option>
                  <option value="capacity">{t('capacity') || '容量'}</option>
                  <option value="occupancy">{t('occupancy') || '空闲'}</option>
                </select>
              </div>
            </div>
          </motion.div>

          <div className="space-y-3">
            {filteredShelters.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Home className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400">{t('noShelters') || '暂无避难所'}</p>
              </motion.div>
            ) : (
              filteredShelters.map((shelter, index) => {
                const status = getStatusConfig(t)[(shelter.status || 'closed') as keyof ReturnType<typeof getStatusConfig>];
                const occupancyPercent = shelter.capacity
                  ? Math.round(((shelter.current_occupancy || 0) / shelter.capacity) * 100)
                  : 0;

                return (
                  <motion.div
                    key={shelter.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/shelter/${shelter.id}`)}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Shield className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{shelter.name}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-400 mb-2">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{shelter.address}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-300">{shelter.current_occupancy || 0}/{shelter.capacity || '-'}</span>
                          </div>
                          {shelter.distance && (
                            <div className="flex items-center gap-1 text-sm text-green-400">
                              <Navigation className="w-3.5 h-3.5" />
                              <span>{formatDistance(shelter.distance)}</span>
                            </div>
                          )}
                        </div>
                        {shelter.capacity && (
                          <div className="mt-2">
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  occupancyPercent > 90 ? 'bg-red-500' :
                                  occupancyPercent > 70 ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${occupancyPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {getFacilityIcons(t).map(({ key, icon: Icon, label, color }) => {
                            const hasFacility = shelter[key as keyof Shelter];
                            return hasFacility ? (
                              <div key={key} className={`flex items-center gap-1 text-xs ${color}`}>
                                <Icon className="w-3 h-3" />
                                <span>{label}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{t('filter') || '筛选'}</h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <h4 className="font-medium mb-3">{t('status') || '状态'}</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(getStatusConfig(t)).map(([status, config]) => (
                    <button
                      key={status}
                      onClick={() => toggleStatus(status)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedStatus.includes(status)
                          ? `${config.bgColor} ${config.color} border border-current`
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium mb-3">{t('facilities') || '设施'}</h4>
                <div className="flex flex-wrap gap-2">
                  {getFacilityIcons(t).map(({ key, icon: Icon, label, color }) => (
                    <button
                      key={key}
                      onClick={() => toggleFacility(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedFacilities.includes(key)
                          ? 'bg-slate-700 text-white border border-slate-600'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${selectedFacilities.includes(key) ? color : ''}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedStatus(['open']);
                    setSelectedFacilities([]);
                  }}
                  className="flex-1 h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {t('reset') || '重置'}
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold text-white"
                >
                  {t('apply') || '应用'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white"
            >
              <Home className="w-6 h-6" />
              <span className="text-xs">{t('home')}</span>
            </button>
            <button
              onClick={() => navigate('/route-plan')}
              className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white"
            >
              <Navigation className="w-6 h-6" />
              <span className="text-xs">{t('route') || '路线'}</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex flex-col items-center gap-1 p-2 -mt-4"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                <Shield className="w-7 h-7 text-white" />
              </div>
            </button>
            <button
              onClick={() => navigate('/family-settings')}
              className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white"
            >
              <Users className="w-6 h-6" />
              <span className="text-xs">{t('family')}</span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white"
            >
              <SlidersHorizontal className="w-6 h-6" />
              <span className="text-xs">{t('settings')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
