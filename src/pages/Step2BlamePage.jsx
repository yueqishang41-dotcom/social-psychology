import React from 'react';
import PageShell from '../components/PageShell';
import LikertScale from '../components/LikertScale';
import { BLAME_ITEMS, BLAME_INTRO, BLAME_ANCHOR_LOW, BLAME_ANCHOR_HIGH } from '../data/content';
import { useTestState, useTestDispatch, ACTIONS } from '../store/testStore';

/**
 * 阶段 2：受害者归责测量（因变量）。六则情境材料，7 点量表，全部作答后方可继续。
 */
export default function Step2BlamePage() {
  const state = useTestState();
  const dispatch = useTestDispatch();

  const answered = BLAME_ITEMS.filter((it) => state.blame.responses[it.q]).length;
  const allDone = answered === BLAME_ITEMS.length;

  return (
    <PageShell step="step2" wide>
      <div className="panel-hd">
        <h2 className="text-base font-semibold text-slate-700">第二阶段 · 人际判断任务</h2>
      </div>

      <div className="panel-bd space-y-5">
        <p className="text-[15px] leading-7 text-slate-700 whitespace-pre-line">{BLAME_INTRO}</p>

        {BLAME_ITEMS.map((it, idx) => (
          <section key={it.q} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="tag bg-slate-100 text-slate-600 border-slate-200 shrink-0">材料 {idx + 1}</span>
              <p className="text-sm leading-6 text-slate-700">{it.text}</p>
            </div>
            <p className="text-sm font-medium text-slate-800 mb-3">{it.question}</p>
            <LikertScale
              name={`blame-${it.q}`}
              value={state.blame.responses[it.q]}
              onChange={(n) => dispatch({ type: ACTIONS.UPDATE_BLAME, payload: { q: it.q, value: n } })}
              anchorLow={BLAME_ANCHOR_LOW}
              anchorHigh={BLAME_ANCHOR_HIGH}
            />
          </section>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-sm text-slate-500">已作答 {answered} / {BLAME_ITEMS.length}</span>
        <button
          className="btn-primary"
          disabled={!allDone}
          onClick={() => dispatch({ type: ACTIONS.SET_STEP, payload: 'step3' })}
        >
          继续
        </button>
      </div>
    </PageShell>
  );
}
