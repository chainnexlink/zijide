import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Navigation,
  MapPin,
  Clock,
  Footprints,
  Car,
  AlertTriangle,
  Shield,
  Volume2,
  VolumeX,
  RotateCcw,
  Flag,
  ChevronRight,
  X,
  Phone,
  Siren
} from 'lucide-react';
import { useI18n } from '../hooks/useI18n';
import { useGeolocation } from '../hooks/useGeolocation';
import WarMap, { fetchDirections } from '../components/WarMap';

interface NavigationStep {
  id: number;
  instruction: string;
  distance: string;
  duration: string;
  type: 'straight' | 'turn-left' | 'turn-right' | 'arrive' | 'alert';
  coordinates?: { lat: number; lng: number };
}

export default function NavigationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const { location, startWatching, stopWatching, calculateDistance } = useGeolocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remainingDistance, setRemainingDistance] = useState('--');
  const [remainingTime, setRemainingTime] = useState('--');
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [navSteps, setNavSteps] = useState<NavigationStep[]>([]);
  const [routeReady, setRouteReady] = useState(false);

  const destination = {
    name: searchParams.get('name') || '避难所',
    address: searchParams.get('address') || '目标地址',
    lat: parseFloat(searchParams.get('lat') || '0'),
    lng: parseFloat(searchParams.get('lng') || '0')
  };

  // Fetch route on mount
  useEffect(() => {
    startWatching();
    return () => stopWatching();
  }, []);

  useEffect(() => {
    if (location && destination.lat !== 0 && !routeReady) {
      fetchDirections(
        { lat: location.latitude, lng: location.longitude },
        { lat: destination.lat, lng: destination.lng },
        'DRIVING',
      ).then(result => {
        if (result) {
          setDirectionsResult(result.result);
          setRemainingDistance(result.distance >= 1000 ? `${(result.distance / 1000).toFixed(1)} km` : `${result.distance} m`);
          setRemainingTime(result.duration >= 3600
            ? `${Math.floor(result.duration / 3600)}h ${Math.round((result.duration % 3600) / 60)}min`
            : `${Math.round(result.duration / 60)} 分钟`);
          const steps: NavigationStep[] = result.steps.map((s: any, i: number) => ({
            id: i + 1,
            instruction: s.instructions?.replace(/<[^>]*>/g, '') || '继续前行',
            distance: s.distance?.text || '',
            duration: s.duration?.text || '',
            type: mapGoogleManeuver(s.maneuver),
            coordinates: s.start_location ? { lat: s.start_location.lat(), lng: s.start_location.lng() } : undefined,
          }));
          setNavSteps(steps);
          setRouteReady(true);
        }
      });
    }
  }, [location, destination.lat]);

  const mapGoogleManeuver = (maneuver: string): NavigationStep['type'] => {
    if (!maneuver) return 'straight';
    if (maneuver.includes('left')) return 'turn-left';
    if (maneuver.includes('right')) return 'turn-right';
    return 'straight';
  };

  // Real position tracking: advance step when close to next step's coordinates
  useEffect(() => {
    if (!isNavigating || !location || navSteps.length === 0) return;
    const nextStep = navSteps[currentStep + 1];
    if (nextStep?.coordinates) {
      const dist = calculateDistance(location.latitude, location.longitude, nextStep.coordinates.lat, nextStep.coordinates.lng);
      if (dist < 0.03) { // within 30 meters
        if (currentStep + 1 >= navSteps.length - 1) {
          setShowArrivalModal(true);
          setIsNavigating(false);
        } else {
          setCurrentStep(prev => prev + 1);
        }
      }
    }
  }, [location, isNavigating, currentStep, navSteps]);

  const getNavigationSteps = (): NavigationStep[] => navSteps.length > 0 ? navSteps : [
    { id: 1, instruction: '正在加载路线...', distance: '--', duration: '--', type: 'straight' },
  ];

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'turn-left': return <div className="transform -rotate-90"><Navigation className="w-6 h-6" /></div>;
      case 'turn-right': return <div className="transform rotate-90"><Navigation className="w-6 h-6" /></div>;
      case 'arrive': return <Flag className="w-6 h-6 text-green-400" />;
      case 'alert': return <AlertTriangle className="w-6 h-6 text-red-400" />;
      default: return <Navigation className="w-6 h-6" />;
    }
  };

  const handleArrivalConfirm = () => {
    setShowArrivalModal(false);
    navigate('/dashboard');
  };

  const handleSOS = () => {
    setShowSOSModal(false);
    navigate('/sos-history');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="font-bold">{t('navigation') || '导航'}</h1>
                <p className="text-xs text-slate-400">{destination.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowSOSModal(true)}
                className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <Siren className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <div className="relative h-96 bg-slate-900 overflow-hidden">
          <WarMap
            center={location ? { lat: location.latitude, lng: location.longitude } : { lat: destination.lat, lng: destination.lng }}
            zoom={15}
            directionsResult={directionsResult}
            userLocation={location}
            showTraffic={true}
          />
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur rounded-xl p-3 border border-slate-700">
            <div className="flex items-center gap-2 text-sm">
              <Footprints className="w-4 h-4 text-blue-400" />
              <span>{remainingDistance}</span>
              <span className="text-slate-500">·</span>
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{remainingTime}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {!isNavigating ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center">
                  <Shield className="w-7 h-7 text-green-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">{destination.name}</h2>
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span>{destination.address}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <Footprints className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                  <p className="text-lg font-bold">{remainingDistance}</p>
                  <p className="text-xs text-slate-400">{t('distance')}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <p className="text-lg font-bold">{remainingTime}</p>
                  <p className="text-xs text-slate-400">{t('duration')}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <Car className="w-5 h-5 mx-auto mb-1 text-green-400" />
                  <p className="text-lg font-bold">步行</p>
                  <p className="text-xs text-slate-400">{t('mode')}</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
              </div>

              <button
                onClick={() => setIsNavigating(true)}
                className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/30 transition-all"
              >
                <Navigation className="w-5 h-5" />
                {t('startNavigation') || '开始导航'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                      {getStepIcon(getNavigationSteps()[currentStep].type)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{getNavigationSteps()[currentStep].instruction}</h2>
                      <p className="text-slate-400">{getNavigationSteps()[currentStep].distance}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                  <span>{t('step') || '步骤'} {currentStep + 1} / {getNavigationSteps().length}</span>
                  <span>{remainingDistance} · {remainingTime}</span>
                </div>

                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / getNavigationSteps().length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h3 className="font-semibold mb-3">{t('routeDetails') || '路线详情'}</h3>
                <div className="space-y-3">
                  {getNavigationSteps().map((step, index) => (
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
                        <p className="text-xs text-slate-400">{step.distance} · {step.duration}</p>
                      </div>
                      {index < currentStep && (
                        <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsNavigating(false)}
                  className="flex-1 h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {t('pause') || '暂停'}
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(0);
                    setIsNavigating(false);
                  }}
                  className="flex-1 h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('restart') || '重新开始'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showArrivalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                <Flag className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{t('arrived') || '已到达'}</h3>
              <p className="text-slate-400 mb-6">您已安全到达 {destination.name}</p>
              <div className="space-y-3">
                <button
                  onClick={handleArrivalConfirm}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold text-white"
                >
                  {t('confirm') || '确认'}
                </button>
                <button
                  onClick={() => setShowArrivalModal(false)}
                  className="w-full h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {t('continue') || '继续'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Siren className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t('confirmSOS') || '确认发送SOS'}</h3>
                <p className="text-slate-400 text-sm">{t('sosWarning') || '这将通知您的家人和附近的志愿者'}</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleSOS}
                  className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-red-500/30 transition-all"
                >
                  {t('confirm') || '确认'}
                </button>
                <button
                  onClick={() => setShowSOSModal(false)}
                  className="w-full h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {t('cancel') || '取消'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
