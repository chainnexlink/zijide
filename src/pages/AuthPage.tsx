import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Siren, Eye, EyeOff, ChevronDown, Loader2, Gift, Clock, User, Mail, Smartphone } from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';

const countryCodes = [
  // East Asia
  { code: '+86', country: '中国', en: 'China', flag: 'CN' },
  { code: '+852', country: '中国香港', en: 'Hong Kong', flag: 'HK' },
  { code: '+853', country: '中国澳门', en: 'Macao', flag: 'MO' },
  { code: '+886', country: '中国台湾', en: 'Taiwan', flag: 'TW' },
  { code: '+81', country: '日本', en: 'Japan', flag: 'JP' },
  { code: '+82', country: '韩国', en: 'South Korea', flag: 'KR' },
  { code: '+850', country: '朝鲜', en: 'North Korea', flag: 'KP' },
  { code: '+976', country: '蒙古', en: 'Mongolia', flag: 'MN' },
  // Southeast Asia
  { code: '+65', country: '新加坡', en: 'Singapore', flag: 'SG' },
  { code: '+60', country: '马来西亚', en: 'Malaysia', flag: 'MY' },
  { code: '+66', country: '泰国', en: 'Thailand', flag: 'TH' },
  { code: '+84', country: '越南', en: 'Vietnam', flag: 'VN' },
  { code: '+62', country: '印度尼西亚', en: 'Indonesia', flag: 'ID' },
  { code: '+63', country: '菲律宾', en: 'Philippines', flag: 'PH' },
  { code: '+95', country: '缅甸', en: 'Myanmar', flag: 'MM' },
  { code: '+855', country: '柬埔寨', en: 'Cambodia', flag: 'KH' },
  { code: '+856', country: '老挝', en: 'Laos', flag: 'LA' },
  { code: '+673', country: '文莱', en: 'Brunei', flag: 'BN' },
  { code: '+670', country: '东帝汶', en: 'Timor-Leste', flag: 'TL' },
  // South Asia
  { code: '+91', country: '印度', en: 'India', flag: 'IN' },
  { code: '+92', country: '巴基斯坦', en: 'Pakistan', flag: 'PK' },
  { code: '+880', country: '孟加拉国', en: 'Bangladesh', flag: 'BD' },
  { code: '+94', country: '斯里兰卡', en: 'Sri Lanka', flag: 'LK' },
  { code: '+977', country: '尼泊尔', en: 'Nepal', flag: 'NP' },
  { code: '+975', country: '不丹', en: 'Bhutan', flag: 'BT' },
  { code: '+960', country: '马尔代夫', en: 'Maldives', flag: 'MV' },
  { code: '+93', country: '阿富汗', en: 'Afghanistan', flag: 'AF' },
  // Central Asia
  { code: '+7', country: '哈萨克斯坦', en: 'Kazakhstan', flag: 'KZ' },
  { code: '+998', country: '乌兹别克斯坦', en: 'Uzbekistan', flag: 'UZ' },
  { code: '+993', country: '土库曼斯坦', en: 'Turkmenistan', flag: 'TM' },
  { code: '+996', country: '吉尔吉斯斯坦', en: 'Kyrgyzstan', flag: 'KG' },
  { code: '+992', country: '塔吉克斯坦', en: 'Tajikistan', flag: 'TJ' },
  // Middle East
  { code: '+972', country: '以色列', en: 'Israel', flag: 'IL' },
  { code: '+970', country: '巴勒斯坦', en: 'Palestine', flag: 'PS' },
  { code: '+961', country: '黎巴嫩', en: 'Lebanon', flag: 'LB' },
  { code: '+962', country: '约旦', en: 'Jordan', flag: 'JO' },
  { code: '+963', country: '叙利亚', en: 'Syria', flag: 'SY' },
  { code: '+964', country: '伊拉克', en: 'Iraq', flag: 'IQ' },
  { code: '+966', country: '沙特阿拉伯', en: 'Saudi Arabia', flag: 'SA' },
  { code: '+971', country: '阿联酋', en: 'UAE', flag: 'AE' },
  { code: '+974', country: '卡塔尔', en: 'Qatar', flag: 'QA' },
  { code: '+965', country: '科威特', en: 'Kuwait', flag: 'KW' },
  { code: '+973', country: '巴林', en: 'Bahrain', flag: 'BH' },
  { code: '+968', country: '阿曼', en: 'Oman', flag: 'OM' },
  { code: '+967', country: '也门', en: 'Yemen', flag: 'YE' },
  { code: '+98', country: '伊朗', en: 'Iran', flag: 'IR' },
  { code: '+90', country: '土耳其', en: 'Turkey', flag: 'TR' },
  // Europe - Western
  { code: '+44', country: '英国', en: 'United Kingdom', flag: 'GB' },
  { code: '+33', country: '法国', en: 'France', flag: 'FR' },
  { code: '+49', country: '德国', en: 'Germany', flag: 'DE' },
  { code: '+39', country: '意大利', en: 'Italy', flag: 'IT' },
  { code: '+34', country: '西班牙', en: 'Spain', flag: 'ES' },
  { code: '+351', country: '葡萄牙', en: 'Portugal', flag: 'PT' },
  { code: '+31', country: '荷兰', en: 'Netherlands', flag: 'NL' },
  { code: '+32', country: '比利时', en: 'Belgium', flag: 'BE' },
  { code: '+41', country: '瑞士', en: 'Switzerland', flag: 'CH' },
  { code: '+43', country: '奥地利', en: 'Austria', flag: 'AT' },
  { code: '+353', country: '爱尔兰', en: 'Ireland', flag: 'IE' },
  { code: '+352', country: '卢森堡', en: 'Luxembourg', flag: 'LU' },
  { code: '+377', country: '摩纳哥', en: 'Monaco', flag: 'MC' },
  { code: '+423', country: '列支敦士登', en: 'Liechtenstein', flag: 'LI' },
  { code: '+376', country: '安道尔', en: 'Andorra', flag: 'AD' },
  { code: '+350', country: '直布罗陀', en: 'Gibraltar', flag: 'GI' },
  { code: '+378', country: '圣马力诺', en: 'San Marino', flag: 'SM' },
  { code: '+379', country: '梵蒂冈', en: 'Vatican', flag: 'VA' },
  // Europe - Northern
  { code: '+46', country: '瑞典', en: 'Sweden', flag: 'SE' },
  { code: '+47', country: '挪威', en: 'Norway', flag: 'NO' },
  { code: '+45', country: '丹麦', en: 'Denmark', flag: 'DK' },
  { code: '+358', country: '芬兰', en: 'Finland', flag: 'FI' },
  { code: '+354', country: '冰岛', en: 'Iceland', flag: 'IS' },
  // Europe - Eastern
  { code: '+380', country: '乌克兰', en: 'Ukraine', flag: 'UA' },
  { code: '+48', country: '波兰', en: 'Poland', flag: 'PL' },
  { code: '+420', country: '捷克', en: 'Czech Republic', flag: 'CZ' },
  { code: '+421', country: '斯洛伐克', en: 'Slovakia', flag: 'SK' },
  { code: '+36', country: '匈牙利', en: 'Hungary', flag: 'HU' },
  { code: '+40', country: '罗马尼亚', en: 'Romania', flag: 'RO' },
  { code: '+359', country: '保加利亚', en: 'Bulgaria', flag: 'BG' },
  { code: '+385', country: '克罗地亚', en: 'Croatia', flag: 'HR' },
  { code: '+386', country: '斯洛文尼亚', en: 'Slovenia', flag: 'SI' },
  { code: '+381', country: '塞尔维亚', en: 'Serbia', flag: 'RS' },
  { code: '+387', country: '波黑', en: 'Bosnia', flag: 'BA' },
  { code: '+382', country: '黑山', en: 'Montenegro', flag: 'ME' },
  { code: '+389', country: '北马其顿', en: 'North Macedonia', flag: 'MK' },
  { code: '+355', country: '阿尔巴尼亚', en: 'Albania', flag: 'AL' },
  { code: '+383', country: '科索沃', en: 'Kosovo', flag: 'XK' },
  { code: '+373', country: '摩尔多瓦', en: 'Moldova', flag: 'MD' },
  { code: '+375', country: '白俄罗斯', en: 'Belarus', flag: 'BY' },
  { code: '+370', country: '立陶宛', en: 'Lithuania', flag: 'LT' },
  { code: '+371', country: '拉脱维亚', en: 'Latvia', flag: 'LV' },
  { code: '+372', country: '爱沙尼亚', en: 'Estonia', flag: 'EE' },
  { code: '+30', country: '希腊', en: 'Greece', flag: 'GR' },
  { code: '+357', country: '塞浦路斯', en: 'Cyprus', flag: 'CY' },
  { code: '+356', country: '马耳他', en: 'Malta', flag: 'MT' },
  // Russia & Caucasus
  { code: '+7', country: '俄罗斯', en: 'Russia', flag: 'RU' },
  { code: '+995', country: '格鲁吉亚', en: 'Georgia', flag: 'GE' },
  { code: '+374', country: '亚美尼亚', en: 'Armenia', flag: 'AM' },
  { code: '+994', country: '阿塞拜疆', en: 'Azerbaijan', flag: 'AZ' },
  // North America
  { code: '+1', country: '美国', en: 'United States', flag: 'US' },
  { code: '+1', country: '加拿大', en: 'Canada', flag: 'CA' },
  { code: '+52', country: '墨西哥', en: 'Mexico', flag: 'MX' },
  // Central America
  { code: '+502', country: '危地马拉', en: 'Guatemala', flag: 'GT' },
  { code: '+503', country: '萨尔瓦多', en: 'El Salvador', flag: 'SV' },
  { code: '+504', country: '洪都拉斯', en: 'Honduras', flag: 'HN' },
  { code: '+505', country: '尼加拉瓜', en: 'Nicaragua', flag: 'NI' },
  { code: '+506', country: '哥斯达黎加', en: 'Costa Rica', flag: 'CR' },
  { code: '+507', country: '巴拿马', en: 'Panama', flag: 'PA' },
  { code: '+501', country: '伯利兹', en: 'Belize', flag: 'BZ' },
  // Caribbean
  { code: '+53', country: '古巴', en: 'Cuba', flag: 'CU' },
  { code: '+509', country: '海地', en: 'Haiti', flag: 'HT' },
  { code: '+1809', country: '多米尼加', en: 'Dominican Republic', flag: 'DO' },
  { code: '+1876', country: '牙买加', en: 'Jamaica', flag: 'JM' },
  { code: '+1868', country: '特立尼达', en: 'Trinidad & Tobago', flag: 'TT' },
  { code: '+1242', country: '巴哈马', en: 'Bahamas', flag: 'BS' },
  { code: '+1246', country: '巴巴多斯', en: 'Barbados', flag: 'BB' },
  { code: '+1758', country: '圣卢西亚', en: 'Saint Lucia', flag: 'LC' },
  { code: '+1767', country: '多米尼克', en: 'Dominica', flag: 'DM' },
  { code: '+1784', country: '圣文森特', en: 'St Vincent', flag: 'VC' },
  { code: '+1473', country: '格林纳达', en: 'Grenada', flag: 'GD' },
  { code: '+1268', country: '安提瓜', en: 'Antigua & Barbuda', flag: 'AG' },
  { code: '+1869', country: '圣基茨', en: 'St Kitts & Nevis', flag: 'KN' },
  { code: '+599', country: '库拉索', en: 'Curacao', flag: 'CW' },
  { code: '+1649', country: '特克斯和凯科斯', en: 'Turks & Caicos', flag: 'TC' },
  { code: '+1345', country: '开曼群岛', en: 'Cayman Islands', flag: 'KY' },
  { code: '+1441', country: '百慕大', en: 'Bermuda', flag: 'BM' },
  { code: '+1284', country: '英属维尔京', en: 'British Virgin Islands', flag: 'VG' },
  { code: '+1340', country: '美属维尔京', en: 'US Virgin Islands', flag: 'VI' },
  { code: '+1787', country: '波多黎各', en: 'Puerto Rico', flag: 'PR' },
  // South America
  { code: '+55', country: '巴西', en: 'Brazil', flag: 'BR' },
  { code: '+54', country: '阿根廷', en: 'Argentina', flag: 'AR' },
  { code: '+56', country: '智利', en: 'Chile', flag: 'CL' },
  { code: '+57', country: '哥伦比亚', en: 'Colombia', flag: 'CO' },
  { code: '+58', country: '委内瑞拉', en: 'Venezuela', flag: 'VE' },
  { code: '+51', country: '秘鲁', en: 'Peru', flag: 'PE' },
  { code: '+593', country: '厄瓜多尔', en: 'Ecuador', flag: 'EC' },
  { code: '+591', country: '玻利维亚', en: 'Bolivia', flag: 'BO' },
  { code: '+595', country: '巴拉圭', en: 'Paraguay', flag: 'PY' },
  { code: '+598', country: '乌拉圭', en: 'Uruguay', flag: 'UY' },
  { code: '+592', country: '圭亚那', en: 'Guyana', flag: 'GY' },
  { code: '+597', country: '苏里南', en: 'Suriname', flag: 'SR' },
  { code: '+594', country: '法属圭亚那', en: 'French Guiana', flag: 'GF' },
  // Africa - North
  { code: '+20', country: '埃及', en: 'Egypt', flag: 'EG' },
  { code: '+212', country: '摩洛哥', en: 'Morocco', flag: 'MA' },
  { code: '+213', country: '阿尔及利亚', en: 'Algeria', flag: 'DZ' },
  { code: '+216', country: '突尼斯', en: 'Tunisia', flag: 'TN' },
  { code: '+218', country: '利比亚', en: 'Libya', flag: 'LY' },
  { code: '+249', country: '苏丹', en: 'Sudan', flag: 'SD' },
  { code: '+211', country: '南苏丹', en: 'South Sudan', flag: 'SS' },
  // Africa - West
  { code: '+234', country: '尼日利亚', en: 'Nigeria', flag: 'NG' },
  { code: '+233', country: '加纳', en: 'Ghana', flag: 'GH' },
  { code: '+225', country: '科特迪瓦', en: "Cote d'Ivoire", flag: 'CI' },
  { code: '+221', country: '塞内加尔', en: 'Senegal', flag: 'SN' },
  { code: '+223', country: '马里', en: 'Mali', flag: 'ML' },
  { code: '+226', country: '布基纳法索', en: 'Burkina Faso', flag: 'BF' },
  { code: '+227', country: '尼日尔', en: 'Niger', flag: 'NE' },
  { code: '+224', country: '几内亚', en: 'Guinea', flag: 'GN' },
  { code: '+228', country: '多哥', en: 'Togo', flag: 'TG' },
  { code: '+229', country: '贝宁', en: 'Benin', flag: 'BJ' },
  { code: '+231', country: '利比里亚', en: 'Liberia', flag: 'LR' },
  { code: '+232', country: '塞拉利昂', en: 'Sierra Leone', flag: 'SL' },
  { code: '+235', country: '乍得', en: 'Chad', flag: 'TD' },
  { code: '+220', country: '冈比亚', en: 'Gambia', flag: 'GM' },
  { code: '+245', country: '几内亚比绍', en: 'Guinea-Bissau', flag: 'GW' },
  { code: '+222', country: '毛里塔尼亚', en: 'Mauritania', flag: 'MR' },
  { code: '+238', country: '佛得角', en: 'Cape Verde', flag: 'CV' },
  // Africa - East
  { code: '+254', country: '肯尼亚', en: 'Kenya', flag: 'KE' },
  { code: '+255', country: '坦桑尼亚', en: 'Tanzania', flag: 'TZ' },
  { code: '+256', country: '乌干达', en: 'Uganda', flag: 'UG' },
  { code: '+251', country: '埃塞俄比亚', en: 'Ethiopia', flag: 'ET' },
  { code: '+252', country: '索马里', en: 'Somalia', flag: 'SO' },
  { code: '+253', country: '吉布提', en: 'Djibouti', flag: 'DJ' },
  { code: '+291', country: '厄立特里亚', en: 'Eritrea', flag: 'ER' },
  { code: '+250', country: '卢旺达', en: 'Rwanda', flag: 'RW' },
  { code: '+257', country: '布隆迪', en: 'Burundi', flag: 'BI' },
  { code: '+258', country: '莫桑比克', en: 'Mozambique', flag: 'MZ' },
  { code: '+261', country: '马达加斯加', en: 'Madagascar', flag: 'MG' },
  { code: '+230', country: '毛里求斯', en: 'Mauritius', flag: 'MU' },
  { code: '+248', country: '塞舌尔', en: 'Seychelles', flag: 'SC' },
  { code: '+269', country: '科摩罗', en: 'Comoros', flag: 'KM' },
  // Africa - Central
  { code: '+243', country: '刚果(金)', en: 'DR Congo', flag: 'CD' },
  { code: '+242', country: '刚果(布)', en: 'Congo', flag: 'CG' },
  { code: '+237', country: '喀麦隆', en: 'Cameroon', flag: 'CM' },
  { code: '+241', country: '加蓬', en: 'Gabon', flag: 'GA' },
  { code: '+236', country: '中非', en: 'Central African Republic', flag: 'CF' },
  { code: '+240', country: '赤道几内亚', en: 'Equatorial Guinea', flag: 'GQ' },
  { code: '+239', country: '圣多美', en: 'Sao Tome & Principe', flag: 'ST' },
  // Africa - Southern
  { code: '+27', country: '南非', en: 'South Africa', flag: 'ZA' },
  { code: '+263', country: '津巴布韦', en: 'Zimbabwe', flag: 'ZW' },
  { code: '+260', country: '赞比亚', en: 'Zambia', flag: 'ZM' },
  { code: '+265', country: '马拉维', en: 'Malawi', flag: 'MW' },
  { code: '+264', country: '纳米比亚', en: 'Namibia', flag: 'NA' },
  { code: '+267', country: '博茨瓦纳', en: 'Botswana', flag: 'BW' },
  { code: '+266', country: '莱索托', en: 'Lesotho', flag: 'LS' },
  { code: '+268', country: '斯威士兰', en: 'Eswatini', flag: 'SZ' },
  { code: '+244', country: '安哥拉', en: 'Angola', flag: 'AO' },
  // Oceania
  { code: '+61', country: '澳大利亚', en: 'Australia', flag: 'AU' },
  { code: '+64', country: '新西兰', en: 'New Zealand', flag: 'NZ' },
  { code: '+675', country: '巴布亚新几内亚', en: 'Papua New Guinea', flag: 'PG' },
  { code: '+679', country: '斐济', en: 'Fiji', flag: 'FJ' },
  { code: '+685', country: '萨摩亚', en: 'Samoa', flag: 'WS' },
  { code: '+676', country: '汤加', en: 'Tonga', flag: 'TO' },
  { code: '+678', country: '瓦努阿图', en: 'Vanuatu', flag: 'VU' },
  { code: '+677', country: '所罗门群岛', en: 'Solomon Islands', flag: 'SB' },
  { code: '+686', country: '基里巴斯', en: 'Kiribati', flag: 'KI' },
  { code: '+688', country: '图瓦卢', en: 'Tuvalu', flag: 'TV' },
  { code: '+674', country: '瑙鲁', en: 'Nauru', flag: 'NR' },
  { code: '+692', country: '马绍尔群岛', en: 'Marshall Islands', flag: 'MH' },
  { code: '+691', country: '密克罗尼西亚', en: 'Micronesia', flag: 'FM' },
  { code: '+680', country: '帕劳', en: 'Palau', flag: 'PW' },
  { code: '+682', country: '库克群岛', en: 'Cook Islands', flag: 'CK' },
  { code: '+689', country: '法属波利尼西亚', en: 'French Polynesia', flag: 'PF' },
  { code: '+687', country: '新喀里多尼亚', en: 'New Caledonia', flag: 'NC' },
  { code: '+681', country: '瓦利斯和富图纳', en: 'Wallis & Futuna', flag: 'WF' },
  { code: '+683', country: '纽埃', en: 'Niue', flag: 'NU' },
  { code: '+690', country: '托克劳', en: 'Tokelau', flag: 'TK' },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [countrySearch, setCountrySearch] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [inviteCodeFromUrl] = useState(searchParams.get('invite') || '');

  const [loginData, setLoginData] = useState({
    phone: '',
    email: '',
    password: '',
    verificationCode: '',
    inviteCode: inviteCodeFromUrl
  });

  const [registerData, setRegisterData] = useState({
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
    inviteCode: inviteCodeFromUrl,
    agreeTerms: false
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendVerificationCode = async () => {
    const phone = activeTab === 'login' ? loginData.phone : registerData.phone;
    if (!phone) {
      setError(t('phone') + ' ' + t('required'));
      return;
    }

    setLoading(true);
    try {
      const { data, error: funcError } = await supabase.functions.invoke('subscription', {
        body: {
          action: 'send-sms-code',
          phone,
          countryCode: selectedCountry.code
        }
      });

      if (funcError) throw funcError;

      if (data.success) {
        setCountdown(60);
        setError('');
      } else {
        setError(data.error || t('error'));
      }
    } catch (err: any) {
      setError(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (authError) throw authError;

      if (data.user) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: funcError } = await supabase.functions.invoke('subscription', {
        body: {
          action: 'verify-sms-code',
          phone: loginData.phone,
          countryCode: selectedCountry.code,
          code: loginData.verificationCode,
          inviteCode: loginData.inviteCode,
          deviceId: navigator.userAgent
        }
      });

      if (funcError) throw funcError;

      if (data.success) {
        navigate('/dashboard');
      } else {
        setError(data.error || t('error'));
      }
    } catch (err: any) {
      setError(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!registerData.agreeTerms) {
      setError(t('agreeTerms'));
      setLoading(false);
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            invite_code: registerData.inviteCode
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!registerData.agreeTerms) {
      setError(t('agreeTerms'));
      setLoading(false);
      return;
    }

    try {
      const { data, error: funcError } = await supabase.functions.invoke('subscription', {
        body: {
          action: 'verify-sms-code',
          phone: registerData.phone,
          countryCode: selectedCountry.code,
          code: registerData.verificationCode,
          inviteCode: registerData.inviteCode,
          deviceId: navigator.userAgent
        }
      });

      if (funcError) throw funcError;

      if (data.success) {
        navigate('/dashboard');
      } else {
        setError(data.error || t('error'));
      }
    } catch (err: any) {
      setError(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const { data, error: funcError } = await supabase.functions.invoke('subscription', {
        body: {
          action: 'create-guest',
          deviceId: navigator.userAgent
        }
      });

      if (funcError) throw funcError;

      if (data.guestId) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const countryName = (c: typeof countryCodes[0]) => language === 'zh' ? c.country : c.en;

  const filteredCountryCodes = countryCodes.filter((c) => {
    if (!countrySearch) return true;
    const q = countrySearch.toLowerCase();
    return c.code.includes(q) || c.country.includes(q) || c.en.toLowerCase().includes(q) || c.flag.toLowerCase().includes(q);
  });

  const renderPhoneInput = (data: any, setData: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{t('phone')}</label>
      <div className="flex gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowCountryDropdown(!showCountryDropdown); setCountrySearch(''); }}
            className="h-12 px-3 bg-slate-700 border border-slate-600 rounded-xl flex items-center gap-2 text-white hover:border-slate-500 transition-colors"
          >
            {selectedCountry.code}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showCountryDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 max-h-72 flex flex-col"
            >
              <div className="p-2 border-b border-slate-700 sticky top-0 bg-slate-800 rounded-t-xl">
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search / 搜索..."
                  autoFocus
                  className="w-full h-9 px-3 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:border-red-500 focus:outline-none"
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredCountryCodes.map((country, idx) => (
                  <button
                    key={country.flag + idx}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(country);
                      setShowCountryDropdown(false);
                      setCountrySearch('');
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors text-sm ${selectedCountry.flag === country.flag && selectedCountry.code === country.code ? 'text-red-400 bg-slate-700/50' : 'text-slate-300'}`}
                  >
                    {country.code} {countryName(country)}
                  </button>
                ))}
                {filteredCountryCodes.length === 0 && (
                  <div className="px-4 py-3 text-sm text-slate-500 text-center">No results</div>
                )}
              </div>
            </motion.div>
          )}
        </div>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => setData({ ...data, phone: e.target.value })}
          placeholder={t('phone')}
          className="flex-1 h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-red-500 focus:outline-none transition-colors"
        />
      </div>
    </div>
  );

  const renderEmailInput = (data: any, setData: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{t('email')}</label>
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-slate-400" />
        <input
          type="email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          placeholder="email@example.com"
          className="flex-1 h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-red-500 focus:outline-none transition-colors"
        />
      </div>
    </div>
  );

  const renderPasswordInput = (data: any, setData: any, placeholder: string = 'Password') => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{t('password')}</label>
      <input
        type="password"
        value={data.password}
        onChange={(e) => setData({ ...data, password: e.target.value })}
        placeholder={placeholder}
        className="w-full h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-red-500 focus:outline-none transition-colors"
      />
    </div>
  );

  const renderVerificationCode = (data: any, setData: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{t('verificationCode')}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={data.verificationCode}
          onChange={(e) => setData({ ...data, verificationCode: e.target.value })}
          placeholder={t('verificationCode')}
          className="flex-1 h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-red-500 focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={sendVerificationCode}
          disabled={countdown > 0 || loading}
          className="h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-red-400 font-medium hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {countdown > 0 ? `${countdown}s` : t('getCode')}
        </button>
      </div>
    </div>
  );

  const renderInviteCode = (data: any, setData: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
        <Gift className="w-4 h-4 text-amber-400" />
        {t('inviteCode')} ({t('optional')})
      </label>
      <input
        type="text"
        value={data.inviteCode}
        onChange={(e) => setData({ ...data, inviteCode: e.target.value.toUpperCase() })}
        placeholder="WARXXXXXX"
        className="w-full h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-red-500 focus:outline-none transition-colors uppercase"
      />
      <p className="text-xs text-slate-500 mt-1">{t('inviteCode')} {t('optional')}</p>
    </div>
  );

  const renderLoginMethodToggle = () => (
    <div className="flex gap-2 mb-4">
      <button
        type="button"
        onClick={() => setLoginMethod('phone')}
        className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-lg transition-colors ${
          loginMethod === 'phone'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
        }`}
      >
        <Smartphone className="w-4 h-4" />
        {t('phone')}
      </button>
      <button
        type="button"
        onClick={() => setLoginMethod('email')}
        className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-lg transition-colors ${
          loginMethod === 'email'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
        }`}
      >
        <Mail className="w-4 h-4" />
        {t('email')}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl mb-4"
          >
            <Siren className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">{t('appName')}</h1>
          <p className="text-slate-400 mt-1">{t('slogan')}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex border-b border-slate-700 mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 pb-3 text-center font-medium transition-colors relative ${
                activeTab === 'login' ? 'text-white' : 'text-slate-400'
              }`}
            >
              {t('login')}
              {activeTab === 'login' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-500"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 pb-3 text-center font-medium transition-colors relative ${
                activeTab === 'register' ? 'text-white' : 'text-slate-400'
              }`}
            >
              {t('register')}
              {activeTab === 'register' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-500"
                />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={loginMethod === 'phone' ? handlePhoneLogin : handleEmailLogin}
                className="space-y-4"
              >
                {renderLoginMethodToggle()}

                {loginMethod === 'phone' ? (
                  <>
                    {renderPhoneInput(loginData, setLoginData)}
                    {renderVerificationCode(loginData, setLoginData)}
                  </>
                ) : (
                  <>
                    {renderEmailInput(loginData, setLoginData)}
                    {renderPasswordInput(loginData, setLoginData)}
                  </>
                )}
                
                {renderInviteCode(loginData, setLoginData)}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('loading')}
                    </>
                  ) : (
                    t('login')
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={loading}
                  className="w-full h-12 bg-slate-700 border border-slate-600 rounded-xl font-medium text-slate-300 hover:bg-slate-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  {t('guest')} ({t('trial')}: 7{t('days')})
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={loginMethod === 'phone' ? handlePhoneRegister : handleEmailRegister}
                className="space-y-4"
              >
                {renderLoginMethodToggle()}

                {loginMethod === 'phone' ? (
                  <>
                    {renderPhoneInput(registerData, setRegisterData)}
                    {renderVerificationCode(registerData, setRegisterData)}
                  </>
                ) : (
                  <>
                    {renderEmailInput(registerData, setRegisterData)}
                    {renderPasswordInput(registerData, setRegisterData)}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">{t('confirmPassword')}</label>
                      <input
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        placeholder={t('confirmPassword')}
                        className="w-full h-12 px-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-red-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </>
                )}
                
                {renderInviteCode(registerData, setRegisterData)}

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={registerData.agreeTerms}
                    onChange={(e) => setRegisterData({ ...registerData, agreeTerms: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-400">
                    {t('agreeTerms')}
                  </span>
                </label>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('loading')}
                    </>
                  ) : (
                    t('register')
                  )}
                </button>

                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-amber-400">
                    {t('trial')}: 7{t('days')} {t('free')}
                  </span>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          <Link to="/" className="hover:text-slate-400 transition-colors">{t('home')}</Link>
        </p>
      </motion.div>
    </div>
  );
}
