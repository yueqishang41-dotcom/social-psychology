import React, { useEffect, useRef, useState, useCallback } from 'react';
import PageShell from '../components/PageShell';
import { VIDEO_GENERAL_INSTRUCTION, VIDEO_RULES } from '../data/content';
import { useTestState, useTestDispatch, ACTIONS } from '../store/testStore';

const VIDEO_SRC = import.meta.env.VITE_VIDEO_URL || '/sample.mp4';
const COUNTDOWN_SEC = 5;

/**
 * 阶段 1：视频观察任务。
 * 子阶段：general（通用指导语）→ rule（分组按键规则）→ playing（播放+空格记录）→ countdown → 进入阶段 2。
 * 合规拦截：禁用原生控制条、禁右键、禁快进/回放（seek 自动回正）、禁暂停（自动续播）、
 * 空格键阻止页面滚动并记录 { timestamp, videoCurrentTime }。
 */
export default function Step1VideoPage() {
  const state = useTestState();
  const dispatch = useTestDispatch();
  const condition = state.subject.condition;

  const [stage, setStage] = useState('general'); // general | rule | playing | countdown | error
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);

  const videoRef = useRef(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const maxPlayedRef = useRef(0);
  const endedRef = useRef(false);

  /* ---------- 指导语阶段：Enter 推进 ---------- */
  useEffect(() => {
    if (stage !== 'general' && stage !== 'rule') return;
    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (stage === 'general') {
          setStage('rule');
        } else {
          startVideo();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const startVideo = useCallback(() => {
    const v = videoRef.current;
    setStage('playing');
    maxPlayedRef.current = 0;
    endedRef.current = false;
    dispatch({ type: ACTIONS.VIDEO_START });
    if (v) {
      v.blur();
      v.play().catch(() => setStage('error'));
    }
  }, [dispatch]);

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

  /* ---------- 渲染 ---------- */
  const showVideo = ['rule', 'playing', 'countdown', 'error'].includes(stage);

  return (
    <PageShell step="step1" wide>
      <div onContextMenu={(e) => e.preventDefault()}>
        <div className="panel-hd">
          <h2 className="text-base font-semibold text-slate-700">第一阶段 · 视频观察任务</h2>
        </div>

        <div className="panel-bd space-y-5">
          {stage === 'general' && (
            <InstructionText text={VIDEO_GENERAL_INSTRUCTION} hint="按回车键继续" />
          )}

          {stage === 'rule' && (
            <div className="space-y-4">
              <InstructionText text={VIDEO_RULES[condition] || VIDEO_RULES.A} hint="按回车键开始视频" />
            </div>
          )}

          {showVideo && (
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
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
              {stage === 'rule' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white/80 text-sm pointer-events-none">
                  视频将按回车后开始，请做好准备
                </div>
              )}
            </div>
          )}

          {stage === 'error' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              视频加载失败。请举手联系主试处理设备故障，<strong>不要自行重启程序</strong>。
              <button className="btn-secondary ml-3" onClick={() => setStage('rule')}>重试</button>
            </div>
          )}
        </div>

        {stage === 'rule' && (
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
            <button className="btn-primary" onClick={startVideo}>我已理解，开始视频（Enter）</button>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function InstructionText({ text, hint }) {
  return (
    <div className="space-y-3">
      <p className="text-[15px] leading-7 text-slate-700 whitespace-pre-line">{text}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
  );
}
