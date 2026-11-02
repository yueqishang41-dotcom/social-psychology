import React from 'react';
import PageShell from '../components/PageShell';
import LikertScale from '../components/LikertScale';
import { BLAME_ITEMS, BLAME_ATTENTION, BLAME_INTRO, BLAME_ANCHOR_LOW, BLAME_ANCHOR_HIGH } from '../data/content';
import { useTestState, useTestDispatch, ACTIONS } from '../store/testStore';

/**
 * 阶段 2：受害者归责测量（因变量）。六则情境材料 + 1 道注意力检查题（嵌于第 4 题后），
 * 7 点量表，全部作答后方可继续。注意力题不计入均分，单独入库。
 */
export default function Step2BlamePage() {
  const state = useTestState();
  const dispatch = useTestDispatch();

  const total = BLAME_ITEMS.length + 1;
  const answered = BLAME_ITEMS.filter((it) => state.blame.responses[it.q]).length
    + (state.attention.blame ? 1 : 0);
  const allDone = answered === total;

  // 注意力题插在材料 4 与材料 5 之间（中段位置更能检出敷衍）
  const before = BLAME_ITEMS.slice(0, 4);
  const after = BLAME_ITEMS.slice(4);

  const renderVignette = (it, idx) => (
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
  );

  return (
    <PageShell step="step2" wide>
      <div className="panel-hd">
        <h2 className="text-base font-semibold text-slate-700">第二阶段 · 人际判断任务</h2>
      </div>

      <div className="panel-bd space-y-5">
        <p className="text-[15px] leading-7 text-slate-700 whitespace-pre-line">{BLAME_INTRO}</p>

        {before.map(renderVignette)}

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3 mb-3">
            <span className="tag bg-slate-100 text-slate-600 border-slate-200 shrink-0">材料 5</span>
            <p className="text-sm leading-6 text-slate-700">{BLAME_ATTENTION.text}</p>
          </div>
          <LikertScale
            name="blame-attention"
            value={state.attention.blame}
            onChange={(n) => dispatch({ type: ACTIONS.UPDATE_ATTENTION, payload: { section: 'blame', value: n } })}
            anchorLow={BLAME_ANCHOR_LOW}
            anchorHigh={BLAME_ANCHOR_HIGH}
          />
        </section>

        {after.map((it, i) => renderVignette(it, i + 5))}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-sm text-slate-500">已作答 {answered} / {total}</span>
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
