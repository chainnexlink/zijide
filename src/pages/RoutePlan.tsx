import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Navigation,
  MapPin,
  Clock,
  Shield,
  AlertTriangle,
  Zap,
  Car,
  Footprints,
  ChevronRight,
  Home,
  Users,
  Siren,
  SlidersHorizontal,
  Search,
  X,
  Flag,
  RotateCcw,
  Volume2,
  VolumeX,
  Share2
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionGate from '../components/SubscriptionGate';
import { STATIC_SHELTERS } from '../data/shelters';
import WarMap, { getShelterMarkerType, MapMarker, fetchDirections } from '../components/WarMap';
import type { Tables } from '../supabase/types';

type Shelter = Tables<'shelters'>;

interface RouteOption {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  time: string;
  distance: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface RouteStep {
  id: number;
  instruction: string;
  distance: string;
  type: 'straight' | 'turn-left' | 'turn-right' | 'arrive' | 'alert' | 'shelter';
  coordinates?: { lat: number; lng: number };
}

export default function RoutePlan() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { location } = useGeolocation();
  const { canAccessFeature, loading: subLoading } = useSubscription();

  if (!subLoading && !canAccessFeature('escape_route')) {
    return <SubscriptionGate feature="escape_route"><></></SubscriptionGate>;
  }

  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('fastest');
  const [destination, setDestination] = useState('');
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showShelterSelector, setShowShelterSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [routeData, setRouteData] = useState<{ distance: number; duration: number } | null>(null);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [computedSteps, setComputedSteps] = useState<RouteStep[]>([]);

  useEffect(() => {
    fetchShelters();
  }, []);

  const fetchShelters = async () => {
    const { data } = await supabase
      .from('shelters')
      .select('*')
      .eq('status', 'open')
      .limit(20);
    setShelters((data && data.length > 0) ? data : STATIC_SHELTERS.filter(s => s.status === 'open').slice(0, 20) as any);
  };

  // Google Directions route calculation
  const calcRoute = async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    setRouteLoading(true);
    try {
      const mode = selectedRoute === 'shortest' ? 'WALKING' as const : 'DRIVING' as const;
      const result = await fetchDirections(
        { lat: fromLat, lng: fromLng },
        { lat: toLat, lng: toLng },
        mode,
      );
      if (result) {
        setDirectionsResult(result.result);
        setRouteData({ distance: result.distance, duration: result.duration });
        // Convert Google steps to our RouteStep format
        const gSteps: RouteStep[] = result.steps.map((s: any, i: number) => ({
          id: i + 1,
          instruction: s.instructions?.replace(/<[^>]*>/g, '') || '继续前行',
          distance: s.distance?.text || '',
          type: mapGoogleManeuver(s.maneuver),
          coordinates: s.start_location ? { lat: s.start_location.lat(), lng: s.start_location.lng() } : undefined,
        }));
        setComputedSteps(gSteps);
      }
    } catch (e) {
      console.error('Google Directions failed:', e);
    } finally {
      setRouteLoading(false);
    }
  };

  const mapGoogleManeuver = (maneuver: string): RouteStep['type'] => {
    if (!maneuver) return 'straight';
    if (maneuver.includes('left')) return 'turn-left';
    if (maneuver.includes('right')) return 'turn-right';
    if (maneuver === 'arrive' || maneuver === 'destination') return 'arrive';
    return 'straight';
  };

  useEffect(() => {
    if (selectedShelter && location) {
      calcRoute(location.latitude, location.longitude, Number(selectedShelter.latitude), Number(selectedShelter.longitude));
    }
  }, [selectedShelter, selectedRoute]);

  const fmtDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)}公里` : `${Math.round(m)}米`;
  const fmtTime = (s: number) => s >= 3600 ? `${Math.floor(s / 3600)}小时${Math.round((s % 3600) / 60)}分钟` : `${Math.round(s / 60)}分钟`;

  const routeOptions: RouteOption[] = [
    {
      id: 'fastest',
      label: t('fastestRoute') || '最快路线',
      icon: Zap,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      time: routeData ? fmtTime(routeData.duration) : '--',
      distance: routeData ? fmtDist(routeData.distance) : '--',
      description: t('fastestDesc') || '优先选择主干道，速度最快',
      riskLevel: 'medium'
    },
    {
      id: 'safest',
      label: t('safestRoute') || '最安全路线',
      icon: Shield,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      time: routeData ? fmtTime(routeData.duration * 1.4) : '--',
      distance: routeData ? fmtDist(routeData.distance * 1.25) : '--',
      description: t('safestDesc') || '避开危险区域，安全性最高',
      riskLevel: 'low'
    },
    {
      id: 'shortest',
      label: t('shortestRoute') || '最短距离',
      icon: Footprints,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      time: routeData ? fmtTime(routeData.duration * 1.2) : '--',
      distance: routeData ? fmtDist(routeData.distance * 0.85) : '--',
      description: t('shortestDesc') || '距离最短，可能经过小巷',
      riskLevel: 'high'
    }
  ];

  // Use OSRM computed steps if available, otherwise fallback
  const routeSteps: RouteStep[] = computedSteps.length > 0 ? computedSteps : [
    { id: 1, instruction: '选择避难所后自动计算路线', distance: '-', type: 'straight' },
  ];

  // Build map markers
  const mapMarkers: MapMarker[] = shelters.slice(0, 10).map(s => ({
    id: s.id,
    lat: Number(s.latitude),
    lng: Number(s.longitude),
    type: getShelterMarkerType(s.status || 'open'),
    popup: `<b>${s.name}</b><br/>${s.address || ''}<br/>容量: ${s.capacity || '-'}`,
  }));

  const mapCenter = location
    ? { lat: location.latitude, lng: location.longitude }
    : selectedShelter
    ? { lat: Number(selectedShelter.latitude), lng: Number(selectedShelter.longitude) }
    : { lat: 33.5, lng: 36.3 };

  const handleStartNavigation = () => {
    if (destination || selectedShelter) {
      setShowRouteDetails(true);
      setIsNavigating(true);
    }
  };

  const handleSelectShelter = (shelter: Shelter) => {
    setSelectedShelter(shelter);
    setDestination(shelter.name || '');
    setShowShelterSelector(false);
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'turn-left': return <div className="transform -rotate-90"><Navigation className="w-5 h-5" /></div>;
      case 'turn-right': return <div className="transform rotate-90"><Navigation className="w-5 h-5" /></div>;
      case 'arrive': return <Flag className="w-5 h-5 text-green-400" />;
      case 'alert': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'shelter': return <Home className="w-5 h-5 text-blue-400" />;
      default: return <Navigation className="w-5 h-5" />;
    }
  };

  const filteredShelters = shelters.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRouteOption = routeOptions.find(r => r.id === selectedRoute);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
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
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">{t('escapeRoute') || '逃生路线'}</span>
              </div>
            </div>
            {isNavigating && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsNavigating(false)}
                  className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {!isNavigating ? (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={t('enterDestination') || '输入目的地或选择避难所'}
                    className="flex-1 h-12 bg-transparent text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={() => setShowShelterSelector(true)}
                    className="px-4 py-2 bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                  >
                    {t('selectShelter') || '选择'}
                  </button>
                </div>

                {selectedShelter && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl"
                  >
                    <Home className="w-5 h-5 text-green-400" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedShelter.name}</p>
                      <p className="text-xs text-slate-400">{selectedShelter.address}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedShelter(null); setDestination(''); }}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div className="relative h-64 sm:h-80 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                <WarMap
                  center={mapCenter}
                  zoom={selectedShelter ? 13 : 10}
                  markers={mapMarkers}
                  directionsResult={directionsResult}
                  userLocation={location}
                  fitMarkers={!!directionsResult}
                />
                {routeLoading && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      计算路线中...
                    </div>
                  </div>
                )}
                {routeData && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-white font-medium">
                        <Navigation className="w-4 h-4 text-blue-400" />
                        {fmtDist(routeData.distance)}
                      </span>
                      <span className="flex items-center gap-1 text-white font-medium">
                        <Clock className="w-4 h-4 text-green-400" />
                        {fmtTime(routeData.duration)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <h3 className="font-semibold mb-3">{t('routeOptions') || '路线选项'}</h3>
              <div className="space-y-3">
                {routeOptions.map((route) => {
                  const Icon = route.icon;
                  const isSelected = selectedRoute === route.id;
                  return (
                    <motion.button
                      key={route.id}
                      onClick={() => setSelectedRoute(route.id)}
                      className={`w-full p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/50'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected ? route.bgColor : 'bg-slate-800'
                        }`}>
                          <Icon className={`w-6 h-6 ${isSelected ? route.color : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{route.label}</span>
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                {t('recommended') || '推荐'}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              route.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                              route.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {route.riskLevel === 'low' ? t('lowRisk') || '低风险' :
                               route.riskLevel === 'medium' ? t('mediumRisk') || '中风险' :
                               t('highRisk') || '高风险'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mt-1">{route.description}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {route.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <Navigation className="w-4 h-4" />
                              {route.distance}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={handleStartNavigation}
                disabled={!destination}
                className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Navigation className="w-5 h-5" />
                {t('startNavigation') || '开始导航'}
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                    {getStepIcon(routeSteps[currentStep].type)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{routeSteps[currentStep].instruction}</h2>
                    <p className="text-slate-400">{routeSteps[currentStep].distance}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                  <span>{t('step') || '步骤'} {currentStep + 1} / {routeSteps.length}</span>
                  <span>{selectedRouteOption?.time} · {selectedRouteOption?.distance}</span>
                </div>

                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / routeSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6"
            >
              <h3 className="font-semibold mb-3">{t('routeDetails') || '路线详情'}</h3>
              <div className="space-y-2">
                {routeSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      index === currentStep
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : index < currentStep
                        ? 'bg-slate-800/30 opacity-50'
                        : 'bg-slate-800/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      index === currentStep ? 'bg-blue-500/30' : 'bg-slate-700'
                    }`}>
                      {getStepIcon(step.type)}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${index === currentStep ? 'text-blue-400' : ''}`}>
                        {step.instruction}
                      </p>
                      <p className="text-xs text-slate-400">{step.distance}</p>
                    </div>
                    {index < currentStep && (
                      <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsNavigating(false)}
                className="flex-1 h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                {t('pause') || '暂停'}
              </button>
              <button
                onClick={() => { setCurrentStep(0); setIsNavigating(false); }}
                className="flex-1 h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t('restart') || '重新开始'}
              </button>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showShelterSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80"
            onClick={() => setShowShelterSelector(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{t('selectShelter') || '选择避难所'}</h3>
                  <button
                    onClick={() => setShowShelterSelector(false)}
                    className="p-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchShelters') || '搜索避难所...'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
                {filteredShelters.map((shelter) => (
                  <button
                    key={shelter.id}
                    onClick={() => handleSelectShelter(shelter)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <Home className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{shelter.name}</p>
                      <p className="text-sm text-slate-400 truncate">{shelter.address}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </button>
                ))}
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
              onClick={() => navigate('/shelters')}
              className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white"
            >
              <Shield className="w-6 h-6" />
              <span className="text-xs">{t('shelters') || '避难所'}</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex flex-col items-center gap-1 p-2 -mt-4"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                <Siren className="w-7 h-7 text-white" />
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
