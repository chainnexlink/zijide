import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bell,
  Users,
  MapPin,
  Shield,
  Siren,
  HeartHandshake,
  ChevronDown,
  Menu,
  X,
  Globe,
  ArrowRight,
  Check,
  Smartphone,
  MessageSquare,
  FileText,
  Newspaper,
  Map,
  Wifi,
  Zap,
  Rocket,
  Gift,
  Megaphone
} from 'lucide-react';
import { useI18n } from '../hooks/useI18n';
import { supabase } from '../supabase/client';

const features = [
  {
    icon: Bell,
    titleKey: 'alerts',
    descriptionKey: 'realtimeAlertDesc',
    color: 'from-red-500 to-orange-500'
  },
  {
    icon: Users,
    titleKey: 'family',
    descriptionKey: 'familyTrackingDesc',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: MapPin,
    titleKey: 'route',
    descriptionKey: 'escapeRouteDesc',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: Shield,
    titleKey: 'shelters',
    descriptionKey: 'shelterDesc',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: Siren,
    titleKey: 'sos',
    descriptionKey: 'sosDesc',
    color: 'from-rose-500 to-red-600'
  },
  {
    icon: HeartHandshake,
    titleKey: 'mutualAid',
    descriptionKey: 'mutualAidDesc',
    color: 'from-amber-500 to-yellow-500'
  }
];

const supportedCountries: Record<string, string[]> = {
  zh: ['乌克兰政府控制区（基辅、利沃夫、敖德萨等）', '以色列', '阿联酋', '科威特', '巴林', '约旦', '海地', '尼日利亚'],
  en: ['Ukraine (Gov. controlled: Kyiv, Lviv, Odesa, etc.)', 'Israel', 'UAE', 'Kuwait', 'Bahrain', 'Jordan', 'Haiti', 'Nigeria'],
  ru: ['Украина (подконтр. прав-ву: Киев, Львов, Одесса и др.)', 'Израиль', 'ОАЭ', 'Кувейт', 'Бахрейн', 'Иордания', 'Гаити', 'Нигерия'],
  ar: ['أوكرانيا (المناطق الحكومية: كييف، لفيف، أوديسا، إلخ)', 'إسرائيل', 'الإمارات', 'الكويت', 'البحرين', 'الأردن', 'هايتي', 'نيجيريا'],
  es: ['Ucrania (zona gob.: Kiev, Leópolis, Odesa, etc.)', 'Israel', 'EAU', 'Kuwait', 'Baréin', 'Jordania', 'Haití', 'Nigeria'],
  fr: ['Ukraine (zone gouv.: Kyiv, Lviv, Odessa, etc.)', 'Israël', 'EAU', 'Koweït', 'Bahreïn', 'Jordanie', 'Haïti', 'Nigeria'],
  pt: ['Ucrânia (zona gov.: Kiev, Lviv, Odessa, etc.)', 'Israel', 'EAU', 'Kuwait', 'Bahrein', 'Jordânia', 'Haiti', 'Nigéria'],
  de: ['Ukraine (Reg.-kontrolliert: Kiew, Lwiw, Odessa usw.)', 'Israel', 'VAE', 'Kuwait', 'Bahrain', 'Jordanien', 'Haiti', 'Nigeria'],
  tr: ['Ukrayna (Hük. kontrolü: Kyiv, Lviv, Odesa vb.)', 'İsrail', 'BAE', 'Kuveyt', 'Bahreyn', 'Ürdün', 'Haiti', 'Nijerya']
};

const featureDescriptions: Record<string, Record<string, string>> = {
  zh: {
    realtimeAlertDesc: 'AI驱动的智能预警系统，第一时间推送战区安全警报',
    familyTrackingDesc: '实时追踪家人位置，一键确认安全状态',
    escapeRouteDesc: '智能规划最优逃生路线，避开危险区域',
    shelterDesc: '实时显示周边避难所位置和容纳情况',
    sosDesc: '紧急情况下快速求救，自动通知家人和救援组织',
    mutualAidDesc: '订阅附近SOS预警，与平台救援并行执行'
  },
  en: {
    realtimeAlertDesc: 'AI-powered alert system, delivering war zone safety alerts in real-time',
    familyTrackingDesc: 'Track family locations in real-time, confirm safety status with one click',
    escapeRouteDesc: 'Smart route planning to avoid danger zones',
    shelterDesc: 'Real-time shelter locations and capacity info',
    sosDesc: 'Quick emergency SOS, automatically notify family and rescue',
    mutualAidDesc: 'Subscribe to nearby SOS alerts, parallel rescue with platform'
  },
  ru: {
    realtimeAlertDesc: 'ИИ-система оповещений, мгновенная доставка предупреждений',
    familyTrackingDesc: 'Отслеживание местоположения семьи в реальном времени',
    escapeRouteDesc: 'Умное планирование маршрутов для избегания опасных зон',
    shelterDesc: 'Информация о укрытиях и их загруженности',
    sosDesc: 'Быстрый SOS, автоматическое уведомление семьи и спасателей',
    mutualAidDesc: 'Подписка на SOS поблизости, параллельное спасение'
  },
  ar: {
    realtimeAlertDesc: 'نظام تنبيه مدعوم بالذكاء الاصطناعي، تنبيهات فورية',
    familyTrackingDesc: 'تتبع مواقع العائلة في الوقت الفعلي',
    escapeRouteDesc: 'تخطيط ذكي للطرق لتجنب المناطق الخطرة',
    shelterDesc: 'مواقع الملاجئ والسعة في الوقت الفعلي',
    sosDesc: 'SOS سريع، إخطار العائلة والإنقاذ تلقائياً',
    mutualAidDesc: 'الاشتراك في SOS القريب، إنقاذ متوازي'
  },
  es: {
    realtimeAlertDesc: 'Sistema de alertas con IA, entrega inmediata de alertas',
    familyTrackingDesc: 'Seguimiento de ubicación familiar en tiempo real',
    escapeRouteDesc: 'Planificación inteligente de rutas para evitar zonas peligrosas',
    shelterDesc: 'Ubicaciones de refugios y capacidad en tiempo real',
    sosDesc: 'SOS rápido, notificación automática a familia y rescate',
    mutualAidDesc: 'Suscripción a SOS cercano, rescate paralelo'
  },
  fr: {
    realtimeAlertDesc: 'Système d\'alertes IA, livraison immédiate des alertes',
    familyTrackingDesc: 'Suivi de localisation familiale en temps réel',
    escapeRouteDesc: 'Planification intelligente d\'itinéraires pour éviter les zones dangereuses',
    shelterDesc: 'Emplacements des abris et capacité en temps réel',
    sosDesc: 'SOS rapide, notification automatique famille et secours',
    mutualAidDesc: 'Abonnement SOS proche, secours parallèle'
  },
  pt: {
    realtimeAlertDesc: 'Sistema de alertas com IA, entrega imediata de alertas',
    familyTrackingDesc: 'Rastreamento de localização familiar em tempo real',
    escapeRouteDesc: 'Planejamento inteligente de rotas para evitar zonas perigosas',
    shelterDesc: 'Localizações de abrigos e capacidade em tempo real',
    sosDesc: 'SOS rápido, notificação automática para família e resgate',
    mutualAidDesc: 'Inscrição em SOS próximo, resgate paralelo'
  },
  de: {
    realtimeAlertDesc: 'KI-gestütztes Alarmsystem, sofortige Zustellung von Warnungen',
    familyTrackingDesc: 'Echtzeit-Standortverfolgung der Familie',
    escapeRouteDesc: 'Intelligente Routenplanung zur Vermeidung gefährlicher Zonen',
    shelterDesc: 'Echtzeit-Informationen über Schutzräume und Kapazität',
    sosDesc: 'Schnelles SOS, automatische Benachrichtigung von Familie und Rettung',
    mutualAidDesc: 'Abonnement für SOS in der Nähe, parallele Rettung'
  },
  tr: {
    realtimeAlertDesc: 'Yapay zeka destekli uyarı sistemi, anında uyarı teslimi',
    familyTrackingDesc: 'Aile konumunu gerçek zamanlı takip',
    escapeRouteDesc: 'Tehlikeli bölgelerden kaçınmak için akıllı rota planlama',
    shelterDesc: 'Gerçek zamanlı sığınak konumları ve kapasite bilgisi',
    sosDesc: 'Hızlı SOS, aile ve kurtarmaya otomatik bildirim',
    mutualAidDesc: 'Yakındaki SOS aboneliği, paralel kurtarma'
  }
};

const sectionTitles: Record<string, Record<string, string>> = {
  zh: { features: '核心功能', countries: '支持的国家和地区', cta: '准备好开始了吗?', footer: '隐私政策', workflow: '工作流程', pricing: '定价方案', faq: '常见问题' },
  en: { features: 'Core Features', countries: 'Supported Countries', cta: 'Ready to Start?', footer: 'Privacy Policy', workflow: 'How It Works', pricing: 'Pricing', faq: 'FAQ' },
  ru: { features: 'Основные функции', countries: 'Поддерживаемые страны', cta: 'Готовы начать?', footer: 'Политика конфиденциальности', workflow: 'Как это работает', pricing: 'Цены', faq: 'Частые вопросы' },
  ar: { features: 'الميزات الأساسية', countries: 'البلدان المدعومة', cta: 'مستعد للبدء؟', footer: 'سياسة الخصوصية', workflow: 'كيف يعمل', pricing: 'التسعير', faq: 'الأسئلة الشائعة' },
  es: { features: 'Funciones principales', countries: 'Países admitidos', cta: '¿Listo para comenzar?', footer: 'Política de privacidad', workflow: 'Cómo funciona', pricing: 'Precios', faq: 'Preguntas frecuentes' },
  fr: { features: 'Fonctionnalités clés', countries: 'Pays pris en charge', cta: 'Prêt à commencer?', footer: 'Politique de confidentialité', workflow: 'Comment ça marche', pricing: 'Tarifs', faq: 'FAQ' },
  pt: { features: 'Recursos principais', countries: 'Países suportados', cta: 'Pronto para começar?', footer: 'Política de privacidade', workflow: 'Como funciona', pricing: 'Preços', faq: 'Perguntas frequentes' },
  de: { features: 'Kernfunktionen', countries: 'Unterstützte Länder', cta: 'Bereit zu starten?', footer: 'Datenschutzrichtlinie', workflow: 'So funktioniert es', pricing: 'Preise', faq: 'FAQ' },
  tr: { features: 'Temel Özellikler', countries: 'Desteklenen Ülkeler', cta: 'Başlamaya hazır mısınız?', footer: 'Gizlilik Politikası', workflow: 'Nasıl Çalışır', pricing: 'Fiyatlandırma', faq: 'SSS' }
};

const announcementLabels: Record<string, { title: string; empty: string; timeAgo: (d: string) => string }> = {
  zh: { title: '最新公告', empty: '暂无公告', timeAgo: (d) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? '刚刚' : h < 24 ? `${h}小时前` : `${Math.floor(h / 24)}天前`; } },
  en: { title: 'Announcements', empty: 'No announcements', timeAgo: (d) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? 'Just now' : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`; } },
  ru: { title: 'Объявления', empty: 'Нет объявлений', timeAgo: (d) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? 'Только что' : h < 24 ? `${h}ч назад` : `${Math.floor(h / 24)}д назад`; } },
  ar: { title: 'الإعلانات', empty: 'لا إعلانات', timeAgo: (d) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? 'الآن' : h < 24 ? `منذ ${h} ساعة` : `منذ ${Math.floor(h / 24)} يوم`; } },
  es: { title: 'Anuncios', empty: 'Sin anuncios', timeAgo: (d) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? 'Ahora' : h < 24 ? `Hace ${h}h` : `Hace ${Math.floor(h / 24)}d`; } },
  fr: { title: 'Annonces', empty: 'Aucune annonce', timeAgo: (d) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? "A l'instant" : h < 24 ? `Il y a ${h}h` : `Il y a ${Math.floor(h / 24)}j`; } },
  pt: { title: 'Anuncios', empty: 'Sem anuncios', timeAgo: (d) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? 'Agora' : h < 24 ? `${h}h atras` : `${Math.floor(h / 24)}d atras`; } },
  de: { title: 'Ankündigungen', empty: 'Keine Ankündigungen', timeAgo: (d) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? 'Gerade' : h < 24 ? `Vor ${h}h` : `Vor ${Math.floor(h / 24)}T`; } },
  tr: { title: 'Duyurular', empty: 'Duyuru yok', timeAgo: (d) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000); return h < 1 ? 'Simdi' : h < 24 ? `${h}sa once` : `${Math.floor(h / 24)}g once`; } },
};

const workflowSteps: Record<string, Array<{step: number, title: string, desc: string}>> = {
  zh: [
    { step: 1, title: '注册账号', desc: '邮箱注册，选择所在战区城市，开启GPS定位授权' },
    { step: 2, title: '添加家人', desc: '邀请家人加入家庭组，互相可见安全状态和位置' },
    { step: 3, title: '下载离线地图', desc: '预缓存所在城市地图数据，确保断网时也能导航' },
    { step: 4, title: '全天候守护', desc: 'AI后台持续监控，有预警立即推送。你只管正常生活' }
  ],
  en: [
    { step: 1, title: 'Register', desc: 'Email registration, select your war zone city, enable GPS location' },
    { step: 2, title: 'Add Family', desc: 'Invite family members to join, share safety status and location' },
    { step: 3, title: 'Download Offline Maps', desc: 'Pre-cache city maps for offline navigation' },
    { step: 4, title: '24/7 Protection', desc: 'AI monitors continuously, alerts pushed immediately' }
  ],
  ru: [
    { step: 1, title: 'Регистрация', desc: 'Регистрация по email, выбор города, включение GPS' },
    { step: 2, title: 'Добавить семью', desc: 'Пригласить семью, делиться статусом и местоположением' },
    { step: 3, title: 'Скачать карты', desc: 'Предварительное кэширование карт для офлайн-навигации' },
    { step: 4, title: 'Круглосуточная защита', desc: 'AI непрерывно мониторит, мгновенные уведомления' }
  ],
  ar: [
    { step: 1, title: 'التسجيل', desc: 'التسجيل بالبريد، اختيار المدينة، تفعيل GPS' },
    { step: 2, title: 'إضافة العائلة', desc: 'دعوة العائلة، مشكة الحالة والموقع' },
    { step: 3, title: 'تحميل الخرائط', desc: 'تخزين الخرائط مسبقاً للتنقل بدون إنترنت' },
    { step: 4, title: 'حماية 24/7', desc: 'AI يراقب باستمرار، تنبيهات فورية' }
  ],
  es: [
    { step: 1, title: 'Registro', desc: 'Registro por email, seleccionar ciudad, activar GPS' },
    { step: 2, title: 'Agregar familia', desc: 'Invitar a la familia, compartir estado y ubicación' },
    { step: 3, title: 'Descargar mapas', desc: 'Precargar mapas para navegación sin conexión' },
    { step: 4, title: 'Protección 24/7', desc: 'AI monitorea continuamente, alertas inmediatas' }
  ],
  fr: [
    { step: 1, title: 'Inscription', desc: 'Inscription par email, sélection de la ville, activation GPS' },
    { step: 2, title: 'Ajouter la famille', desc: 'Inviter la famille, partager le statut et la localisation' },
    { step: 3, title: 'Télécharger les cartes', desc: 'Précharger les cartes pour navigation hors ligne' },
    { step: 4, title: 'Protection 24/7', desc: 'L\'IA surveille en continu, alertes immédiates' }
  ],
  pt: [
    { step: 1, title: 'Registro', desc: 'Registro por email, selecionar cidade, ativar GPS' },
    { step: 2, title: 'Adicionar família', desc: 'Convidar família, compartilhar status e localização' },
    { step: 3, title: 'Baixar mapas', desc: 'Pré-carregar mapas para navegação offline' },
    { step: 4, title: 'Proteção 24/7', desc: 'AI monitora continuamente, alertas imediatos' }
  ],
  de: [
    { step: 1, title: 'Registrierung', desc: 'E-Mail-Registrierung, Stadt auswählen, GPS aktivieren' },
    { step: 2, title: 'Familie hinzufügen', desc: 'Familie einladen, Status und Standort teilen' },
    { step: 3, title: 'Karten herunterladen', desc: 'Karten vorab für Offline-Navigation zwischenspeichern' },
    { step: 4, title: '24/7 Schutz', desc: 'AI überwacht kontinuierlich, sofortige Benachrichtigungen' }
  ],
  tr: [
    { step: 1, title: 'Kayıt', desc: 'E-posta kaydı, şehir seçimi, GPS etkinleştirme' },
    { step: 2, title: 'Aile ekle', desc: 'Aileyi davet et, durum ve konum paylaş' },
    { step: 3, title: 'Harita indir', desc: 'Çevrimdışı navigasyon için haritaları önbelleğe al' },
    { step: 4, title: '7/24 Koruma', desc: 'AI sürekli izler, anında bildirimler' }
  ]
};

const pricingPlans: Record<string, Array<{name: string, subtitle: string, price: string, period: string, features: string[]}>> = {
  zh: [
    {
      name: '个人版',
      subtitle: '完整安全保障，适合单人用户',
      price: '$39.99',
      period: '/月',
      features: ['7x24 AI 实时预警推送', '全部 5 种地图模式', '一键 SOS 求救', '紧急资料卡', 'Twilio 短信通知', 'Google Maps 导航']
    },
    {
      name: '家庭版',
      subtitle: '全家守护，适合有家人的用户',
      price: '$99.99',
      period: '/月',
      features: ['个人版全部功能', '最多 5 位家庭成员', '实时位置共享', '家庭 SOS 联动', '家人安全看板', '撤离会合点规划', '批量避难所管理', '专属客服通道']
    }
  ],
  en: [
    {
      name: 'Personal',
      subtitle: 'Complete security for individual users',
      price: '$39.99',
      period: '/month',
      features: ['24/7 AI real-time alerts', 'All 5 map modes', 'One-click SOS', 'Emergency profile', 'Twilio SMS notifications', 'Google Maps navigation']
    },
    {
      name: 'Family',
      subtitle: 'Protection for the whole family',
      price: '$99.99',
      period: '/month',
      features: ['All Personal features', 'Up to 5 family members', 'Real-time location sharing', 'Family SOS linkage', 'Family safety dashboard', 'Evacuation meeting points', 'Bulk shelter management', 'Priority support']
    }
  ],
  ru: [
    {
      name: 'Персональный',
      subtitle: 'Полная безопасность для индивидуальных пользователей',
      price: '$39.99',
      period: '/мес',
      features: ['Круглосуточные оповещения ИИ', 'Все 5 режимов карт', 'SOS в один клик', 'Медицинская карта', 'SMS уведомления', 'Google Maps навигация']
    },
    {
      name: 'Семейный',
      subtitle: 'Защита для всей семьи',
      price: '$99.99',
      period: '/мес',
      features: ['Все функции Персонального', 'До 5 членов семьи', 'Общий доступ к местоположению', 'Семейный SOS', 'Панель безопасности', 'Точки эвакуации', 'Управление укрытиями', 'Приоритетная поддержка']
    }
  ],
  ar: [
    {
      name: 'شخصي',
      subtitle: 'أمان كامل للمستخدمين الفرديين',
      price: '$39.99',
      period: '/شهر',
      features: ['تنبيهات AI على مدار الساعة', '5 أوضاع خرائط', 'SOS بنقرة واحدة', 'بطاقة الطوارئ', 'إشعارات SMS', 'خرائط Google']
    },
    {
      name: 'عائلي',
      subtitle: 'حماية للعائلة بأكملها',
      price: '$99.99',
      period: '/شهر',
      features: ['جميع ميزات النسخة الشخصية', 'حتى 5 أفراد عائلة', 'مشاركة الموقع المباشرة', 'SOS العائلي', 'لوحة أمان العائلة', 'نقاط اللقاء', 'إدارة الملاجئ', 'دعم أولوي']
    }
  ],
  es: [
    {
      name: 'Personal',
      subtitle: 'Seguridad completa para usuarios individuales',
      price: '$39.99',
      period: '/mes',
      features: ['Alertas AI 24/7', '5 modos de mapa', 'SOS de un clic', 'Perfil de emergencia', 'Notificaciones SMS', 'Navegación Google Maps']
    },
    {
      name: 'Familiar',
      subtitle: 'Protección para toda la familia',
      price: '$99.99',
      period: '/mes',
      features: ['Todas las funciones Personal', 'Hasta 5 miembros', 'Ubicación en tiempo real', 'SOS familiar', 'Panel de seguridad', 'Puntos de encuentro', 'Gestión de refugios', 'Soporte prioritario']
    }
  ],
  fr: [
    {
      name: 'Personnel',
      subtitle: 'Sécurité complète pour utilisateurs individuels',
      price: '$39.99',
      period: '/mois',
      features: ['Alertes IA 24/7', '5 modes de carte', 'SOS en un clic', 'Profil d\'urgence', 'Notifications SMS', 'Navigation Google Maps']
    },
    {
      name: 'Famille',
      subtitle: 'Protection pour toute la famille',
      price: '$99.99',
      period: '/mois',
      features: ['Toutes les fonctions Personnel', 'Jusqu\'à 5 membres', 'Partage de localisation', 'SOS familial', 'Tableau de sécurité', 'Points de rassemblement', 'Gestion des abris', 'Support prioritaire']
    }
  ],
  pt: [
    {
      name: 'Pessoal',
      subtitle: 'Segurança completa para usuários individuais',
      price: '$39.99',
      period: '/mês',
      features: ['Alertas AI 24/7', '5 modos de mapa', 'SOS com um clique', 'Perfil de emergência', 'Notificações SMS', 'Navegação Google Maps']
    },
    {
      name: 'Família',
      subtitle: 'Proteção para toda a família',
      price: '$99.99',
      period: '/mês',
      features: ['Todos os recursos Pessoal', 'Até 5 membros', 'Localização em tempo real', 'SOS familiar', 'Painel de segurança', 'Pontos de encontro', 'Gestão de abrigos', 'Suporte prioritário']
    }
  ],
  de: [
    {
      name: 'Persönlich',
      subtitle: 'Vollständige Sicherheit für Einzelnutzer',
      price: '$39.99',
      period: '/Monat',
      features: ['24/7 KI-Warnungen', '5 Kartenmodi', 'SOS mit einem Klick', 'Notfallprofil', 'SMS-Benachrichtigungen', 'Google Maps Navigation']
    },
    {
      name: 'Familie',
      subtitle: 'Schutz für die ganze Familie',
      price: '$99.99',
      period: '/Monat',
      features: ['Alle Persönlich-Funktionen', 'Bis zu 5 Familienmitglieder', 'Echtzeit-Standort', 'Familien-SOS', 'Sicherheits-Dashboard', 'Treffpunkte', 'Schutzraum-Verwaltung', 'Prioritäts-Support']
    }
  ],
  tr: [
    {
      name: 'Kişisel',
      subtitle: 'Bireysel kullanıcılar için tam güvenlik',
      price: '$39.99',
      period: '/ay',
      features: ['7/24 AI uyarıları', '5 harita modu', 'Tek tıkla SOS', 'Acil durum profili', 'SMS bildirimleri', 'Google Maps navigasyon']
    },
    {
      name: 'Aile',
      subtitle: 'Tüm aile için koruma',
      price: '$99.99',
      period: '/ay',
      features: ['Tüm Kişisel özellikler', 'En fazla 5 aile üyesi', 'Gerçek zamanlı konum', 'Aile SOS bağlantısı', 'Aile güvenlik paneli', 'Tahliye buluşma noktaları', 'Toplu sığınak yönetimi', 'Öncelikli destek']
    }
  ]
};

const faqItems: Record<string, Array<{q: string, a: string}>> = {
  zh: [
    { q: 'WarRescue 的预警数据从哪里来？', a: '我们的AI系统24小时监控全球200+官方数据源，包括政府公告、国际新闻、卫星图像和社交媒体信号，通过多源交叉验证确保预警准确性。' },
    { q: '我的家人位置信息安全吗？', a: '绝对安全。所有位置数据采用端到端加密，仅家庭成员可见。您可以随时关闭位置共享，数据不会用于任何商业目的。' },
    { q: '断网的时候还能收到预警吗？', a: '可以。我们提供Twilio短信网关服务，RED/ORANGE级别预警会自动发送短信通知。同时建议预下载离线地图，确保断网时也能导航。' },
    { q: '支持哪些地区的用户？', a: '目前覆盖8个国家和地区的重点城市，包括乌克兰政府控制区（基辅、利沃夫、敖德萨等）、以色列、阿联酋、科威特、巴林、约旦、海地、尼日利亚。我们持续扩展覆盖范围。' },
    { q: '如何取消订阅？退款政策是什么？', a: '您可以随时在账户设置中取消订阅，下月生效。首次订阅7天内可申请全额退款，请联系客服处理。' }
  ],
  en: [
    { q: 'Where does WarRescue alert data come from?', a: 'Our AI system monitors 200+ official sources 24/7, including government announcements, international news, satellite imagery, and social media signals, ensuring accuracy through multi-source verification.' },
    { q: 'Is my family location information secure?', a: 'Absolutely secure. All location data uses end-to-end encryption and is only visible to family members. You can disable location sharing at any time, and data is never used for commercial purposes.' },
    { q: 'Can I receive alerts without internet?', a: 'Yes. We provide Twilio SMS gateway service, and RED/ORANGE level alerts are automatically sent via SMS. We also recommend pre-downloading offline maps for navigation without internet.' },
    { q: 'Which regions are supported?', a: 'Currently covering key cities in 8 countries and regions, including Ukraine (Gov. controlled: Kyiv, Lviv, Odesa, etc.), Israel, UAE, Kuwait, Bahrain, Jordan, Haiti, and Nigeria. We continuously expand our coverage.' },
    { q: 'How to cancel subscription? What is the refund policy?', a: 'You can cancel anytime in account settings, effective next month. Full refund available within 7 days of first subscription. Contact support for assistance.' }
  ],
  ru: [
    { q: 'Откуда берутся данные оповещений WarRescue?', a: 'Наша ИИ-система круглосуточно мониторит 200+ официальных источников, включая правительственные объявления, международные новости, спутниковые снимки и сигналы социальных сетей.' },
    { q: 'Безопасна ли информация о местоположении семьи?', a: 'Абсолютно безопасна. Все данные о местоположении используют сквозное шифрование и видны только членам семьи. Вы можете отключить общий доступ в любое время.' },
    { q: 'Можно ли получать оповещения без интернета?', a: 'Да. Мы предоставляем SMS-шлюз Twilio, и оповещения уровня КРАСНЫЙ/ОРАНЖЕВЫЙ автоматически отправляются по SMS. Рекомендуем предварительно загрузить офлайн-карты.' },
    { q: 'Какие регионы поддерживаются?', a: 'В настоящее время охватываем ключевые города в 8 странах и регионах, включая подконтрольную правительству территорию Украины (Киев, Львов, Одесса и др.), Израиль, ОАЭ, Кувейт, Бахрейн, Иорданию, Гаити и Нигерию. Мы постоянно расширяем покрытие.' },
    { q: 'Как отменить подписку? Политика возврата?', a: 'Вы можете отменить в любое время в настройках аккаунта, действует со следующего месяца. Полный возврат в течение 7 дней с момента первой подписки.' }
  ],
  ar: [
    { q: 'من أين تأتي بيانات تنبيه WarRescue؟', a: 'يراقب نظام AI لدينا 200+ مصدر رسمي على مدار الساعة، بما في ذلك إعلانات الحكومة والأخبار الدولية وصور الأقمار الصناعية وإشارات وسائل التواصل الاجتماعي.' },
    { q: 'هل معلومات موقع عائلتي آمنة؟', a: 'آمنة تماماً. جميع بيانات الموقع تستخدم التشفير من طرف إلى طرف ومرئية فقط لأفراد العائلة. يمكنك تعطيل المشاركة في أي وقت.' },
    { q: 'هل يمكنني استلام التنبيهات بدون إنترنت؟', a: 'نعم. نقدم خدمة بوابة SMS Twilio، ويتم إرسال تنبيهات المستوى الأحمر/البرتقالي تلقائياً عبر SMS. نوصي أيضاً بتنزيل الخرائط مسبقاً.' },
    { q: 'ما المناطق المدعومة؟', a: 'نغطي حالياً المدن الرئيسية في 8 دول ومناطق، بما في ذلك أوكرانيا (المناطق الحكومية: كييف، لفيف، أوديسا، إلخ) وإسرائيل والإمارات والكويت والبحرين والأردن وهايتي ونيجيريا. نواصل توسيع نطاق التغطية.' },
    { q: 'كيف يمكن إلغاء الاشتراك؟ ما سياسة الاسترداد؟', a: 'يمكنك الإلغاء في أي وقت من إعدادات الحساب، ويسري من الشهر التالي. استرداد كامل خلال 7 أيام من الاشتراك الأول.' }
  ],
  es: [
    { q: '¿De dónde provienen los datos de alerta de WarRescue?', a: 'Nuestro sistema de IA monitorea 200+ fuentes oficiales 24/7, incluyendo anuncios gubernamentales, noticias internacionales, imágenes satelitales y señales de redes sociales.' },
    { q: '¿Es segura la información de ubicación de mi familia?', a: 'Absolutamente segura. Todos los datos de ubicación usan cifrado de extremo a extremo y solo son visibles para los miembros de la familia. Puedes desactivar el compartir en cualquier momento.' },
    { q: '¿Puedo recibir alertas sin internet?', a: 'Sí. Proporcionamos el servicio de puerta de enlace SMS Twilio, y las alertas de nivel ROJO/NARANJA se envían automáticamente por SMS. Recomendamos descargar mapas offline.' },
    { q: '¿Qué regiones están soportadas?', a: 'Actualmente cubrimos ciudades clave en 8 países y regiones, incluyendo Ucrania (zona gob.: Kiev, Leópolis, Odesa, etc.), Israel, EAU, Kuwait, Baréin, Jordania, Haití y Nigeria. Continuamente expandimos nuestra cobertura.' },
    { q: '¿Cómo cancelar la suscripción? ¿Política de reembolso?', a: 'Puedes cancelar en cualquier momento en la configuración de la cuenta, efectivo el próximo mes. Reembolso completo dentro de 7 días de la primera suscripción.' }
  ],
  fr: [
    { q: 'D\'où proviennent les données d\'alerte WarRescue ?', a: 'Notre système d\'IA surveille 200+ sources officielles 24/7, y compris les annonces gouvernementales, les actualités internationales, les images satellites et les signaux des réseaux sociaux.' },
    { q: 'Les informations de localisation de ma famille sont-elles sécurisées ?', a: 'Absolument sécurisées. Toutes les données de localisation utilisent un chiffrement de bout en bout et ne sont visibles que par les membres de la famille. Vous pouvez désactiver le partage à tout moment.' },
    { q: 'Puis-je recevoir des alertes sans internet ?', a: 'Oui. Nous fournissons le service de passerelle SMS Twilio, et les alertes de niveau ROUGE/ORANGE sont automatiquement envoyées par SMS. Nous recommandons également de télécharger les cartes hors ligne.' },
    { q: 'Quelles régions sont prises en charge ?', a: 'Nous couvrons actuellement 38 villes clés dans 13 pays de zone de guerre, y compris l\'Ukraine, Israël, le Liban, l\'Irak, etc.' },
    { q: 'Comment annuler l\'abonnement ? Politique de remboursement ?', a: 'Vous pouvez annuler à tout moment dans les paramètres du compte, effectif le mois prochain. Remboursement complet dans les 7 jours suivant le premier abonnement.' }
  ],
  pt: [
    { q: 'De onde vêm os dados de alerta do WarRescue?', a: 'Nosso sistema de IA monitora 200+ fontes oficiais 24/7, incluindo anúncios governamentais, notícias internacionais, imagens de satélite e sinais de redes sociais.' },
    { q: 'As informações de localização da minha família são seguras?', a: 'Absolutamente seguras. Todos os dados de localização usam criptografia de ponta a ponta e são visíveis apenas para membros da família. Você pode desativar o compartilhamento a qualquer momento.' },
    { q: 'Posso receber alertas sem internet?', a: 'Sim. Fornecemos o serviço de gateway SMS Twilio, e alertas de nível VERMELHO/LARANJA são enviados automaticamente por SMS. Também recomendamos baixar mapas offline.' },
    { q: 'Quais regiões são suportadas?', a: 'Atualmente cobrimos cidades-chave em 8 países e regiões, incluindo Ucrânia (zona gov.: Kiev, Lviv, Odessa, etc.), Israel, EAU, Kuwait, Bahrein, Jordânia, Haiti e Nigéria. Continuamos expandindo nossa cobertura.' },
    { q: 'Como cancelar a assinatura? Política de reembolso?', a: 'Você pode cancelar a qualquer momento nas configurações da conta, efetivo no próximo mês. Reembolso completo dentro de 7 dias da primeira assinatura.' }
  ],
  de: [
    { q: 'Woher stammen die WarRescue-Warndaten?', a: 'Unser KI-System überwacht 24/7 200+ offizielle Quellen, einschließlich Regierungsankündigungen, internationale Nachrichten, Satellitenbilder und Social-Media-Signale.' },
    { q: 'Sind meine Familienstandortinformationen sicher?', a: 'Absolut sicher. Alle Standortdaten verwenden Ende-zu-Ende-Verschlüsselung und sind nur für Familienmitglieder sichtbar. Sie können die Freigabe jederzeit deaktivieren.' },
    { q: 'Kann ich Warnungen ohne Internet erhalten?', a: 'Ja. Wir bieten den Twilio SMS-Gateway-Service an, und ROT/ORANGE-Level-Warnungen werden automatisch per SMS gesendet. Wir empfehlen auch das Herunterladen von Offline-Karten.' },
    { q: 'Welche Regionen werden unterstützt?', a: 'Derzeit decken wir 38 Schlüsselstädte in 13 Kriegsgebiet-Ländern ab, darunter Ukraine, Israel, Libanon, Irak usw.' },
    { q: 'Wie kann ich das Abonnement kündigen? Rückerstattungspolitik?', a: 'Sie können jederzeit in den Kontoeinstellungen kündigen, wirksam ab nächstem Monat. Volle Rückerstattung innerhalb von 7 Tagen nach dem ersten Abonnement.' }
  ],
  tr: [
    { q: 'WarRescue uyarı verileri nereden geliyor?', a: 'AI sistemimiz 7/24 200+ resmi kaynağı izliyor, hükümet duyuruları, uluslararası haberler, uydu görüntüleri ve sosyal medya sinyalleri dahil.' },
    { q: 'Aile konum bilgilerim güvende mi?', a: 'Kesinlikle güvende. Tüm konum verileri uçtan uca şifreleme kullanır ve sadece aile üyeleri görür. Konum paylaşımını istediğiniz zaman kapatabilirsiniz.' },
    { q: 'İnternet olmadan uyarı alabilir miyim?', a: 'Evet. Twilio SMS ağ geçidi hizmeti sağlıyoruz ve KIRMIZI/TURUNCU seviye uyarılar otomatik olarak SMS ile gönderilir. Ayrıca çevrimdışı harita indirmenizi öneririz.' },
    { q: 'Hangi bölgeler destekleniyor?', a: 'Şu anda Ukrayna (Hük. kontrolü: Kyiv, Lviv, Odesa vb.), İsrail, BAE, Kuveyt, Bahreyn, Ürdün, Haiti ve Nijerya dahil 8 ülke ve bölgedeki önemli şehirleri kapsıyoruz. Kapsamımızı sürekli genişletiyoruz.' },
    { q: 'Abonelik nasıl iptal edilir? İade politikası?', a: 'Hesap ayarlarından istediğiniz zaman iptal edebilirsiniz, bir sonraki ay geçerli olur. İlk abonelikten sonraki 7 gün içinde tam para iadesi.' }
  ]
};

export default function LandingPage() {
  const { t, language, setLanguage, languages, dir } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const now = new Date().toISOString();
    supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .lte('start_at', now)
      .or(`end_at.is.null,end_at.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setAnnouncements(data); });
  }, []);

  const descs = featureDescriptions[language] || featureDescriptions.zh;
  const titles = sectionTitles[language] || sectionTitles.zh;
  const countries = supportedCountries[language] || supportedCountries.zh;
  const steps = workflowSteps[language] || workflowSteps.zh;
  const plans = pricingPlans[language] || pricingPlans.zh;
  const faqs = faqItems[language] || faqItems.zh;
  const annLabels = announcementLabels[language] || announcementLabels.zh;

  return (
    <div className="min-h-screen bg-slate-900 text-white" dir={dir}>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Siren className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">{t('appName')}</span>
            </motion.div>

            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-slate-300 hover:text-white transition-colors">{t('home')}</button>
              <button onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })} className="text-slate-300 hover:text-white transition-colors">{titles.workflow}</button>
              <button onClick={() => document.getElementById('countries')?.scrollIntoView({ behavior: 'smooth' })} className="text-slate-300 hover:text-white transition-colors">{titles.countries}</button>
              <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-slate-300 hover:text-white transition-colors">{titles.pricing}</button>
              <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="text-slate-300 hover:text-white transition-colors">{titles.faq}</button>

              <div className="relative">
                <button
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span>{languages.find(l => l.code === language)?.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showLangDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full right-0 mt-2 w-40 bg-slate-800 rounded-xl border border-slate-700 shadow-xl"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as any);
                          setShowLangDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                          language === lang.code ? 'text-blue-400' : 'text-slate-300'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              <Link
                to="/auth"
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all"
              >
                {t('login')}
              </Link>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden bg-slate-800 border-t border-slate-700"
          >
            <div className="px-4 py-4 space-y-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as any);
                    setIsMenuOpen(false);
                  }}
                  className={`block w-full text-left py-2 ${
                    language === lang.code ? 'text-blue-400' : 'text-slate-300'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
              <Link to="/auth" className="block py-2 text-red-400 font-medium">{t('login')}</Link>
            </div>
          </motion.div>
        )}
      </nav>

      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
            {/* Left: Hero content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 text-center lg:text-left"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full mb-8"
              >
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-sm font-medium">{t('slogan')}</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                {language === 'ar' ? '' : t('appName')}
                <br />
                <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  {t('slogan')}
                </span>
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl lg:max-w-none mb-10 mx-auto lg:mx-0">
                {descs.realtimeAlertDesc}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/auth"
                  className="group px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-full font-semibold text-lg hover:shadow-xl hover:shadow-red-500/30 transition-all flex items-center gap-2"
                >
                  {t('register')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-4 border border-slate-600 rounded-full font-semibold text-lg hover:bg-slate-800 transition-colors"
                >
                  {t('viewAll')}
                </button>
              </div>
            </motion.div>

            {/* Right: Announcements panel */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="w-full lg:w-96 shrink-0"
            >
              <div className="bg-slate-800/70 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700/80 bg-slate-800/50">
                  <Megaphone className="w-5 h-5 text-orange-400" />
                  <h3 className="font-semibold text-white text-base">{annLabels.title}</h3>
                  <span className="ml-auto text-xs text-slate-500">{announcements.length}</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {announcements.length === 0 ? (
                    <div className="px-5 py-10 text-center text-slate-500 text-sm">{annLabels.empty}</div>
                  ) : (
                    announcements.map((ann, idx) => {
                      const typeColor = ann.type === 'warning' ? 'border-l-amber-500 bg-amber-500/5' : ann.type === 'emergency' ? 'border-l-red-500 bg-red-500/5' : 'border-l-blue-500 bg-blue-500/5';
                      return (
                        <div
                          key={ann.id}
                          className={`px-5 py-4 border-l-2 ${typeColor} ${idx < announcements.length - 1 ? 'border-b border-slate-700/50' : ''} hover:bg-slate-700/30 transition-colors`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-medium text-white leading-snug">{ann.title}</h4>
                            <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">{ann.created_at ? annLabels.timeAgo(ann.created_at) : ''}</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{ann.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{titles.features}</h2>
            <p className="text-slate-400 text-lg">{t('slogan')}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-slate-600 transition-all"
              >
                <div className={`w-14 h-14 mb-4 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t(feature.titleKey as any)}</h3>
                <p className="text-slate-400">{descs[feature.descriptionKey]}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{titles.workflow}</h2>
            <p className="text-slate-400 text-lg">4 {language === 'zh' ? '步' : language === 'en' ? 'Steps' : language === 'ru' ? 'шага' : language === 'ar' ? 'خطوات' : language === 'es' ? 'pasos' : language === 'fr' ? 'étapes' : language === 'pt' ? 'passos' : language === 'de' ? 'Schritte' : 'adım'} to get protected</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">{step.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="countries" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{titles.countries}</h2>
            <p className="text-slate-400 text-lg">{t('slogan')}</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {countries.map((country, index) => (
              <motion.div
                key={country}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-slate-800 border border-slate-700 rounded-xl text-center hover:border-slate-500 transition-colors"
              >
                <span className="text-slate-300 font-medium">{country}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{titles.pricing}</h2>
            <p className="text-slate-400 text-lg">7 {language === 'zh' ? '天免费试用' : language === 'en' ? 'days free trial' : language === 'ru' ? 'дней бесплатно' : language === 'ar' ? 'أيام تجربة مجانية' : language === 'es' ? 'días de prueba gratis' : language === 'fr' ? 'jours d\'essai gratuit' : language === 'pt' ? 'dias de teste grátis' : language === 'de' ? 'Tage kostenlos testen' : 'gün ücretsiz deneme'}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`p-8 rounded-2xl border ${index === 0 ? 'border-blue-500/50 bg-gradient-to-b from-blue-500/10 to-transparent' : 'border-slate-700 bg-slate-800/50'}`}
              >
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{plan.subtitle}</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/subscribe"
                  className={`w-full py-3 rounded-xl font-medium text-center block transition-all ${
                    index === 0
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg hover:shadow-blue-500/30'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {t('subscribe')}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{titles.faq}</h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="border border-slate-700 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
                >
                  <span className="font-medium">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${activeFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 text-slate-400">{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-3xl p-8 sm:p-12 text-center"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{titles.cta}</h2>
            <p className="text-slate-300 text-lg mb-8">{t('slogan')}</p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-full font-semibold text-lg hover:shadow-xl hover:shadow-red-500/30 transition-all"
            >
              {t('register')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Siren className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">{t('appName')}</span>
            </div>

            <div className="flex items-center gap-6 text-slate-400">
              <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">{titles.footer}</button>
              <a href="mailto:support@warrescue.app" className="hover:text-white transition-colors">Contact</a>
            </div>

            <p className="text-slate-500 text-sm">
              &copy; 2026 {t('appName')}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
