/**
 * 正式实验数据收集器（Netlify Function）。
 *
 * 被试完成页组装的完整 JSON Payload（含逐题作答、按键日志、切屏日志、行为日志）
 * POST 到 /api/collect（netlify.toml 重写到本函数）：
 *   1. 校验必填字段（subject_id / condition / 归责与政治问卷作答完整）
 *   2. 整包写入 Netlify Blobs（store: socpsych-formal-data），一份不丢
 *   3. 返回 ok（含存储 key）
 *
 * 存储：Netlify Blobs 随站点自动开通，部署后即可用，无需配置任何环境变量。
 */
import { connectLambda, getStore } from '@netlify/blobs';

const STORE = 'socpsych-formal-data';

function isValidPayload(p) {
  if (!p || typeof p !== 'object') return false;
  if (typeof p.subject_id !== 'string' || !p.subject_id) return false;
  if (p.condition !== 'A' && p.condition !== 'B') return false;
  if (typeof p.created_at !== 'string') return false;
  // DV + 协变量必须作答完整才入库（无效数据不污染正式库）
  const nums = (obj, keys) => keys.every((k) => typeof (obj || {})[k] === 'number' && (obj || {})[k] >= 1 && (obj || {})[k] <= 7);
  const blameKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
  const polyKeys = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  if (!nums(p.blame_responses, blameKeys)) return false;
  if (!nums(p.political_responses, polyKeys)) return false;
  return true;
}

export async function handler(event) {
  // v1 函数需手动接线 Netlify Blobs 环境上下文（从 event.blobs + 请求头注入）
  try { connectLambda(event); } catch (e) { /* 无 blobs 上下文时忽略，后续会明确报错 */ }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  try {
    // 解析 Payload（兼容 v1 字符串 / v2 自动解析对象）
    let payload = event.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload || '{}'); } catch { payload = {}; }
    }
    if (!isValidPayload(payload)) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'invalid payload' }) };
    }

    const store = getStore(STORE);
    const key = `subjects/${payload.subject_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    await store.set(key, JSON.stringify(payload));

    console.log(`[collect] saved subject=${payload.subject_id} condition=${payload.condition} key=${key} bytes=${JSON.stringify(payload).length}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, key }) };
  } catch (err) {
    // 关键失败信息写入 Netlify 函数日志（Functions → Logs），便于后台排查
    console.error(`[collect] FAILED: ${(err && err.message) || err}`);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String((err && err.message) || err) }) };
  }
}
