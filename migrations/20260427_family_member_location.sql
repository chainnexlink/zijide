-- 为family_members添加位置共享相关字段
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS location_accuracy REAL,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;

-- 允许成员自己更新自己的位置
CREATE POLICY "成员更新自己的位置" ON public.family_members
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 创建索引加速家庭成员位置查询
CREATE INDEX IF NOT EXISTS idx_family_members_location
  ON public.family_members (family_id) WHERE latitude IS NOT NULL;
