/**
 * 静默自动上传 + 失败重试 + 本地补传队列。
 *
 * 端点：环境变量 VITE_COLLECT_ENDPOINT（默认同源 /api/collect，由 netlify.toml 重写）。
 * 被试端绝不弹出任何下载框；全部重试失败后降级存入 localStorage
 * （Key: socpsych_pending_uploads），应用挂载时 flushPendingUploads() 自动补传。
 */
import { buildPayload } from './payload';

const ENDPOINT = (import.meta.env && import.meta.env.VITE_COLLECT_ENDPOINT) || '/api/collect';
const MAX_ATTEMPTS = 3;
const PENDING_KEY = 'socpsy…loads';

console.warn('[upload] 数据上传端点 =', ENDPOINT);

export function getEndpoint() {
  return ENDPOINT;
}

async function uploadPayload(payload, { pendingSave = true } = {}) {
  let lastErr = null;
  let lastStatus = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return { ok: true, attempts: attempt, pending: false, endpoint: ENDPOINT };
      }
      lastStatus = res.status;
      lastErr = new Error(`HTTP ${res.status}`);
      // 服务器明确拒绝（非网络抖动）：不再空等重试，直接进入暂存
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        const reason = `HTTP ${res.status}（${ENDPOINT}）`;
        console.error('[upload] 上传失败(服务器明确报错):', reason);
        if (pendingSave) savePending(payload);
        return { ok: false, attempts: attempt, pending: true, reason, endpoint: ENDPOINT };
      }
    } catch (e) {
      lastErr = e;
      console.error(`[upload] 上传第${attempt}次网络异常:`, e && e.message, '端点=', ENDPOINT);
    }
    if (attempt < MAX_ATTEMPTS) {
      await sleep(1200 * attempt); // 递增退避：1.2s / 2.4s
    }
  }
  if (pendingSave) savePending(payload);
  const reason = lastStatus
    ? `HTTP ${lastStatus}（${ENDPOINT}）`
    : `${(lastErr && lastErr.message) || 'network error'}（${ENDPOINT}）`;
  return { ok: false, attempts: MAX_ATTEMPTS, pending: true, reason, endpoint: ENDPOINT };
}

/** 完成页调用：从全局 state 组装 Payload 并上传一次。 */
export async function uploadResults(state) {
  return uploadPayload(buildPayload(state));
}

/* ---------------- localStorage 暂存 + 自动补传 ---------------- */

function readPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function writePending(arr) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(arr)); } catch (e) {}
}

function savePending(payload) {
  const arr = readPending();
  // 防重复入队（同 subject_id 只留最新一份）
  const filtered = arr.filter((p) => p.subject_id !== payload.subject_id);
  filtered.push(payload);
  writePending(filtered);
}

/** 补传所有暂存数据（App 挂载时静默调用），返回成功条数。 */
export async function flushPendingUploads() {
  const pending = readPending();
  if (!pending.length) return 0;
  const still = [];
  let sent = 0;
  for (const payload of pending) {
    const r = await uploadPayload(payload, { pendingSave: false });
    if (r.ok) sent++;
    else still.push(payload);
  }
  writePending(still);
  if (sent) console.warn(`[upload] 补传成功 ${sent} 条`);
  return sent;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
