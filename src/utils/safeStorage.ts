/**
 * 安全本地存储包装。
 *
 * 背景：iOS WKWebView 在「阻止跨站跟踪 / 隐私模式 / 站点数据存储未就绪 / 配额超限」等
 * 情况下，访问 window.localStorage（甚至读取该属性本身）会抛出 SecurityError / QuotaExceededError。
 * 若在首屏渲染路径上同步访问且未捕获，会导致整棵 React 树卸载 → 白屏（App Store 审核被拒：
 * Guideline 2.1 "Only blank page found upon launch"）。
 *
 * 本包装：任何异常都被吞掉，并自动降级到「内存存储」（本次会话内有效，重启不保留——
 * 这对预警类 App 是可接受的优雅降级：宁可不记住设置，也绝不白屏崩溃）。
 *
 * 接口形状与 localStorage / Supabase auth storage 适配器一致（getItem/setItem/removeItem 同步返回）。
 */

const memory: Record<string, string> = {};
let lsAvailable: boolean | null = null;

/** 检测 localStorage 是否真正可用（读取属性 + 读写都不抛错）。结果缓存。 */
function localStorageWorks(): boolean {
  if (lsAvailable !== null) return lsAvailable;
  try {
    const ls = window.localStorage; // 读取属性本身在某些 WKWebView 下就会抛错
    const probe = '__ls_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    lsAvailable = true;
  } catch {
    lsAvailable = false;
  }
  return lsAvailable;
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (localStorageWorks()) return window.localStorage.getItem(key);
    } catch { /* fall through to memory */ }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  },

  setItem(key: string, value: string): void {
    try {
      if (localStorageWorks()) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch { /* fall through to memory */ }
    memory[key] = value;
  },

  removeItem(key: string): void {
    try {
      if (localStorageWorks()) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch { /* fall through to memory */ }
    delete memory[key];
  },
};

/** 供诊断用：返回 localStorage 是否可用（不抛错）。 */
export function isLocalStorageAvailable(): boolean {
  return localStorageWorks();
}
