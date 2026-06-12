-- 修复「家庭组建不起来」闭环断裂
-- 根因:family_members 仅有 SELECT 策略,缺 INSERT/DELETE → 普通用户建组/加入时
-- 成员行被 RLS 静默拒绝,前端又没接住错误,导致家庭组永远建不成、位置共享全空。
-- family_groups 已有 "管理员管理家庭组" FOR ALL USING(auth.uid()=admin_id),建组本身没问题。

-- 用户只能插入「自己」的成员行(user_id 必须是自己)
CREATE POLICY "成员加入家庭" ON public.family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 用户可退出(删自己),家庭管理员可移除本组任意成员
CREATE POLICY "成员退出或管理员移除" ON public.family_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.family_groups g
      WHERE g.id = family_members.family_id AND g.admin_id = auth.uid()
    )
  );

-- 让家人实时位置能通过 Realtime 推到地图(若已加入则忽略报错)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
