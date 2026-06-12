-- 修复「避难所纠错反馈静默丢失」闭环断裂
-- 根因:ShelterDetail.tsx 把用户纠错写进 shelter_update_logs,但那张表是 shelter-ai 的
-- AI 更新审计日志(列为 country/added/updated/...),列名完全对不上 → insert 失败被 catch{} 吞掉,
-- UI 还显示「已提交」。这里建一张专用的用户纠错表,前端改写入这张表并据返回判断成败。

CREATE TABLE IF NOT EXISTS public.shelter_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shelter_id text,
  shelter_name text,
  reason text NOT NULL,
  reported_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shelter_reports_status ON public.shelter_reports(status);
CREATE INDEX IF NOT EXISTS idx_shelter_reports_reporter ON public.shelter_reports(reported_by);

ALTER TABLE public.shelter_reports ENABLE ROW LEVEL SECURITY;

-- 登录用户可提交纠错(只能挂自己名下),并查看自己提交的
CREATE POLICY "用户提交纠错" ON public.shelter_reports
  FOR INSERT WITH CHECK (reported_by = auth.uid());
CREATE POLICY "用户查看自己的纠错" ON public.shelter_reports
  FOR SELECT USING (reported_by = auth.uid());
-- 管理员可读全部 + 改状态
CREATE POLICY "管理员管理纠错" ON public.shelter_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
