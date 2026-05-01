import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  MapPin,
  Clock,
  ChevronRight
} from 'lucide-react';

const countries = [
  {
    name: '乌克兰政府控制区（基辅、利沃夫、敖德萨等）',
    cities: ['基辅', '哈尔科夫', '敖德萨', '第聂伯罗', '利沃夫']
  },
  {
    name: '以色列',
    cities: ['特拉维夫', '耶路撒冷', '海法', '贝尔谢巴']
  },
  {
    name: '阿联酋',
    cities: ['迪拜', '阿布扎比', '沙迦']
  },
  {
    name: '科威特',
    cities: ['科威特城']
  },
  {
    name: '巴林',
    cities: ['麦纳麦']
  },
  {
    name: '约旦',
    cities: ['安曼', '亚喀巴']
  },
  {
    name: '海地',
    cities: ['太子港']
  },
  {
    name: '尼日利亚',
    cities: ['拉各斯', '阿布贾', '卡诺']
  }
];

const recentCities = ['基辅', '特拉维夫'];

export default function CitySelect() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCountries, setFilteredCountries] = useState(countries);

  useEffect(() => {
    if (searchQuery) {
      const filtered = countries
        .map(country => ({
          ...country,
          cities: country.cities.filter(city =>
            city.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }))
        .filter(country =>
          country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          country.cities.length > 0
        );
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries(countries);
    }
  }, [searchQuery]);

  const handleSelectCity = (city: string) => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <span className="text-xl font-bold">选择城市</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索城市"
              className="flex-1 h-10 bg-transparent text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
        </motion.div>

        {!searchQuery && recentCities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              最近选择
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleSelectCity(city)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {filteredCountries.map((country, index) => (
            <motion.div
              key={country.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <h3 className="font-semibold text-slate-400 mb-3">{country.name}</h3>
              <div className="space-y-2">
                {country.cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => handleSelectCity(city)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="flex-1 text-left font-medium">{city}</span>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
