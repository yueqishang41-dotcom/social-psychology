/**
 * 正式实验数据导出（Netlify Function）。
 *
 * 聚合 socpsych-formal-data 中全部被试 JSON，按查询参数输出：
 *   ?format=csv（默认） → SPSS/R/JASP 友好的宽表 CSV（每被试一行，含自动计算的
 *                          受害者归责均分 blame_mean、政治倾向均分 poly_mean）
 *   ?format=json        → 全量原始 JSON 数组（最高保真，含按键/切屏日志）
 *   ?format=count       → 已完成被试数与清单
 *
 * 鉴权：设置环境变量 EXPORT_TOKEN 后，访问必须携带 ?token=对应值。
 * 示例：https://站点.netlify.app/api/export?format=csv&token=你的TOKEN
 */
import { connectLambda, getStore } from '@netlify/blobs';

const STORE = 'socpsych-formal-data';

const BLAME_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
const POLY_KEYS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
// 宽表列名规范：无论原始 JSON 键名如何，导出固定为 blame_q1..q6 / poly_q1..q6
const POLY_COLS = POLY_KEYS.map((_, i) => `poly_q${i + 1}`);

export async function handler(event) {
  try { connectLambda(event); } catch (e) { /* 忽略 */ }

  try {
    const exportToken = process.env.EXPORT_TOKEN;
    const qp = event.queryStringParameters || {};
    const given = (qp.token || '').trim();
    if (exportToken && given !== exportToken) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'unauthorized' }) };
    }

    const store = getStore(STORE);
    const payloads = [];
    let cursor;
    do {
      const page = await store.list({ cursor });
      for (const blob of page.blobs || []) {
        try {
          const raw = await store.get(blob.key, { type: 'text' });
          payloads.push(JSON.parse(raw));
        } catch (e) { /* 跳过损坏项 */ }
      }
      cursor = page.cursor;
    } while (cursor);

    // 同一被试多次入库（补传重发）时保留最早一份，避免重复行
    const dedup = new Map();
    for (const p of payloads) {
      const key = `${p.subject_id}`;
      if (!dedup.has(key)) dedup.set(key, p);
    }
    const rows = [...dedup.values()].sort((a, b) =>
      String(a.created_at || '').localeCompare(String(b.created_at || '')));

    const fmt = (qp.format || 'csv').toLowerCase();

    if (fmt === 'count') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          count: rows.length,
          byCondition: {
            A: rows.filter((p) => p.condition === 'A').length,
            B: rows.filter((p) => p.condition === 'B').length,
          },
          subjects: rows.map((p) => ({
            subjectId: p.subject_id ?? '',
            condition: p.condition ?? '',
            createdAt: p.created_at ?? '',
            completionCode: p.completion_code ?? '',
            blameMean: mean(p, BLAME_KEYS, 'blame'),
            polyMean: mean(p, POLY_KEYS, 'poly'),
          })),
        }),
      };
    }

    if (fmt === 'json') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="socpsych-formal-data.json"',
        },
        body: JSON.stringify(rows, null, 2),
      };
    }

    const csv = buildWideCSV(rows);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': 'attachment; filename="socpsych-formal-data.csv"',
      },
      body: csv,
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String((err && err.message) || err) }) };
  }
}

/* ---------------- 宽表 CSV ---------------- */

function esc(v) {
  const s = v === undefined || v === null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function numOr(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : '';
}

/** 均分：优先用客户端预算值，缺失时从逐题作答重算 */
function mean(p, keys, field) {
  const clientVal = field === 'blame' ? p.blame_mean : p.poly_mean;
  if (typeof clientVal === 'number') return Math.round(clientVal * 1000) / 1000;
  const resp = (field === 'blame' ? p.blame_responses : p.political_responses) || {};
  const vals = keys.map((k) => resp[k]).filter((v) => typeof v === 'number');
  if (!vals.length) return '';
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 1000) / 1000;
}

const HEADER = [
  'subject_id', 'condition', 'consent_name', 'created_at',
  'total_duration_sec', 'video_keypress_count', 'video_blur_count',
  'blame_mean', ...BLAME_KEYS.map((k) => `blame_${k}`), 'attn_blame',
  'poly_mean', ...POLY_COLS, 'attn_poly',
  'demo_name', 'demo_phone', 'demo_age', 'demo_gender',
  'demo_ethnicity', 'demo_native_lang', 'demo_prior_exp',
];

function buildWideCSV(payloads) {
  const lines = [HEADER.join(',')];
  for (const p of payloads) {
    const v = p.video || {};
    const b = p.blame_responses || {};
    const po = p.political_responses || {};
    const d = p.demographics || {};
    const row = [
      p.subject_id ?? '',
      p.condition ?? '',
      p.consent_name ?? '',
      p.created_at ?? '',
      numOr(p.total_duration_sec),
      numOr(typeof v.keypress_count === 'number' ? v.keypress_count : (v.keypress_logs || []).length),
      numOr(typeof v.blur_count === 'number' ? v.blur_count : ''),
      mean(p, BLAME_KEYS, 'blame'),
      ...BLAME_KEYS.map((k) => numOr(b[k])),
      numOr((p.attention || {}).blame),
      mean(p, POLY_KEYS, 'poly'),
      ...POLY_KEYS.map((k) => numOr(po[k])),
      numOr((p.attention || {}).poly),
      d.name ?? '', d.phone ?? '', d.age ?? '', d.gender ?? '',
      d.ethnicity ?? '', d.nativeLang ?? '', d.priorExp ?? '',
    ];
    lines.push(row.map(esc).join(','));
  }
  // BOM 头：保证中文在 Excel / SPSS 中不乱码
  return '﻿' + lines.join('\r\n');
}
