import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { saveState, loadState, clearState, createLogEntry } from '../utils/storage';
import { genSubjectId, genCompletionCode, assignCondition } from '../utils/random';

const now = () => new Date().toISOString();

const initialState = {
  subject: { id: '', condition: '' },          // 随机编号 + A/B 分组
  step: 'step0',                                // step0..step5（阶段0-5）
  createdAt: null,                              // 同意参加（实验开始）时刻
  endedAt: null,                                // 完成问卷（进入 debrief）时刻
  stepTimes: {},                                // { step: { startedAt, endedAt } }
  consent: { name: '', consentedAt: '' },
  video: {
    startedAt: null, endedAt: null, completed: false,
    durationSec: null,                          // 视频文件总时长
    watchSec: null,                             // 实际播放位置（观看进度）
    keypressLogs: [],                           // [{ timestamp, videoCurrentTime }]
  },
  blame: { responses: {}, startedAt: null, endedAt: null },       // { q1..q6: 1-7 }
  political: { responses: {}, startedAt: null, endedAt: null },   // { p1..p6: 1-7 }
  attention: { blame: null, poly: null },                         // 注意力检查题作答（独立于量表分）
  demographics: {
    name: '', phone: '', age: '', gender: '',
    ethnicity: '', nativeLang: '', priorExp: '',
  },
  blurEvents: [],                               // [{ leftAt, returnedAt, durationMs, step }]
  behavioralLogs: [],
  completionCode: '',
  upload: { status: 'idle' },                   // idle | uploading | ok | pending | failed
};

export const ACTIONS = {
  CONSENT_ACCEPT: 'CONSENT_ACCEPT',
  SET_STEP: 'SET_STEP',
  VIDEO_START: 'VIDEO_START',
  VIDEO_KEYPRESS: 'VIDEO_KEYPRESS',
  VIDEO_END: 'VIDEO_END',
  UPDATE_BLAME: 'UPDATE_BLAME',
  UPDATE_POLITICAL: 'UPDATE_POLITICAL',
  UPDATE_ATTENTION: 'UPDATE_ATTENTION',
  UPDATE_DEMO: 'UPDATE_DEMO',
  FINISH: 'FINISH',
  ADD_BLUR_EVENT: 'ADD_BLUR_EVENT',
  SET_UPLOAD: 'SET_UPLOAD',
  ADD_LOG: 'ADD_LOG',
  RESET: 'RESET',
};

function testReducer(state, action) {
  switch (action.type) {
    // 同意参加：生成编号、伪随机分组、进入阶段1
    case ACTIONS.CONSENT_ACCEPT: {
      const id = state.subject.id || genSubjectId();
      const condition = state.subject.condition || assignCondition();
      const createdAt = state.createdAt || now();
      return {
        ...state,
        subject: { id, condition },
        createdAt,
        consent: { ...state.consent, name: action.payload.name, consentedAt: now() },
        step: 'step1',
        stepTimes: {
          ...state.stepTimes,
          step0: { ...(state.stepTimes.step0 || {}), startedAt: state.stepTimes.step0?.startedAt || createdAt, endedAt: now() },
          step1: { startedAt: now() },
        },
        behavioralLogs: [
          ...state.behavioralLogs,
          createLogEntry('consent_given', '参与者签署知情同意书'),
          createLogEntry('condition_assigned', `伪随机分组=${condition}`),
        ],
      };
    }

    // 阶段切换：关闭上一阶段计时、打开新阶段计时；同步模块级时间戳
    case ACTIONS.SET_STEP: {
      const prev = state.step;
      const next = action.payload;
      const t = now();
      const stepTimes = {
        ...state.stepTimes,
        [prev]: { ...(state.stepTimes[prev] || {}), endedAt: t },
        [next]: { ...(state.stepTimes[next] || {}), startedAt: state.stepTimes[next]?.startedAt || t },
      };
      const patch = { step: next, stepTimes };
      if (prev === 'step2') patch.blame = { ...state.blame, endedAt: t };
      if (prev === 'step3') patch.political = { ...state.political, endedAt: t };
      if (next === 'step2' && !state.blame.startedAt) patch.blame = { ...state.blame, startedAt: t };
      if (next === 'step3' && !state.political.startedAt) patch.political = { ...state.political, startedAt: t };
      return {
        ...state,
        ...patch,
        behavioralLogs: [...state.behavioralLogs, createLogEntry('step_enter', `进入阶段 ${next}`, { from: prev, to: next })],
      };
    }

    // 视频开始播放（重新开始会清空上一次的部分按键日志）
    case ACTIONS.VIDEO_START:
      return {
        ...state,
        video: { ...state.video, startedAt: now(), endedAt: null, completed: false, keypressLogs: [] },
        behavioralLogs: [...state.behavioralLogs, createLogEntry('video_start', '视频观察任务开始')],
      };

    // 精确按键记录：空格 → { timestamp, videoCurrentTime }
    case ACTIONS.VIDEO_KEYPRESS:
      return {
        ...state,
        video: {
          ...state.video,
          keypressLogs: [
            ...state.video.keypressLogs,
            { timestamp: now(), videoCurrentTime: action.payload.videoCurrentTime },
          ],
        },
      };

    case ACTIONS.VIDEO_END: {
      const p = action.payload || {};
      return {
        ...state,
        video: {
          ...state.video,
          endedAt: now(),
          completed: true,
          durationSec: p.durationSec ?? state.video.durationSec,
          watchSec: p.watchSec ?? state.video.watchSec,
        },
        behavioralLogs: [...state.behavioralLogs, createLogEntry('video_end', '视频播放完毕', { keypressCount: state.video.keypressLogs.length })],
      };
    }

    case ACTIONS.UPDATE_BLAME:
      return { ...state, blame: { ...state.blame, responses: { ...state.blame.responses, [action.payload.q]: action.payload.value } } };

    case ACTIONS.UPDATE_POLITICAL:
      return { ...state, political: { ...state.political, responses: { ...state.political.responses, [action.payload.q]: action.payload.value } } };

    // 注意力检查题：section = 'blame' | 'poly'
    case ACTIONS.UPDATE_ATTENTION:
      return { ...state, attention: { ...state.attention, [action.payload.section]: action.payload.value } };

    case ACTIONS.UPDATE_DEMO:
      return { ...state, demographics: { ...state.demographics, [action.payload.field]: action.payload.value } };

    // 完成：生成完成码、记录结束时刻、进入 debrief
    case ACTIONS.FINISH: {
      const t = now();
      return {
        ...state,
        step: 'step5',
        endedAt: t,
        completionCode: state.completionCode || genCompletionCode(),
        stepTimes: {
          ...state.stepTimes,
          step4: { ...(state.stepTimes.step4 || {}), endedAt: t },
          step5: { ...(state.stepTimes.step5 || {}), startedAt: t },
        },
        behavioralLogs: [...state.behavioralLogs, createLogEntry('test_complete', '全部问卷完成，进入 debriefing')],
      };
    }

    // 切屏监控（含 step 归属，视频阶段切屏单独计数）
    case ACTIONS.ADD_BLUR_EVENT:
      return { ...state, blurEvents: [...state.blurEvents, action.payload] };

    case ACTIONS.SET_UPLOAD:
      return { ...state, upload: { ...state.upload, ...action.payload } };

    case ACTIONS.ADD_LOG:
      return { ...state, behavioralLogs: [...state.behavioralLogs, action.payload] };

    case ACTIONS.RESET:
      clearState();
      return { ...initialState };

    default:
      return state;
  }
}

const TestContext = createContext(null);
const TestDispatchContext = createContext(null);

/** 兼容旧版本 localStorage 快照：补齐缺失的新字段 */
function sanitizeSaved(saved) {
  if (!saved) return null;
  return {
    ...initialState,
    ...saved,
    attention: saved.attention || initialState.attention,
    demographics: { ...initialState.demographics, ...(saved.demographics || {}) },
    video: { ...initialState.video, ...(saved.video || {}) },
  };
}

export function TestProvider({ children }) {
  const savedState = sanitizeSaved(loadState());
  const [state, dispatch] = useReducer(testReducer, savedState || initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 实时持久化：任意状态变化立即落盘（刷新/断电可恢复）
  useEffect(() => {
    saveState(state);
  }, [state]);

  // 诚信与合规监控：切屏（blur / visibilitychange）全流程记录
  // 去重：Alt+Tab 会同时触发 window.blur 与 visibilitychange(hidden)，800ms 内合并为一次
  useEffect(() => {
    const blurStartRef = { current: null };
    const lastBlurAtRef = { current: 0 };

    const inTask = () => {
      const s = stateRef.current;
      return s.subject.id && ['step1', 'step2', 'step3', 'step4'].includes(s.step);
    };

    const onBlur = () => {
      if (!inTask()) return;
      const t = Date.now();
      if (t - lastBlurAtRef.current < 800) return;
      lastBlurAtRef.current = t;
      blurStartRef.current = { leftAt: now(), step: stateRef.current.step };
      dispatch({
        type: ACTIONS.ADD_BLUR_EVENT,
        payload: { leftAt: blurStartRef.current.leftAt, returnedAt: null, durationMs: null, step: blurStartRef.current.step },
      });
    };

    const onReturn = () => {
      if (!blurStartRef.current) return;
      const { leftAt, step } = blurStartRef.current;
      blurStartRef.current = null;
      const returnedAt = now();
      // 回填最近一条未归事件
      dispatch({
        type: ACTIONS.ADD_BLUR_EVENT,
        payload: { leftAt, returnedAt, durationMs: Math.max(0, Date.now() - new Date(leftAt).getTime()), step, return_only: true },
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onBlur();
      else onReturn();
    };

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <TestContext.Provider value={state}>
      <TestDispatchContext.Provider value={dispatch}>
        {children}
      </TestDispatchContext.Provider>
    </TestContext.Provider>
  );
}

export function useTestState() {
  const ctx = useContext(TestContext);
  if (!ctx) throw new Error('useTestState must be used within TestProvider');
  return ctx;
}

export function useTestDispatch() {
  const ctx = useContext(TestDispatchContext);
  if (!ctx) throw new Error('useTestDispatch must be used within TestProvider');
  return ctx;
}
