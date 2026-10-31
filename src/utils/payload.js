/**
 * 规范 JSON Payload 组装（完成页静默上传用）。
 * 字段命名与导出宽表对齐：snake_case，含自动计算的归责均分/政治倾向均分。
 * 数据只进不收：被试浏览器绝不触发任何下载。
 */
import { BLAME_ITEMS, POLITICAL_ITEMS } from '../data/content';

function meanOf(values) {
  const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 1000) / 1000;
}

export function deriveStats(state) {
  const blameVals = BLAME_ITEMS.map((it) => state.blame.responses[it.q] ?? null);
  const polyVals = POLITICAL_ITEMS.map((it) => state.political.responses[it.q] ?? null);
  const videoBlurs = state.blurEvents.filter((e) => e.step === 'step1' && !e.return_only);
  const totalDurationSec = state.createdAt && state.endedAt
    ? Math.round((new Date(state.endedAt) - new Date(state.createdAt)) / 1000)
    : null;
  return {
    blameVals,
    polyVals,
    blameMean: meanOf(blameVals),
    polyMean: meanOf(polyVals),
    videoKeypressCount: state.video.keypressLogs.length,
    videoBlurCount: videoBlurs.length,
    totalDurationSec,
  };
}

export function buildPayload(state) {
  const s = deriveStats(state);
  const blameResponses = {};
  BLAME_ITEMS.forEach((it, i) => { blameResponses[it.q] = s.blameVals[i]; });
  const politicalResponses = {};
  POLITICAL_ITEMS.forEach((it, i) => { politicalResponses[it.q] = s.polyVals[i]; });

  return {
    schema: 'socpsych-prime/v1',
    appVersion: '1.0.0',

    subject_id: state.subject.id,
    condition: state.subject.condition,               // 'A' 选择激活 | 'B' 双手触碰控制
    consent_name: state.consent.name,
    consented_at: state.consent.consentedAt,
    created_at: state.createdAt,
    ended_at: state.endedAt,
    total_duration_sec: s.totalDurationSec,

    step_times: state.stepTimes,

    video: {
      source: import.meta.env.VITE_VIDEO_URL || '/sample.mp4',
      started_at: state.video.startedAt,
      ended_at: state.video.endedAt,
      completed: state.video.completed,
      duration_sec: state.video.durationSec,
      watch_sec: state.video.watchSec,
      keypress_count: s.videoKeypressCount,
      keypress_logs: state.video.keypressLogs,        // [{ timestamp, videoCurrentTime }]
      blur_count: s.videoBlurCount,
    },

    blame_responses: blameResponses,                  // q1..q6（1-7）
    blame_mean: s.blameMean,
    blame_started_at: state.blame.startedAt,
    blame_ended_at: state.blame.endedAt,

    political_responses: politicalResponses,          // p1..p6（1-7）
    poly_mean: s.polyMean,
    poly_started_at: state.political.startedAt,
    poly_ended_at: state.political.endedAt,

    demographics: { ...state.demographics },

    blur_events: state.blurEvents,
    behavioral_logs: state.behavioralLogs,
    completion_code: state.completionCode,
    user_agent: navigator.userAgent,
    screen: `${window.screen?.width || ''}x${window.screen?.height || ''}`,
  };
}
