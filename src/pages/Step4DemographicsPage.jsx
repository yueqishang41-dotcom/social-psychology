import React, { useState } from 'react';
import PageShell from '../components/PageShell';
import { GENDER_OPTIONS, NATIVE_LANG_OPTIONS, PRIOR_EXP_OPTIONS } from '../data/content';
import { useTestState, useTestDispatch, ACTIONS } from '../store/testStore';

/**
 * 阶段 4：人口统计学信息（必填校验）。已按课题组要求精简：
 * 不收集学号、年级、中文熟练程度；性别仅男/女。
 */
export default function Step4DemographicsPage() {
  const state = useTestState();
  const dispatch = useTestDispatch();
  const d = state.demographics;
  const [err, setErr] = useState('');

  const set = (field) => (value) => dispatch({ type: ACTIONS.UPDATE_DEMO, payload: { field, value } });

  const validate = () => {
    if (!d.name.trim()) return '请填写姓名。';
    if (!/^[\d+\-() ]{7,20}$/.test(d.phone.trim())) return '请填写有效的联系方式（手机号）。';
    const age = Number(d.age);
    if (!Number.isInteger(age) || age < 18 || age > 100) return '请填写有效年龄（本研究仅限18周岁及以上成年人参加）。';
    if (!d.gender) return '请选择性别。';
    if (!d.ethnicity.trim()) return '请填写民族。';
    if (!d.nativeLang) return '请选择母语。';
    if (!d.priorExp) return '请选择是否参加过类似实验。';
    return null;
  };

  const handleSubmit = () => {
    const problem = validate();
    if (problem) return setErr(problem);
    setErr('');
    dispatch({ type: ACTIONS.FINISH });
  };

  return (
    <PageShell step="step4">
      <div className="panel-hd">
        <h2 className="text-base font-semibold text-slate-700">第四阶段 · 基本信息问卷</h2>
      </div>

      <div className="panel-bd space-y-4">
        <p className="text-sm text-slate-500">
          以下信息仅用于描述参与者样本与开展统计分析，将与正式实验数据分开保存。
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="1. 姓名" required>
            <input className="ipt" value={d.name} onChange={(e) => set('name')(e.target.value)} />
          </Field>
          <Field label="2. 联系方式（手机号）" required>
            <input className="ipt" inputMode="tel" value={d.phone} onChange={(e) => set('phone')(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="3. 您的年龄" required>
            <input className="ipt" inputMode="numeric" value={d.age} onChange={(e) => set('age')(e.target.value)} />
          </Field>
          <Field label="4. 您的民族" required>
            <input className="ipt" placeholder="如：汉族" value={d.ethnicity} onChange={(e) => set('ethnicity')(e.target.value)} />
          </Field>
        </div>

        <RadioField label="5. 您的性别" options={GENDER_OPTIONS} value={d.gender} onChange={set('gender')} />
        <RadioField label="6. 您的母语" options={NATIVE_LANG_OPTIONS} value={d.nativeLang} onChange={set('nativeLang')} />
        <RadioField
          label="7. 您此前是否参加过类似的动作观察或人际判断实验？"
          options={PRIOR_EXP_OPTIONS}
          value={d.priorExp}
          onChange={set('priorExp')}
        />

        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
        <button className="btn-primary" onClick={handleSubmit}>提交并完成实验</button>
      </div>
    </PageShell>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="lbl">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function RadioField({ label, options, value, onChange }) {
  return (
    <Field label={label} required>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-lg border text-sm transition-all
              ${value === opt
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </Field>
  );
}
