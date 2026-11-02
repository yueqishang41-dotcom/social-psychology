import React, { useEffect, useRef } from 'react';
import PageShell from '../components/PageShell';
import { DEBRIEF_TITLE, DEBRIEF_PARAS } from '../data/content';
import { useTestState, useTestDispatch, ACTIONS } from '../store/testStore';
import { uploadResults } from '../utils/upload';

/**
 * 阶段 5：完成与真意告知（Debriefing）。
 * 页面挂载时静默组装并上传全量 Payload：成功 3 次重试 → 失败降级本地暂存队列；
 * 上传成功后清除本地进行中状态。被试端永不触发下载。
 */
export default function Step5CompletionPage() {
  const state = useTestState();
  const dispatch = useTestDispatch();
  const uploadStartedRef = useRef(false);

  useEffect(() => {
    if (uploadStartedRef.current || state.upload.status === 'ok') return;
    if (!state.subject.id) return;
    uploadStartedRef.current = true;
    dispatch({ type: ACTIONS.SET_UPLOAD, payload: { status: 'uploading' } });

    uploadResults(state).then((r) => {
      if (r.ok) {
        dispatch({ type: ACTIONS.SET_UPLOAD, payload: { status: 'ok', attempts: r.attempts } });
      } else {
        dispatch({
          type: ACTIONS.SET_UPLOAD,
          payload: { status: r.pending ? 'pending' : 'failed', reason: r.reason || '' },
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = state.upload.status;

  return (
    <PageShell step="step5">
      <div className="panel-hd">
        <h2 className="text-lg font-semibold text-slate-800">{DEBRIEF_TITLE}</h2>
      </div>

      <div className="panel-bd space-y-4">
        {DEBRIEF_PARAS.map((p, i) => (
          <p key={i} className="text-[15px] leading-7 text-slate-700 whitespace-pre-line">{p}</p>
        ))}

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-5 text-center">
          <p className="text-sm text-slate-500 mb-1">您的被试完成码（请截图或记录后向主试领取 15 元被试费）</p>
          <p className="text-2xl font-semibold tracking-wider text-blue-700 select-all">
            {state.completionCode}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            编号：{state.subject.id}
          </p>
        </div>

        {/* 上传状态仅用于主试现场排障，措辞对被试无压力 */}
        <p className="text-xs text-slate-400 text-center">
          {status === 'ok' && '实验数据已同步至研究服务器，感谢您的参与。'}
          {status === 'uploading' && '正在同步实验数据…'}
          {status === 'pending' && '网络暂不可用，数据已在本机暂存，联网打开本页面将自动完成同步，无需其他操作。'}
          {status === 'failed' && '数据同步未完成，请在微信群里联系研究人员，我们将协助处理。'}
        </p>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 text-sm text-slate-500 flex justify-between items-center">
        <span>如您对本研究有任何疑问：19985706517</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">实验结束，请向主试出示完成码</span>
          {/* 主试专用：共用电脑开始下一位新被试（数据已上传/入队，重置本地快照） */}
          <button
            className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
            onClick={() => {
              if (window.confirm('确认清空本机实验快照并开始新被试？仅主试操作。')) {
                dispatch({ type: ACTIONS.RESET });
              }
            }}
          >
            新被试开始（主试）
          </button>
        </div>
      </div>
    </PageShell>
  );
}
