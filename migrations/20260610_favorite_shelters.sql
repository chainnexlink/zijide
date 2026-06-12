-- 修复「收藏避难所不保存」闭环断裂
-- 根因:ShelterDetail.tsx 读写 favorite_shelters 表,但该表从未在任何迁移中创建,
-- supabase-js 不抛错 → 心标只在本地翻转、刷新即丢。
-- 注:shelter_id 用 TEXT,因为避难所可能来自静态内置列表(STATIC_SHELTERS,id 为字符串)。

CREATE TABLE IF NOT EXISTS public.favorite_shelters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shelter_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, shelter_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_shelters_user ON public.favorite_shelters(user_id);

ALTER TABLE public.favorite_shelters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户管理自己的收藏" ON public.favorite_shelters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
