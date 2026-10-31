/**
 * 编号 / 完成码 / 伪随机分组。
 */
// 去除易混字符（0/O/1/I）
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randCode(len) {
  let s = '';
  const buf = new Uint32Array(len);
  (window.crypto || {}).getRandomValues
    ? window.crypto.getRandomValues(buf)
    : buf.forEach((_, i) => (buf[i] = Math.floor(Math.random() * 0xffffffff)));
  for (let i = 0; i < len; i++) s += CODE_CHARS[buf[i] % CODE_CHARS.length];
  return s;
}

/** 被试编号：时间戳短码 + 随机码，如 2K6M3F-A8QJ */
export function genSubjectId() {
  const t = Date.now().toString(36).slice(-4).toUpperCase();
  return `${randCode(4)}-${t}`;
}

/** 完成码：EXP-BNU-XXXXXX，用于领取被试费 */
export function genCompletionCode() {
  return `EXP-BNU-${randCode(6)}`;
}

/**
 * 伪随机 50/50 分组（A=选择激活，B=双手触碰控制）。
 * 主试测试可用 URL 参数 ?group=A/B 或构建变量 VITE_FORCE_GROUP 强制指定。
 */
export function assignCondition() {
  try {
    const urlGroup = new URLSearchParams(window.location.search).get('group');
    if (urlGroup && ['A', 'B'].includes(urlGroup.toUpperCase())) return urlGroup.toUpperCase();
  } catch (e) {}
  const envGroup = import.meta.env.VITE_FORCE_GROUP;
  if (envGroup && ['A', 'B'].includes(String(envGroup).toUpperCase())) return String(envGroup).toUpperCase();
  return Math.random() < 0.5 ? 'A' : 'B';
}
