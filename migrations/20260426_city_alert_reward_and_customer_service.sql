-- ============================================================
-- 同城预警数据管理 & 积分奖励 & 平台客服窗口
-- Created: 2026-04-26
-- ============================================================

-- 1. 同城预警触发记录表
-- 记录每个平台（用户）在同城预警中的触发时间和排名
CREATE TABLE IF NOT EXISTS city_alert_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  country TEXT,
  trigger_rank INTEGER NOT NULL,          -- 触发排名 (1-N)
  trigger_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  reward_points INTEGER DEFAULT 0,        -- 获得的奖励积分
  reward_granted BOOLEAN DEFAULT false,   -- 是否已发放奖励
  reward_granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 同城预警汇总表
-- 记录每次同城预警事件的汇总信息
CREATE TABLE IF NOT EXISTS city_alert_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  country TEXT,
  total_triggers INTEGER DEFAULT 0,       -- 总触发次数
  rewarded_count INTEGER DEFAULT 0,       -- 已奖励人数
  total_reward_points INTEGER DEFAULT 0,  -- 总发放积分
  is_real_alert BOOLEAN DEFAULT false,    -- 是否为真实预警（非模拟）
  first_trigger_at TIMESTAMPTZ,
  last_trigger_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 同城预警积分奖励规则表
CREATE TABLE IF NOT EXISTS city_alert_reward_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rank_from INTEGER NOT NULL DEFAULT 1,   -- 排名开始
  rank_to INTEGER NOT NULL DEFAULT 10,    -- 排名结束
  reward_points INTEGER NOT NULL DEFAULT 50, -- 奖励积分数
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 插入默认奖励规则：前10名分级奖励
INSERT INTO city_alert_reward_rules (rank_from, rank_to, reward_points, description) VALUES
  (1, 1, 100, '同城预警第1名触发奖励'),
  (2, 3, 80, '同城预警第2-3名触发奖励'),
  (4, 5, 60, '同城预警第4-5名触发奖励'),
  (6, 10, 50, '同城预警第6-10名触发奖励');

-- 4. 客服消息表
-- 用于前端客服窗口与后台的沟通
CREATE TABLE IF NOT EXISTS customer_service_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,                -- 会话ID（游客也可发起）
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
  admin_id TEXT,                           -- 后台回复的管理员ID
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 客服会话表
CREATE TABLE IF NOT EXISTS customer_service_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  user_city TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  assigned_admin TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_city_alert_triggers_alert ON city_alert_triggers(alert_id);
CREATE INDEX IF NOT EXISTS idx_city_alert_triggers_user ON city_alert_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_city_alert_triggers_city ON city_alert_triggers(city);
CREATE INDEX IF NOT EXISTS idx_city_alert_triggers_rank ON city_alert_triggers(trigger_rank);
CREATE INDEX IF NOT EXISTS idx_city_alert_summaries_city ON city_alert_summaries(city);
CREATE INDEX IF NOT EXISTS idx_city_alert_summaries_alert ON city_alert_summaries(alert_id);
CREATE INDEX IF NOT EXISTS idx_cs_messages_session ON customer_service_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_cs_messages_user ON customer_service_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_sessions_user ON customer_service_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_sessions_status ON customer_service_sessions(status);
