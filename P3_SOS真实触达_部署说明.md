# P3：SOS 真实触达（短信 / 语音 / 推送）部署说明

> 目标：SOS 不再只是写一条数据库记录——触发后**真的**给紧急联系人发短信、必要时语音外呼，并给家人和附近互助者推送。

---

## 一、本次改了什么（代码侧，已完成）

| 文件 | 改动 |
|---|---|
| `functions/_shared/twilio.ts`（新） | Twilio 接入层：`sendSms` / `makeCallSay`（内联 TwiML 语音，无需自建服务器）/ `makeCall`。沿用你原生版的 **API Key 认证**；密钥缺失安全跳过 |
| `functions/sos-service/index.ts` | · 触发 SOS → `notifyEmergencyContact`：给紧急联系人发带**地图定位链接**的短信，并记录发送结果<br>· `notifyFamilyInternal` / `notifyRescuersInternal`：除写库外，**真正推送**给家人 / 附近互助者（复用 P2 的 `sendPushToUsers`）<br>· `escalateSOS`：阶段≥2 时给紧急联系人**发短信 + 语音外呼**；并把"已通知应急部门"等不实文案改为准确描述 |

> 语音外呼用 Twilio 内联 TwiML（`<Say>`）朗读求救信息，**不需要**你再去部署 `warrescue.app/api/twiml/...` 那个脚本服务器。

---

## 二、你需要准备的（Twilio，你已有账号 ✅）

在 [Twilio 控制台](https://console.twilio.com)：
1. **买一个 Twilio 电话号码**（要能发 SMS / 打电话的号码）→ 作为 `TWILIO_FROM_NUMBER`（E.164，如 `+1xxxxxxxxxx`）。
2. **创建 API Key**（Account → API keys & tokens → Create API key）→ 得到 **Key SID** 和 **Key Secret**（Secret 只显示一次）。
3. 你的 Account SID 在控制台首页（`AC` 开头）。

设置 Secrets（**只进 Supabase，绝不进仓库/聊天**）：
```bash
supabase secrets set TWILIO_ACCOUNT_SID=AC********************************
supabase secrets set TWILIO_FROM_NUMBER=+1XXXXXXXXXX
supabase secrets set TWILIO_KEY_SID=SK********************************
supabase secrets set TWILIO_KEY_SECRET=********************************
# 备选：若不想用 API Key，可改用主令牌
# supabase secrets set TWILIO_AUTH_TOKEN=********************************
```
> 你的账号是 **Upgraded（已升级/付费）**，可向任意号码发送；试用账号只能发到已验证号码——你这边没问题。

---

## 三、部署
```bash
# sos-service 现在引用了 _shared/twilio.ts 和 _shared/push.ts，需重新部署
supabase functions deploy sos-service
# 确认 device_tokens 迁移已应用（P2）；推送密钥已配（P2）
```

## 四、验证
1. **短信**：用一个真实手机号当“紧急联系人”填进个人资料（`profiles.emergency_contact_phone`，E.164），在 App 触发一次 SOS → 该号码应收到带 Google 地图定位链接的短信。
2. **推送**：让另一台已登录、在同一家庭组/已订阅互助的设备，确认收到 SOS 推送（关屏也能收）。
3. **语音外呼**：在后台把该 SOS 升级到 Stage 2（SOSRescue → escalate）→ 紧急联系人应接到一通朗读求救信息的电话。
4. 查 `notifications` 表应有 `type=sos_sms` 的记录，标明短信是否送达。

## 五、已知限制 / 后续
- **互助推送暂未按距离过滤**：`notifyRescuersInternal` 目前推给所有开启互助订阅的用户，应按坐标 + 1km 半径筛选（与 P2 的预警地理过滤一并做，建议尽快补）。
- **前端降级路径**：若 `sos-service` 调用失败，Dashboard 会退化为直接写 `sos_records`，此时不会触发短信/推送（仅兜底保证记录不丢）。属可接受的降级，后续可让其重试函数。
- **AI 语音核实**（原生版那套“闪光灯超时→AI 电话核实→无人接听则升级”）暂未移植到 Capacitor，当前为“升级即外呼紧急联系人”。如需要可作为独立增强项。
- 紧急联系人目前取 `profiles` 的单个 `emergency_contact_phone`；如需多紧急联系人，需要新增联系人表（可纳入 P5）。
