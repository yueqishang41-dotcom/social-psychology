import React from 'react';
import PageShell from '../components/PageShell';
import LikertScale from '../components/LikertScale';
import { POLITICAL_ITEMS, POLITICAL_INTRO, POLITICAL_ANCHOR_LOW, POLITICAL_ANCHOR_HIGH } from '../data/content';
import { useTestState, useTestDispatch, ACTIONS } from '../store/testStore';

/**
 * 阶段 3：政治倾向测量（协变量）。6 题社会—政治价值取向指标，7 点 Likert。
 */
export default function Step3PoliticalPage() {
  const state = useTestState();
  const dispatch = useTestDispatch();

  const answered = POLITICAL_ITEMS.filter((it) => state.political.responses[it.q]).length;
  const allDone = answered === POLITICAL_ITEMS.length;

  return (
    <PageShell step="step3">
      <div className="panel-hd">
        <h2 className="text-base font-semibold text-slate-700">第三阶段 · 个人观点问卷</h2>
      </div>

      <div className="panel-bd space-y-5">
        <p className="text-[15px] leading-7 text-slate-700 whitespace-pre-line">{POLITICAL_INTRO}</p>

        {POLITICAL_ITEMS.map((it, idx) => (
          <section key={it.q} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="tag bg-slate-100 text-slate-600 border-slate-200 shrink-0">{idx + 1}</span>
              <p className="text-sm leading-6 text-slate-800">{it.text}</p>
            </div>
            <LikertScale
              name={`poly-${it.q}`}
              value={state.political.responses[it.q]}
              onChange={(n) => dispatch({ type: ACTIONS.UPDATE_POLITICAL, payload: { q: it.q, value: n } })}
              anchorLow={POLITICAL_ANCHOR_LOW}
              anchorHigh={POLITICAL_ANCHOR_HIGH}
            />
          </section>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-sm text-slate-500">已作答 {answered} / {POLITICAL_ITEMS.length}</span>
        <button
          className="btn-primary"
          disabled={!allDone}
          onClick={() => dispatch({ type: ACTIONS.SET_STEP, payload: 'step4' })}
        >
          继续
        </button>
      </div>
    </PageShell>
  );
}
