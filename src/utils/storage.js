/**
 * 实时 LocalStorage 持久化：意外刷新/断电后可从当前阶段恢复。
 * Key: socpsych_exp_state
 */
const STORAGE_KEY = 'socpsych_exp_state';

export const VALID_STEPS = ['step0', 'step1', 'step2', 'step3', 'step4', 'step5'];

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[storage] saveState failed:', e);
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !VALID_STEPS.includes(data.step)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    // step0 之后必须有被试编号；缺失视为脏数据
    if (data.step !== 'step0' && (!data.subject || typeof data.subject.id !== 'string' || !data.subject.id)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

export function createLogEntry(action, detail, metadata = {}) {
  return { timestamp: new Date().toISOString(), action, detail, ...metadata };
}
