import React, { useEffect, useRef, useState, useMemo } from 'react';
import PageShell from '../components/PageShell';
import {
  VIDEO_GENERAL_INSTRUCTION, VIDEO_RULES,
  CHECK_QUESTION_TITLE, CHECK_QUESTION, CHECK_OPTIONS, CHECK_FAIL_HINT,
} from '../data/content';
import { useTestState, useTestDispatch, ACTIONS } from '../store/testStore';
import { createLogEntry } from '../utils/storage';

const VIDEO_SRC = import.meta.env.VITE_VIDEO_URL || '/sample.mp4';
const COUNTDOWN_SEC = 5;

/**
 * 阶段 1：视频观察任务（五个子页面，指导语与播放严格分离）：
 * general（通用指导语）→ rule（分组按键规则）→ check（理解检查题，答对才放行）
 * → ready（确认已通过，按回车进入播放）→ playing（独立播放页 + 空格记录）
 * → countdown（播完倒计时）→ 阶段 2。
 * 合规拦截：禁用原生控制条、禁右键、禁快进/回放（seek 自动回正）、禁暂停（自动续播）、
 * 空格键阻止页面滚动并记录 { timestamp, videoCurrentTime }。
 */
export default function Step1VideoPage() {
  const state = useTestState();
  const dispatch = useTestDispatch();
  const condition = state.subject.condition;

  const [stage, setStage] = useState('general'); // general | rule | check | ready | playing | countdown | error
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [checkWrong, setCheckWrong] = useState(false);
  const [checkTries, setCheckTries] = useState(0);

  const videoRef = useRef(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const maxPlayedRef = useRef(0);
  const endedRef = useRef(false);

  // 检查题选项乱序呈现（正确项位置不固定）
  const shuffledOptions = useMemo(() => {
    const opts = [...(CHECK_OPTIONS[condition] || CHECK_OPTIONS.A)];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }, [condition]);

  /* ---------- 文字子页面：Enter 逐级推进（check 页禁用 Enter，防误触跳过） ---------- */
  useEffect(() => {
    if (stage !== 'general' && stage !== 'rule' && stage !== 'ready') return;
    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (stage === 'general') setStage('rule');
        else if (stage === 'rule') setStage('check');
        else beginPlayback();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const beginPlayback = () => setStage('playing');

  /* ---------- 进入 playing：挂载后由用户手势激活起播 ---------- */
  useEffect(() => {
    if (stage !== 'playing') return;
    const v = videoRef.current;
    if (!v) return;
    maxPlayedRef.current = 0;
    endedRef.current = false;
    dispatch({ type: ACTIONS.VIDEO_START });
    v.blur();
    v.play().catch(() => setStage('error'));
  }, [stage, dispatch]);

  /* ---------- 检查题作答 ---------- */
  const handleCheckAnswer = (opt) => {
    if (opt.correct) {
      dispatch({
        type: ACTIONS.ADD_LOG,
        payload: createLogEntry('check_passed', '视频按键规则理解检查通过', { condition, tries: checkTries + 1 }),
      });
      setStage('ready');
    } else {
      setCheckWrong(true);
      setCheckTries((t) => t + 1);
      dispatch({
        type: ACTIONS.ADD_LOG,
        payload: createLogEntry('check_failed', '理解检查题答错，重看规则后重答', { condition, attempt: checkTries + 1 }),
      });
    }
  };

  /* ---------- 播放阶段：全局键盘拦截（空格记录 + 屏蔽视频快捷键/滚动） ---------- */
  useEffect(() => {
    if (stage !== 'playing') return;
    const BLOCK_KEYS = new Set([
      'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown',
    ]);
    const onKey = (e) => {
      const v = videoRef.current;
      if (e.code === 'Space' || BLOCK_KEYS.has(e.key)) {
        e.preventDefault(); // 全局阻止空格/方向键滚动页面、视频默认控制
      }
      if (e.code === 'Space' && !e.repeat && v && !v.paused) {
        dispatch({
          type: ACTIONS.VIDEO_KEYPRESS,
          payload: { videoCurrentTime: Math.round(v.currentTime * 1000) / 1000 },
        });
      }
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, dispatch]);

  /* ---------- 倒计时进入阶段二 ---------- */
  useEffect(() => {
    if (stage !== 'countdown') return;
    setCountdown(COUNTDOWN_SEC);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          dispatch({ type: ACTIONS.SET_STEP, payload: 'step2' });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, dispatch]);

  /* ---------- 视频事件守卫 ---------- */
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (v) maxPlayedRef.current = Math.max(maxPlayedRef.current, v.currentTime);
  };

  const handleSeeked = () => {
    // 禁止快进/跳过/回放：检测到非法跳转则回正到已播放位置
    const v = videoRef.current;
    if (v && Math.abs(v.currentTime - maxPlayedRef.current) > 1.5) {
      v.currentTime = maxPlayedRef.current;
    }
  };

  const handlePause = () => {
    // 禁止暂停：非播放完毕的暂停一律续播
    const v = videoRef.current;
    if (stageRef.current === 'playing' && !endedRef.current && v) {
      v.play().catch(() => {});
    }
  };

  const handleEnded = () => {
    const v = videoRef.current;
    endedRef.current = true;
    dispatch({
      type: ACTIONS.VIDEO_END,
      payload: {
        durationSec: Number.isFinite(v?.duration) ? Math.round(v.duration * 10) / 10 : null,
        watchSec: v ? Math.round(v.currentTime * 10) / 10 : null,
      },
    });
    setStage('countdown');
  };

  /* ---------- 渲染：播放相关子页面与文字指导语页面完全分离 ---------- */
  const isVideoView = ['playing', 'countdown', 'error'].includes(stage);

  return (
    <PageShell step="step1" wide showRestHint={false}>
      <div onContextMenu={(e) => e.preventDefault()}>
        <div className="panel-hd">
          <h2 className="text-base font-semibold text-slate-700">第一阶段 · 视频观察任务</h2>
        </div>

        <div className="panel-bd space-y-5">
          {!isVideoView && stage === 'general' && (
            <InstructionText text={VIDEO_GENERAL_INSTRUCTION} hint="按回车键继续" />
          )}

          {!isVideoView && stage === 'rule' && (
            <InstructionText text={VIDEO_RULES[condition] || VIDEO_RULES.A} hint="按回车键进入确认题" />
          )}

          {!isVideoView && stage === 'check' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-800">{CHECK_QUESTION_TITLE}</h3>
              <p className="text-sm leading-6 text-slate-700">{CHECK_QUESTION}</p>
              <div className="space-y-2">
                {shuffledOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleCheckAnswer(opt)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{opt.text}
                  </button>
                ))}
              </div>
              {checkWrong && <p className="text-sm text-red-600">{CHECK_FAIL_HINT}</p>}
            </div>
          )}

          {!isVideoView && stage === 'ready' && (
            <div className="space-y-4 text-center py-6">
              <p className="text-lg font-medium text-slate-800">您已正确理解任务规则</p>
              <p className="text-sm leading-7 text-slate-600">
                接下来视频将开始<strong>一次性完整播放</strong>，无法暂停、回放或快进。<br />
                请在观看过程中，按刚才掌握的规则使用<strong>空格键</strong>记录目标动作。<br />
                播放期间请勿切换窗口或离开本页。
              </p>
              <button className="btn-primary mx-auto" onClick={beginPlayback}>开始观看视频（Enter）</button>
            </div>
          )}

          {isVideoView && (
            <div className="relative bg-black rounded-lg overflow-hidden mx-auto" style={{ aspectRatio: '16/9', width: '100%', maxWidth: '880px' }}>
              <video
                ref={videoRef}
                src={VIDEO_SRC}
                controls={false}
                controlsList="nodownload noplaybackrate noremoteplayback"
                disablePictureInPicture
                disableRemotePlayback
                playsInline
                tabIndex={-1}
                preload="auto"
                className="absolute inset-0 h-full w-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onSeeked={handleSeeked}
                onPause={handlePause}
                onEnded={handleEnded}
                onError={() => stageRef.current === 'playing' && setStage('error')}
              />
              {stage === 'playing' && (
                <div className="absolute bottom-2 right-3 text-white/60 text-xs select-none pointer-events-none">
                  请按规则使用空格键记录目标动作
                </div>
              )}
              {stage === 'countdown' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                  <p className="text-lg mb-2">观察任务完成，即将进入下一环节</p>
                  <p className="text-4xl font-semibold">{countdown}</p>
                </div>
              )}
              {stage === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white/90 text-sm px-6 text-center">
                  <p>视频加载失败，请在微信群里联系研究人员处理设备故障，不要自行重启程序。</p>
                  <button className="btn-secondary" onClick={() => setStage('ready')}>重试</button>
                </div>
              )}
            </div>
          )}
        </div>

        {!isVideoView && stage === 'rule' && (
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
            <button className="btn-primary" onClick={() => setStage('check')}>我已理解，进入确认题（Enter）</button>
          </div>
        )}
      </div>
    </PageShell>
  );
}

/**
 * 指导语渲染：第 5、6 条加粗强调（正确率与联系渠道提示）。
 */
function InstructionText({ text, hint }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-3">
      <p className="text-[15px] leading-7 text-slate-700">
        {lines.map((line, i) => (
          <span key={i} className="block whitespace-pre-line">
            {/^[56]\./.test(line) ? <strong className="font-bold">{line}</strong> : (line || ' ')}
          </span>
        ))}
      </p>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
  );
}
