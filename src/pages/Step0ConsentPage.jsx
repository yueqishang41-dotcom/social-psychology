import React, { useState } from 'react';
import PageShell from '../components/PageShell';
import {
  CONSENT_TITLE, CONSENT_SECTIONS, CONSENT_STATEMENT_TITLE, CONSENT_STATEMENT_ITEMS,
} from '../data/content';
import { useTestDispatch, ACTIONS } from '../store/testStore';

export default function Step0ConsentPage() {
  const dispatch = useTestDispatch();
  const [name, setName] = useState('');
  const [agreeRead, setAgreeRead] = useState(false);
  const [agreeAdult, setAgreeAdult] = useState(false);
  const [err, setErr] = useState('');

  const canProceed = name.trim().length > 0 && agreeRead && agreeAdult;

  const handleProceed = () => {
    if (!name.trim()) return setErr('请填写您的姓名后再继续。');
    if (!agreeRead) return setErr('请勾选“我已阅读并理解本知情同意书的全部内容”。');
    if (!agreeAdult) return setErr('请勾选“我确认自己已年满18周岁，自愿参加本研究”。');
    setErr('');
    dispatch({ type: ACTIONS.CONSENT_ACCEPT, payload: { name: name.trim() } });
  };

  return (
    <PageShell step="step0" wide>
      <div className="panel-hd">
        <h1 className="text-lg font-semibold text-slate-800">{CONSENT_TITLE}</h1>
      </div>
      <div className="panel-bd space-y-5 max-h-[60vh] overflow-y-auto pr-2">
        {CONSENT_SECTIONS.map((sec) => (
          <section key={sec.h}>
            <h2 className="font-medium text-slate-700 mb-1">{sec.h}</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{sec.body}</p>
          </section>
        ))}

        <section className="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <h2 className="font-medium text-slate-700 mb-2">{CONSENT_STATEMENT_TITLE}</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
            {CONSENT_STATEMENT_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-400">
            本知情同意书内容已由研究团队向您完整说明；线上参加即视为知悉并同意上述条款，纸质签署件由主试现场另行存档。
          </p>
        </section>

        <section className="space-y-3">
          <div>
            <label className="lbl" htmlFor="consent-name">参与者姓名</label>
            <input
              id="consent-name"
              className="ipt max-w-sm"
              placeholder="请输入真实姓名（仅用于预约与补偿发放，与实验数据分开保存）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-blue-600"
              checked={agreeRead}
              onChange={(e) => setAgreeRead(e.target.checked)}
            />
            <span>我已阅读并理解本知情同意书的全部内容，有机会提问并已获得满意答复。</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-blue-600"
              checked={agreeAdult}
              onChange={(e) => setAgreeAdult(e.target.checked)}
            />
            <span>我确认自己已年满18周岁，自愿参加本研究，可随时暂停或退出且不会受到惩罚。</span>
          </label>
        </section>

        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
        <button className="btn-primary" disabled={!canProceed} onClick={handleProceed}>
          我同意参加，进入实验
        </button>
      </div>
    </PageShell>
  );
}
