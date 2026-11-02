import React from 'react';
import PageShell from '../components/PageShell';
import LikertScale from '../components/LikertScale';
import {
  POLITICAL_ITEMS, POLITICAL_ATTENTION, POLITICAL_INTRO, POLITICAL_ANCHOR_LOW, POLITICAL_ANCHOR_HIGH,
} from '../data/content';
import { useTestState, useTestDispatch, ACTIONS } from '../store/testStore';

/**
 * 阶段 3：政治倾向测量（协变量）。6 题 + 1 道注意力检查题（嵌于第 3 题后），全部作答方可继续。
 */
export default function Step3PoliticalPage() {
  const state = useTestState();
  const dispatch = useTestDispatch();

  const total = POLITICAL_ITEMS.length + 1;
  const answered = POLITICAL_ITEMS.filter((it) => state.political.responses[it.q]).length
    + (state.attention.poly ? 1 : 0);
  const allDone = answered === total;

  const before = POLITICAL_ITEMS.slice(0, 3);
  const after = POLITICAL_ITEMS.slice(3);

  const renderItem = (it, idx) => (
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
  );

  return (
    <PageShell step="step3">
      <div className="panel-hd">
        <h2 className="text-base font-semibold text-slate-700">第三阶段 · 个人观点问卷</h2>
      </div>

      <div className="panel-bd space-y-5">
        <p className="text-[15px] leading-7 text-slate-700 whitespace-pre-line">{POLITICAL_INTRO}</p>

        {before.map(renderItem)}

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3 mb-3">
            <span className="tag bg-slate-100 text-slate-600 border-slate-200 shrink-0">4</span>
            <p className="text-sm leading-6 text-slate-800">{POLITICAL_ATTENTION.text}</p>
          </div>
          <LikertScale
            name="poly-attention"
            value={state.attention.poly}
            onChange={(n) => dispatch({ type: ACTIONS.UPDATE_ATTENTION, payload: { section: 'poly', value: n } })}
            anchorLow={POLITICAL_ANCHOR_LOW}
            anchorHigh={POLITICAL_ANCHOR_HIGH}
          />
        </section>

        {after.map((it, i) => renderItem(it, i + 4))}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-sm text-slate-500">已作答 {answered} / {total}</span>
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
