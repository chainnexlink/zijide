-- ============================================================
-- 战区避难所数据 - 覆盖主要冲突地区
-- 包含: 乌克兰、以色列/巴勒斯坦、叙利亚、黎巴嫩、伊拉克、也门、苏丹
-- 数据基于真实城市坐标，避难所位置为近似值
-- ============================================================

-- 先清空旧数据（如有）
DELETE FROM public.shelters;

-- ============================================================
-- 1. 乌克兰 (Ukraine) - 5城市 30个避难所
-- ============================================================

-- Kyiv 基辅 (6个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Kyiv Metro Arsenalna Station Shelter', 'Arsenalna Metro Station, Moskovska St, Kyiv', 50.44380000, 30.54550000, 'Kyiv', 'Ukraine', 2000, 342, 'open', true, true, true, true, true, '+380-44-238-5000', '24/7'),
('Kyiv Metro Khreshchatyk Shelter', 'Khreshchatyk Metro Station, Khreshchatyk St, Kyiv', 50.44720000, 30.52250000, 'Kyiv', 'Ukraine', 1500, 218, 'open', true, true, true, true, true, '+380-44-238-5001', '24/7'),
('Independence Square Underground Complex', 'Maidan Nezalezhnosti, Underground Mall, Kyiv', 50.45010000, 30.52340000, 'Kyiv', 'Ukraine', 800, 156, 'open', true, true, false, true, true, '+380-44-278-1234', '24/7'),
('Pechersk District Civil Defense Shelter', '12 Lesi Ukrainky Blvd, Pechersk, Kyiv', 50.43200000, 30.54100000, 'Kyiv', 'Ukraine', 500, 89, 'open', true, true, true, true, false, '+380-44-285-6789', '06:00-22:00'),
('Obolon Community Shelter', '25 Heroiv Dnipra St, Obolon, Kyiv', 50.50100000, 30.49800000, 'Kyiv', 'Ukraine', 350, 124, 'open', true, false, false, true, true, '+380-44-413-2222', '24/7'),
('Sviatoshyno School Basement Shelter', '8 Zabolotnoho St, Sviatoshyno, Kyiv', 50.45800000, 30.37200000, 'Kyiv', 'Ukraine', 200, 67, 'open', true, true, false, true, false, '+380-44-450-3333', '07:00-21:00');

-- Kharkiv 哈尔科夫 (6个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Kharkiv Metro Derzhprom Station', 'Derzhprom Metro Station, Svobody Square, Kharkiv', 49.99350000, 36.23040000, 'Kharkiv', 'Ukraine', 1200, 456, 'open', true, true, true, true, true, '+380-57-705-5000', '24/7'),
('Kharkiv Metro Pushkinska Station', 'Pushkinska Metro Station, Pushkinska St, Kharkiv', 49.99800000, 36.24500000, 'Kharkiv', 'Ukraine', 1000, 389, 'open', true, true, true, true, true, '+380-57-705-5001', '24/7'),
('Saltivka District Bunker', '122 Heroiv Pratsi Ave, Saltivka, Kharkiv', 50.02500000, 36.30100000, 'Kharkiv', 'Ukraine', 600, 234, 'open', true, true, true, true, false, '+380-57-340-1111', '24/7'),
('Kharkiv University Underground Shelter', '4 Svobody Square, Kharkiv National University', 49.99100000, 36.22800000, 'Kharkiv', 'Ukraine', 400, 112, 'open', true, true, false, true, true, '+380-57-707-5500', '24/7'),
('Kholodna Hora Community Shelter', '45 Poltavsky Shlyakh, Kholodna Hora, Kharkiv', 49.97800000, 36.25600000, 'Kharkiv', 'Ukraine', 300, 201, 'crowded', true, false, false, true, false, '+380-57-712-3344', '06:00-23:00'),
('Nemyshlyansky Hospital Bunker', '2 Balakirieva St, Kharkiv', 49.98500000, 36.28900000, 'Kharkiv', 'Ukraine', 250, 89, 'open', true, true, true, true, true, '+380-57-738-9900', '24/7');

-- Odesa 敖德萨 (6个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Odesa Catacombs Emergency Shelter', 'Nerubayskoye, Catacombs Complex, Odesa', 46.48000000, 30.65000000, 'Odesa', 'Ukraine', 1500, 89, 'open', true, false, true, true, true, '+380-48-723-5000', '24/7'),
('Privoz Market Underground Shelter', '14 Privozna St, Central District, Odesa', 46.47100000, 30.74200000, 'Odesa', 'Ukraine', 600, 145, 'open', true, true, false, true, false, '+380-48-729-1111', '06:00-22:00'),
('Odesa Railway Station Shelter', '2 Pryvokzalna Square, Odesa', 46.47800000, 30.72900000, 'Odesa', 'Ukraine', 800, 234, 'open', true, true, true, true, true, '+380-48-727-4000', '24/7'),
('Arcadia Beach Underground Bunker', '1 Arcadia Lane, Primorsky District, Odesa', 46.43500000, 30.75800000, 'Odesa', 'Ukraine', 400, 56, 'open', true, true, false, true, true, '+380-48-746-2222', '24/7'),
('Moldavanka School Shelter', '78 Balkivska St, Moldavanka, Odesa', 46.46200000, 30.72100000, 'Odesa', 'Ukraine', 250, 123, 'open', true, false, false, true, false, '+380-48-722-5555', '07:00-21:00'),
('Port District Civil Defense', '15 Tamozhenna Square, Port Area, Odesa', 46.48900000, 30.74500000, 'Odesa', 'Ukraine', 350, 78, 'open', true, true, true, true, false, '+380-48-729-8800', '24/7');

-- Dnipro 第聂伯罗 (6个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Dnipro Central Metro Shelter', 'Vokzalna Square Metro Station, Dnipro', 48.46500000, 35.04800000, 'Dnipro', 'Ukraine', 1000, 278, 'open', true, true, true, true, true, '+380-56-744-5000', '24/7'),
('Dnipro Arena Underground Complex', '55 Naberezhna Peremohy St, Dnipro', 48.44200000, 35.03700000, 'Dnipro', 'Ukraine', 800, 145, 'open', true, true, false, true, true, '+380-56-370-1111', '24/7'),
('Samart District Community Bunker', '32 Heroiv Ave, Samart District, Dnipro', 48.47800000, 35.05600000, 'Dnipro', 'Ukraine', 500, 234, 'open', true, true, true, true, false, '+380-56-744-3333', '06:00-23:00'),
('Dnipro Industrial Zone Shelter', '7 Metalurhiv Square, Industrial District', 48.45000000, 35.08200000, 'Dnipro', 'Ukraine', 600, 89, 'open', true, false, false, true, false, '+380-56-790-4444', '24/7'),
('Kalynovy Community Center Shelter', '14 Kalynova St, Dnipro', 48.42500000, 35.06100000, 'Dnipro', 'Ukraine', 200, 67, 'open', true, true, false, true, true, '+380-56-374-5555', '07:00-22:00'),
('Dnipro University Campus Shelter', '36 Haharina Ave, University District', 48.45500000, 35.06500000, 'Dnipro', 'Ukraine', 350, 112, 'open', true, true, true, true, true, '+380-56-745-6666', '24/7');

-- Lviv 利沃夫 (6个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Lviv Opera House Basement Shelter', '28 Svobody Ave, Central Lviv', 49.84300000, 24.02600000, 'Lviv', 'Ukraine', 500, 45, 'open', true, true, true, true, true, '+380-32-235-5000', '24/7'),
('Lviv Railway Station Shelter', '1 Dvirtseva Square, Lviv', 49.83900000, 24.03400000, 'Lviv', 'Ukraine', 800, 123, 'open', true, true, true, true, true, '+380-32-226-2028', '24/7'),
('Shevchenkivsky District Bunker', '55 Shevchenko St, Shevchenkivsky, Lviv', 49.84700000, 24.03900000, 'Lviv', 'Ukraine', 400, 67, 'open', true, true, false, true, false, '+380-32-261-3333', '06:00-23:00'),
('Lychakiv Community Shelter', '120 Lychakivska St, Lychakiv, Lviv', 49.83600000, 24.05200000, 'Lviv', 'Ukraine', 300, 34, 'open', true, false, false, true, true, '+380-32-275-4444', '07:00-22:00'),
('Sykhiv District Public Shelter', '12 Sykhiv Blvd, Sykhiv, Lviv', 49.80100000, 24.04500000, 'Lviv', 'Ukraine', 600, 89, 'open', true, true, true, true, true, '+380-32-244-5555', '24/7'),
('Lviv Polytechnic University Shelter', '12 Bandery St, University Campus, Lviv', 49.83500000, 24.01400000, 'Lviv', 'Ukraine', 450, 56, 'open', true, true, false, true, true, '+380-32-258-6666', '24/7');

-- ============================================================
-- 2. 以色列 (Israel) - 5城市 25个避难所
-- ============================================================

-- Tel Aviv 特拉维夫 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Dizengoff Center Public Shelter', 'Dizengoff Center, 50 Dizengoff St, Tel Aviv', 32.07700000, 34.77500000, 'Tel Aviv', 'Israel', 1200, 234, 'open', true, true, true, true, true, '+972-3-621-2400', '24/7'),
('Rabin Square Underground Shelter', 'Rabin Square, Ibn Gabirol St, Tel Aviv', 32.08130000, 34.78100000, 'Tel Aviv', 'Israel', 800, 167, 'open', true, true, true, true, true, '+972-3-524-4111', '24/7'),
('Tel Aviv Central Bus Station Shelter', '108 Levinsky St, Tel Aviv', 32.05600000, 34.77200000, 'Tel Aviv', 'Israel', 1500, 456, 'open', true, true, true, true, true, '+972-3-639-4854', '24/7'),
('HaYarkon Park Bunker', 'HaYarkon Park North Entrance, Tel Aviv', 32.10200000, 34.78800000, 'Tel Aviv', 'Israel', 500, 89, 'open', true, true, false, true, true, '+972-3-642-2828', '24/7'),
('Neve Tzedek Community Safe Room', '22 Shabazi St, Neve Tzedek, Tel Aviv', 32.06100000, 34.76600000, 'Tel Aviv', 'Israel', 200, 45, 'open', true, true, false, true, false, '+972-3-516-7788', '24/7');

-- Jerusalem 耶路撒冷 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Mamilla Underground Shelter', 'Mamilla Ave, Near Jaffa Gate, Jerusalem', 31.77700000, 35.22400000, 'Jerusalem', 'Israel', 1000, 234, 'open', true, true, true, true, true, '+972-2-629-1111', '24/7'),
('Mahane Yehuda Market Shelter', 'Mahane Yehuda St, Jerusalem', 31.78500000, 35.21200000, 'Jerusalem', 'Israel', 600, 189, 'open', true, true, false, true, false, '+972-2-625-4444', '24/7'),
('German Colony Community Shelter', '18 Emek Refaim St, German Colony, Jerusalem', 31.76200000, 35.22100000, 'Jerusalem', 'Israel', 400, 78, 'open', true, true, true, true, true, '+972-2-561-2222', '24/7'),
('Hebrew University Bunker', 'Mount Scopus Campus, Hebrew University, Jerusalem', 31.79200000, 35.24500000, 'Jerusalem', 'Israel', 800, 123, 'open', true, true, true, true, true, '+972-2-658-5555', '24/7'),
('Talpiot Industrial Zone Shelter', '5 HaOman St, Talpiot, Jerusalem', 31.74800000, 35.22800000, 'Jerusalem', 'Israel', 500, 156, 'open', true, true, false, true, false, '+972-2-672-3333', '06:00-23:00');

-- Haifa 海法 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Haifa Carmelit Station Underground Shelter', 'Carmelit Subway, Paris Square, Haifa', 32.81900000, 34.98800000, 'Haifa', 'Israel', 600, 134, 'open', true, true, true, true, true, '+972-4-837-6767', '24/7'),
('Bat Galim Beachfront Shelter', '5 Bat Galim Ave, Haifa', 32.82800000, 34.96200000, 'Haifa', 'Israel', 300, 56, 'open', true, true, false, true, false, '+972-4-851-2345', '24/7'),
('Hadar District Community Shelter', '42 Herzl St, Hadar HaCarmel, Haifa', 32.80500000, 34.99100000, 'Haifa', 'Israel', 450, 189, 'open', true, true, true, true, true, '+972-4-862-4567', '24/7'),
('Technion Campus Emergency Shelter', 'Technion City, Haifa', 32.77700000, 35.02200000, 'Haifa', 'Israel', 800, 67, 'open', true, true, true, true, true, '+972-4-829-9999', '24/7'),
('Krayot Industrial Bunker', '15 HaAtzmaut Rd, Kiryat Ata, Haifa', 32.80900000, 35.10400000, 'Haifa', 'Israel', 500, 234, 'open', true, false, false, true, false, '+972-4-844-5678', '06:00-22:00');

-- Beersheba 贝尔谢巴 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Beersheba Old City Underground Shelter', 'Smilanski St, Old City, Beersheba', 31.24300000, 34.79200000, 'Beersheba', 'Israel', 500, 123, 'open', true, true, true, true, true, '+972-8-629-1111', '24/7'),
('Negev Mall Basement Shelter', 'Derech Hebron 21, Beersheba', 31.24800000, 34.78400000, 'Beersheba', 'Israel', 800, 267, 'open', true, true, false, true, true, '+972-8-623-4567', '24/7'),
('Ben-Gurion University Safe Zone', 'BGU Campus, Beersheba', 31.26200000, 34.80100000, 'Beersheba', 'Israel', 1000, 89, 'open', true, true, true, true, true, '+972-8-646-1111', '24/7'),
('Ramot Community Shelter', '8 Yitzhak Rager Ave, Ramot, Beersheba', 31.23100000, 34.77800000, 'Beersheba', 'Israel', 300, 145, 'open', true, true, false, true, false, '+972-8-641-2222', '24/7'),
('Soroka Hospital Emergency Bunker', '151 Rager Ave, Beersheba', 31.25800000, 34.80000000, 'Beersheba', 'Israel', 400, 78, 'open', true, true, true, true, true, '+972-8-640-5555', '24/7');

-- Ashdod 阿什杜德 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Ashdod City Center Public Shelter', '15 HaAtzmaut Ave, Ashdod', 31.80100000, 34.64600000, 'Ashdod', 'Israel', 600, 178, 'open', true, true, true, true, true, '+972-8-854-1111', '24/7'),
('Ashdod Marina Underground Shelter', 'Marina District, Ashdod', 31.79500000, 34.63200000, 'Ashdod', 'Israel', 400, 89, 'open', true, true, false, true, true, '+972-8-856-2222', '24/7'),
('Gimmel District Community Shelter', '45 Menachem Begin Blvd, Ashdod', 31.80800000, 34.65400000, 'Ashdod', 'Israel', 350, 134, 'open', true, true, true, true, false, '+972-8-851-3333', '24/7'),
('Ashdod Port Workers Bunker', 'Port Zone B, Industrial Area, Ashdod', 31.82200000, 34.63800000, 'Ashdod', 'Israel', 500, 45, 'open', true, false, false, true, false, '+972-8-857-4444', '06:00-22:00'),
('HaYovel School Emergency Shelter', '28 HaYovel St, Ashdod', 31.79200000, 34.65100000, 'Ashdod', 'Israel', 250, 67, 'open', true, true, false, true, true, '+972-8-853-5555', '24/7');

-- ============================================================
-- 3. 巴勒斯坦 (Palestine) - 5城市 20个避难所
-- ============================================================

-- Gaza 加沙 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('UNRWA Beach Camp Shelter', 'Al-Shati Refugee Camp, Gaza City', 31.52800000, 34.43200000, 'Gaza', 'Palestine', 2000, 1567, 'crowded', true, false, true, true, true, '+970-8-282-5000', '24/7'),
('Al-Shifa Hospital Emergency Zone', 'Al-Shifa Medical Complex, Rimal, Gaza', 31.52400000, 34.44100000, 'Gaza', 'Palestine', 1500, 1234, 'crowded', true, false, true, true, true, '+970-8-286-4000', '24/7'),
('UNRWA Jabalia School Shelter', 'Jabalia Refugee Camp, Northern Gaza', 31.54500000, 34.48200000, 'Gaza', 'Palestine', 1200, 987, 'crowded', true, false, true, true, false, '+970-8-245-1111', '24/7'),
('Islamic University Underground Shelter', 'Al-Rimal District, Gaza City', 31.51500000, 34.44800000, 'Gaza', 'Palestine', 800, 678, 'crowded', true, false, false, true, false, '+970-8-286-2222', '24/7'),
('Red Crescent Society Shelter', 'Omar Al-Mukhtar St, Gaza City', 31.50500000, 34.46100000, 'Gaza', 'Palestine', 600, 523, 'crowded', true, false, true, true, true, '+970-8-284-3333', '24/7');

-- Ramallah 拉马拉 (4个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Ramallah Municipal Emergency Shelter', 'Al-Manara Square Area, Ramallah', 31.90200000, 35.20400000, 'Ramallah', 'Palestine', 500, 89, 'open', true, true, true, true, true, '+970-2-295-1111', '24/7'),
('Red Crescent Ramallah Center', '15 Hospital St, Ramallah', 31.89800000, 35.20100000, 'Ramallah', 'Palestine', 300, 67, 'open', true, true, true, true, false, '+970-2-240-6666', '24/7'),
('Birzeit University Safe Area', 'Birzeit Campus, Near Ramallah', 31.95800000, 35.17600000, 'Ramallah', 'Palestine', 400, 45, 'open', true, true, false, true, true, '+970-2-298-2222', '07:00-22:00'),
('Al-Bireh Community Shelter', 'Al-Bireh, Adjacent to Ramallah', 31.91100000, 35.21800000, 'Ramallah', 'Palestine', 250, 34, 'open', true, true, false, true, false, '+970-2-240-3333', '24/7');

-- Nablus 纳布卢斯 (4个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('An-Najah University Emergency Shelter', 'An-Najah National University, Nablus', 32.22600000, 35.22800000, 'Nablus', 'Palestine', 500, 123, 'open', true, true, false, true, true, '+970-9-234-5000', '24/7'),
('Nablus Old City Shelter', 'Old City Market Area, Nablus', 32.22200000, 35.26000000, 'Nablus', 'Palestine', 300, 89, 'open', true, false, false, true, false, '+970-9-237-1111', '24/7'),
('Balata Camp UNRWA Shelter', 'Balata Refugee Camp, East Nablus', 32.21800000, 35.28500000, 'Nablus', 'Palestine', 800, 567, 'crowded', true, false, true, true, true, '+970-9-234-2222', '24/7'),
('Rafidia Hospital Emergency Zone', 'Rafidia Hospital, West Nablus', 32.22800000, 35.24200000, 'Nablus', 'Palestine', 400, 156, 'open', true, true, true, true, true, '+970-9-239-3333', '24/7');

-- Hebron 希伯伦 (4个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Hebron University Civil Defense Shelter', 'Hebron University, Hebron', 31.52200000, 35.09500000, 'Hebron', 'Palestine', 400, 89, 'open', true, true, false, true, true, '+970-2-222-0510', '24/7'),
('Old City Ibrahimi Mosque Shelter', 'Near Ibrahimi Mosque, Old City, Hebron', 31.52400000, 35.11100000, 'Hebron', 'Palestine', 300, 145, 'open', true, false, false, true, false, '+970-2-222-1111', '24/7'),
('Red Crescent Hebron Shelter', '25 Ein Sarah St, Hebron', 31.53200000, 35.10200000, 'Hebron', 'Palestine', 350, 67, 'open', true, true, true, true, true, '+970-2-222-2222', '24/7'),
('Alia Hospital Emergency Shelter', 'Alia Government Hospital, Hebron', 31.53000000, 35.09800000, 'Hebron', 'Palestine', 500, 234, 'open', true, true, true, true, true, '+970-2-222-5000', '24/7');

-- Bethlehem 伯利恒 (3个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Bethlehem Municipal Shelter', 'Manger Square Area, Bethlehem', 31.70400000, 35.20800000, 'Bethlehem', 'Palestine', 400, 56, 'open', true, true, true, true, true, '+970-2-274-1111', '24/7'),
('Dheisheh Camp UNRWA Shelter', 'Dheisheh Refugee Camp, South Bethlehem', 31.69200000, 35.19500000, 'Bethlehem', 'Palestine', 600, 345, 'open', true, false, true, true, false, '+970-2-274-2222', '24/7'),
('Beit Jala Community Center Shelter', 'Beit Jala, Adjacent to Bethlehem', 31.71500000, 35.19200000, 'Bethlehem', 'Palestine', 250, 34, 'open', true, true, false, true, true, '+970-2-274-3333', '07:00-22:00');

-- ============================================================
-- 4. 叙利亚 (Syria) - 5城市 25个避难所
-- ============================================================

-- Damascus 大马士革 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Damascus Old City Underground Shelter', 'Souq Al-Hamidiyah, Old City, Damascus', 33.51200000, 36.30600000, 'Damascus', 'Syria', 800, 234, 'open', true, true, true, true, true, '+963-11-221-5000', '24/7'),
('Umayyad Square Civil Defense', 'Umayyad Square, Central Damascus', 33.51300000, 36.27600000, 'Damascus', 'Syria', 1000, 389, 'open', true, true, true, true, true, '+963-11-331-1111', '24/7'),
('Mezzeh Highway Bunker', '66 Mezzeh Highway, Damascus', 33.50200000, 36.24500000, 'Damascus', 'Syria', 600, 145, 'open', true, true, false, true, false, '+963-11-612-2222', '24/7'),
('Syrian Red Crescent Damascus Center', 'Saroujah, Damascus', 33.52000000, 36.29800000, 'Damascus', 'Syria', 500, 267, 'open', true, true, true, true, true, '+963-11-441-3333', '24/7'),
('Jobar District Community Shelter', 'Jobar, Eastern Damascus', 33.52800000, 36.34200000, 'Damascus', 'Syria', 400, 189, 'open', true, false, false, true, false, '+963-11-544-4444', '24/7');

-- Aleppo 阿勒颇 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Aleppo Citadel District Shelter', 'Near Aleppo Citadel, Old City', 36.19900000, 37.16100000, 'Aleppo', 'Syria', 500, 234, 'open', true, false, true, true, false, '+963-21-221-5000', '24/7'),
('Al-Aziziyah Community Bunker', 'Al-Aziziyah District, Aleppo', 36.20800000, 37.15200000, 'Aleppo', 'Syria', 600, 345, 'open', true, true, false, true, true, '+963-21-268-1111', '24/7'),
('Aleppo University Emergency Shelter', 'Aleppo University Campus', 36.21500000, 37.12800000, 'Aleppo', 'Syria', 800, 234, 'open', true, true, true, true, true, '+963-21-267-2222', '24/7'),
('White Helmets Sakhour Center', 'Sakhour District, East Aleppo', 36.22200000, 37.18500000, 'Aleppo', 'Syria', 400, 189, 'crowded', true, false, true, true, false, '+963-21-263-3333', '24/7'),
('Saif Al-Dawla Public Shelter', 'Saif Al-Dawla, West Aleppo', 36.19200000, 37.11500000, 'Aleppo', 'Syria', 350, 123, 'open', true, true, false, true, true, '+963-21-226-4444', '24/7');

-- Homs 霍姆斯 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Homs National Hospital Shelter', 'Al-Insha''at, Homs', 34.73500000, 36.72800000, 'Homs', 'Syria', 600, 234, 'open', true, true, true, true, true, '+963-31-221-5000', '24/7'),
('Old Homs Community Center', 'Old City Area, Central Homs', 34.73000000, 36.71200000, 'Homs', 'Syria', 400, 189, 'open', true, false, false, true, false, '+963-31-213-1111', '24/7'),
('Al-Waer District Shelter', 'Al-Waer, West Homs', 34.74800000, 36.67500000, 'Homs', 'Syria', 500, 267, 'open', true, true, true, true, true, '+963-31-261-2222', '24/7'),
('Homs Stadium Underground Bunker', 'Khalid Ibn Al-Walid Stadium, Homs', 34.72600000, 36.70800000, 'Homs', 'Syria', 1000, 345, 'open', true, true, false, true, true, '+963-31-222-3333', '24/7'),
('SARC Homs Emergency Center', 'Syrian Arab Red Crescent, Homs', 34.74000000, 36.73500000, 'Homs', 'Syria', 300, 145, 'open', true, true, true, true, true, '+963-31-231-4444', '24/7');

-- Latakia 拉塔基亚 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Latakia Port District Shelter', 'Port Area, Latakia', 35.52200000, 35.78600000, 'Latakia', 'Syria', 500, 89, 'open', true, true, true, true, true, '+963-41-472-5000', '24/7'),
('Al-Raml Community Center', 'Al-Raml District, Central Latakia', 35.53000000, 35.79200000, 'Latakia', 'Syria', 350, 67, 'open', true, true, false, true, false, '+963-41-411-1111', '24/7'),
('Tishreen University Shelter', 'Tishreen University Campus, Latakia', 35.51500000, 35.80100000, 'Latakia', 'Syria', 600, 123, 'open', true, true, true, true, true, '+963-41-428-2222', '24/7'),
('Latakia National Hospital Bunker', 'Hospital St, Latakia', 35.52800000, 35.78900000, 'Latakia', 'Syria', 400, 56, 'open', true, true, true, true, true, '+963-41-416-3333', '24/7'),
('Al-Slibeh Public Shelter', 'Al-Slibeh, South Latakia', 35.50800000, 35.77200000, 'Latakia', 'Syria', 250, 34, 'open', true, false, false, true, false, '+963-41-444-4444', '06:00-22:00');

-- Raqqa 拉卡 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Raqqa Central Civil Defense Shelter', 'Al-Rashid Park Area, Central Raqqa', 35.95500000, 39.01200000, 'Raqqa', 'Syria', 500, 189, 'open', true, false, true, true, false, '+963-22-221-5000', '24/7'),
('UNICEF Raqqa Emergency Center', 'Near Clock Tower, Raqqa', 35.94800000, 38.99800000, 'Raqqa', 'Syria', 400, 234, 'open', true, true, true, true, true, '+963-22-222-1111', '24/7'),
('Al-Tabqa Dam Workers Shelter', 'Al-Tabqa, West Raqqa', 35.83200000, 38.54500000, 'Raqqa', 'Syria', 300, 145, 'open', true, true, false, true, false, '+963-22-223-2222', '24/7'),
('Raqqa National Hospital Shelter', 'Hospital District, Raqqa', 35.95200000, 39.00500000, 'Raqqa', 'Syria', 350, 167, 'open', true, false, true, true, true, '+963-22-224-3333', '24/7'),
('White Helmets Raqqa Station', 'Eastern Raqqa', 35.96000000, 39.02500000, 'Raqqa', 'Syria', 250, 89, 'open', true, false, false, true, false, '+963-22-225-4444', '24/7');

-- ============================================================
-- 5. 黎巴嫩 (Lebanon) - 4城市 16个避难所
-- ============================================================

-- Beirut 贝鲁特 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Beirut Central District Shelter', 'Martyrs Square, Downtown Beirut', 33.89700000, 35.50400000, 'Beirut', 'Lebanon', 800, 234, 'open', true, true, true, true, true, '+961-1-980-000', '24/7'),
('AUBMC Hospital Emergency Bunker', 'American University Medical Center, Hamra', 33.90000000, 35.48200000, 'Beirut', 'Lebanon', 500, 189, 'open', true, true, true, true, true, '+961-1-350-000', '24/7'),
('Hamra Underground Parking Shelter', 'Hamra St Underground Complex, Beirut', 33.89400000, 35.48600000, 'Beirut', 'Lebanon', 600, 123, 'open', true, true, false, true, false, '+961-1-753-111', '24/7'),
('Dahieh Community Emergency Center', 'Haret Hreik, Southern Suburbs, Beirut', 33.85800000, 35.50200000, 'Beirut', 'Lebanon', 1000, 567, 'crowded', true, false, true, true, true, '+961-1-274-222', '24/7'),
('Lebanese Red Cross Ashrafieh Shelter', 'Ashrafieh, East Beirut', 33.88900000, 35.52300000, 'Beirut', 'Lebanon', 400, 89, 'open', true, true, true, true, true, '+961-1-372-333', '24/7');

-- Tripoli 的黎波里 (4个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Tripoli Old City Citadel Shelter', 'Near Citadel of Raymond de Saint-Gilles', 34.43600000, 35.84200000, 'Tripoli', 'Lebanon', 500, 145, 'open', true, true, true, true, true, '+961-6-430-111', '24/7'),
('Al-Mina Community Center', 'Al-Mina District, Tripoli', 34.44800000, 35.82500000, 'Tripoli', 'Lebanon', 350, 78, 'open', true, true, false, true, false, '+961-6-411-222', '24/7'),
('Tripoli Government Hospital Shelter', 'Hospital Area, Tripoli', 34.43200000, 35.84800000, 'Tripoli', 'Lebanon', 400, 167, 'open', true, true, true, true, true, '+961-6-441-333', '24/7'),
('Bab Al-Tabbaneh Public Shelter', 'Bab Al-Tabbaneh, Tripoli', 34.44100000, 35.85500000, 'Tripoli', 'Lebanon', 300, 234, 'crowded', true, false, false, true, false, '+961-6-432-444', '24/7');

-- Sidon 赛达 (4个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Sidon Sea Castle District Shelter', 'Old Port Area, Sidon', 33.56200000, 35.37100000, 'Sidon', 'Lebanon', 400, 89, 'open', true, true, true, true, true, '+961-7-720-111', '24/7'),
('UNRWA Ain El-Hilweh Shelter', 'Ain El-Hilweh Camp, East Sidon', 33.55800000, 35.39200000, 'Sidon', 'Lebanon', 1500, 1123, 'crowded', true, false, true, true, false, '+961-7-723-222', '24/7'),
('Sidon Government Hospital Shelter', 'Sidon Governmental Hospital', 33.56800000, 35.37800000, 'Sidon', 'Lebanon', 300, 67, 'open', true, true, true, true, true, '+961-7-721-333', '24/7'),
('East Sidon Community Center', 'Eastern Sidon, Residential Area', 33.55200000, 35.38500000, 'Sidon', 'Lebanon', 250, 45, 'open', true, true, false, true, true, '+961-7-724-444', '06:00-23:00');

-- Tyre 提尔 (3个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Tyre Old City Emergency Shelter', 'Old City, Al-Bass Area, Tyre', 33.27200000, 35.19400000, 'Tyre', 'Lebanon', 400, 123, 'open', true, true, true, true, true, '+961-7-741-111', '24/7'),
('UNIFIL Coordination Shelter', 'Near UNIFIL Base, Tyre District', 33.28100000, 35.20800000, 'Tyre', 'Lebanon', 500, 89, 'open', true, true, true, true, true, '+961-7-740-222', '24/7'),
('Tyre Public School Shelter', 'Municipal School Complex, Tyre', 33.26800000, 35.19800000, 'Tyre', 'Lebanon', 300, 167, 'open', true, false, false, true, false, '+961-7-742-333', '24/7');

-- ============================================================
-- 6. 伊拉克 (Iraq) - 4城市 16个避难所
-- ============================================================

-- Baghdad 巴格达 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Baghdad Green Zone Emergency Shelter', 'International Zone, Central Baghdad', 33.30100000, 44.38500000, 'Baghdad', 'Iraq', 1000, 234, 'open', true, true, true, true, true, '+964-770-123-4567', '24/7'),
('Kadhimiya Mosque Complex Shelter', 'Al-Kadhimiya, North Baghdad', 33.38200000, 44.34100000, 'Baghdad', 'Iraq', 800, 345, 'open', true, true, true, true, true, '+964-770-234-5678', '24/7'),
('Al-Rasheed Hotel Basement Shelter', 'Yafa St, Central Baghdad', 33.30800000, 44.39200000, 'Baghdad', 'Iraq', 500, 123, 'open', true, true, false, true, true, '+964-770-345-6789', '24/7'),
('Sadr City Community Shelter', 'Sadr City District, East Baghdad', 33.39500000, 44.44200000, 'Baghdad', 'Iraq', 1200, 567, 'open', true, false, true, true, false, '+964-770-456-7890', '24/7'),
('Baghdad Medical City Emergency Zone', 'Bab Al-Muadham, Baghdad', 33.35200000, 44.38800000, 'Baghdad', 'Iraq', 600, 234, 'open', true, true, true, true, true, '+964-770-567-8901', '24/7');

-- Mosul 摩苏尔 (4个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Mosul University Emergency Shelter', 'University of Mosul Campus', 36.36200000, 43.15800000, 'Mosul', 'Iraq', 600, 234, 'open', true, true, true, true, true, '+964-770-678-9012', '24/7'),
('Old Mosul Community Center', 'Old City, Near Al-Nuri Mosque', 36.34500000, 43.13200000, 'Mosul', 'Iraq', 400, 189, 'open', true, false, true, true, false, '+964-770-789-0123', '24/7'),
('Al-Khazer Camp Shelter', 'IDP Camp, South Mosul', 36.28000000, 43.38000000, 'Mosul', 'Iraq', 2000, 1456, 'crowded', true, true, true, true, true, '+964-770-890-1234', '24/7'),
('Mosul General Hospital Bunker', 'Hospital District, East Mosul', 36.35000000, 43.17200000, 'Mosul', 'Iraq', 500, 123, 'open', true, true, true, true, true, '+964-770-901-2345', '24/7');

-- Erbil 埃尔比勒 (4个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Erbil Citadel Area Shelter', 'Near Erbil Citadel, Central Erbil', 36.19100000, 44.00800000, 'Erbil', 'Iraq', 500, 67, 'open', true, true, true, true, true, '+964-750-123-4567', '24/7'),
('Ankawa Community Center Shelter', 'Ankawa District, North Erbil', 36.22800000, 43.99200000, 'Erbil', 'Iraq', 400, 89, 'open', true, true, true, true, true, '+964-750-234-5678', '24/7'),
('Kurdistan Regional Govt Shelter', 'Government Area, Erbil', 36.18600000, 44.01200000, 'Erbil', 'Iraq', 600, 45, 'open', true, true, true, true, true, '+964-750-345-6789', '24/7'),
('Erbil Family Mall Basement Shelter', 'Gulan St, Family Mall, Erbil', 36.20500000, 44.02800000, 'Erbil', 'Iraq', 800, 123, 'open', true, true, false, true, true, '+964-750-456-7890', '24/7');

-- Basra 巴士拉 (3个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Basra City Center Shelter', 'Corniche Area, Central Basra', 30.50800000, 47.78300000, 'Basra', 'Iraq', 500, 89, 'open', true, true, true, true, true, '+964-770-012-3456', '24/7'),
('Basra University Emergency Zone', 'University of Basra Campus', 30.52200000, 47.80100000, 'Basra', 'Iraq', 400, 67, 'open', true, true, false, true, true, '+964-770-123-4560', '24/7'),
('Al-Ashar District Shelter', 'Al-Ashar, Old Basra', 30.49500000, 47.84200000, 'Basra', 'Iraq', 350, 123, 'open', true, false, true, true, false, '+964-770-234-5670', '24/7');

-- ============================================================
-- 7. 也门 (Yemen) - 3城市 12个避难所
-- ============================================================

-- Sanaa 萨那 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Old Sanaa UNESCO Heritage Shelter', 'Old City, Bab Al-Yemen Area, Sanaa', 15.35400000, 44.20600000, 'Sanaa', 'Yemen', 600, 345, 'open', true, false, true, true, true, '+967-1-276-111', '24/7'),
('Al-Thawra Hospital Emergency Zone', 'Al-Thawra General Hospital, Sanaa', 15.36200000, 44.19800000, 'Sanaa', 'Yemen', 500, 234, 'open', true, true, true, true, true, '+967-1-246-222', '24/7'),
('Sanaa University Campus Shelter', 'Sanaa University, Sanaa', 15.34800000, 44.18200000, 'Sanaa', 'Yemen', 800, 456, 'open', true, true, false, true, true, '+967-1-250-333', '24/7'),
('ICRC Sanaa Coordination Center', 'Hadda St, Sanaa', 15.33200000, 44.20100000, 'Sanaa', 'Yemen', 400, 189, 'open', true, true, true, true, true, '+967-1-467-444', '24/7'),
('Al-Sabeen Maternity Hospital Shelter', 'Al-Sabeen Square, Sanaa', 15.35800000, 44.21200000, 'Sanaa', 'Yemen', 300, 145, 'open', true, false, true, true, false, '+967-1-251-555', '24/7');

-- Aden 亚丁 (4个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Aden Crater District Shelter', 'Crater District, Old Aden', 12.78800000, 45.03600000, 'Aden', 'Yemen', 400, 178, 'open', true, true, true, true, true, '+967-2-251-111', '24/7'),
('Al-Mansoura Community Shelter', 'Al-Mansoura District, Aden', 12.82200000, 45.01800000, 'Aden', 'Yemen', 500, 234, 'open', true, false, true, true, false, '+967-2-232-222', '24/7'),
('Aden Port Workers Emergency Center', 'Ma''alla Port Area, Aden', 12.79500000, 45.00200000, 'Aden', 'Yemen', 600, 89, 'open', true, true, false, true, true, '+967-2-201-333', '24/7'),
('Khormaksar Civil Defense', 'Khormaksar, Near Airport, Aden', 12.83500000, 45.01200000, 'Aden', 'Yemen', 350, 67, 'open', true, true, true, true, true, '+967-2-242-444', '24/7');

-- Taiz 塔伊兹 (3个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Taiz Castle Area Shelter', 'Near Al-Qahira Citadel, Taiz', 13.57800000, 44.01500000, 'Taiz', 'Yemen', 400, 234, 'open', true, false, true, true, false, '+967-4-221-111', '24/7'),
('Al-Jomhouri Hospital Emergency Zone', 'Al-Jomhouri Hospital, Taiz', 13.57200000, 44.02200000, 'Taiz', 'Yemen', 500, 289, 'open', true, true, true, true, true, '+967-4-231-222', '24/7'),
('Taiz University Campus Shelter', 'Taiz University, Taiz', 13.58500000, 44.02800000, 'Taiz', 'Yemen', 350, 167, 'open', true, false, false, true, true, '+967-4-241-333', '24/7');

-- ============================================================
-- 8. 苏丹 (Sudan) - 3城市 12个避难所
-- ============================================================

-- Khartoum 喀土穆 (5个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Khartoum Central Mosque Shelter', 'Near Grand Mosque, Central Khartoum', 15.60000000, 32.53500000, 'Khartoum', 'Sudan', 600, 345, 'open', true, false, true, true, true, '+249-183-777-111', '24/7'),
('ICRC Khartoum Emergency Center', 'Africa St, Khartoum', 15.59200000, 32.54800000, 'Khartoum', 'Sudan', 500, 234, 'open', true, true, true, true, true, '+249-183-471-222', '24/7'),
('University of Khartoum Shelter', 'UofK Campus, Central Khartoum', 15.60800000, 32.53200000, 'Khartoum', 'Sudan', 800, 456, 'open', true, true, false, true, true, '+249-183-780-333', '24/7'),
('Khartoum Teaching Hospital Bunker', 'Hospital Area, Khartoum', 15.59800000, 32.52600000, 'Khartoum', 'Sudan', 400, 189, 'open', true, true, true, true, true, '+249-183-783-444', '24/7'),
('Bahri District Community Shelter', 'Khartoum North (Bahri)', 15.63500000, 32.54200000, 'Khartoum', 'Sudan', 500, 267, 'open', true, false, false, true, false, '+249-185-230-555', '24/7');

-- Omdurman 恩图曼 (4个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Omdurman Grand Market Shelter', 'Souq Omdurman, Central Omdurman', 15.64500000, 32.48200000, 'Omdurman', 'Sudan', 500, 234, 'open', true, false, true, true, false, '+249-187-551-111', '24/7'),
('Khalifa House Museum Area Shelter', 'Near Khalifa House, Omdurman', 15.63800000, 32.47500000, 'Omdurman', 'Sudan', 300, 145, 'open', true, true, false, true, true, '+249-187-552-222', '24/7'),
('Omdurman Hospital Emergency Shelter', 'Omdurman Teaching Hospital', 15.64200000, 32.47800000, 'Omdurman', 'Sudan', 400, 189, 'open', true, true, true, true, true, '+249-187-553-333', '24/7'),
('Ombada Community Shelter', 'Ombada District, West Omdurman', 15.66800000, 32.42500000, 'Omdurman', 'Sudan', 600, 378, 'crowded', true, false, false, true, false, '+249-187-554-444', '24/7');

-- Port Sudan 苏丹港 (3个)
INSERT INTO public.shelters (name, address, latitude, longitude, city, country, capacity, current_occupancy, status, has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours) VALUES
('Port Sudan Red Sea Hotel Area Shelter', 'Central Port Sudan', 19.61500000, 37.21600000, 'Port Sudan', 'Sudan', 400, 89, 'open', true, true, true, true, true, '+249-311-822-111', '24/7'),
('Port Sudan Civil Hospital Shelter', 'Port Sudan Teaching Hospital', 19.62200000, 37.21200000, 'Port Sudan', 'Sudan', 300, 67, 'open', true, true, true, true, true, '+249-311-823-222', '24/7'),
('Port Sudan Port Workers Shelter', 'Sea Port District', 19.60800000, 37.22800000, 'Port Sudan', 'Sudan', 500, 123, 'open', true, false, false, true, false, '+249-311-824-333', '24/7');

-- ============================================================
-- 汇总统计
-- ============================================================
-- 乌克兰: 5城市 x 6 = 30个避难所
-- 以色列: 5城市 x 5 = 25个避难所
-- 巴勒斯坦: 5城市 (5+4+4+4+3) = 20个避难所
-- 叙利亚: 5城市 x 5 = 25个避难所
-- 黎巴嫩: 4城市 (5+4+4+3) = 16个避难所
-- 伊拉克: 4城市 (5+4+4+3) = 16个避难所
-- 也门: 3城市 (5+4+3) = 12个避难所
-- 苏丹: 3城市 (5+4+3) = 12个避难所
-- 总计: 34城市 156个避难所
