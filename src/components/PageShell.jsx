import React from 'react';

/**
 * 统一页面骨架：顶部进度提示 + 居中内容卡片。
 * 阶段标注对参与者中性化（不泄露启动假设）。
 */
export const STEP_LABELS = {
  step0: { no: 0, total: 5, label: '知情同意' },
  step1: { no: 1, total: 5, label: '视频观察任务' },
  step2: { no: 2, total: 5, label: '人际判断任务' },
  step3: { no: 3, total: 5, label: '个人观点问卷' },
  step4: { no: 4, total: 5, label: '基本信息问卷' },
  step5: { no: 5, total: 5, label: '完成' },
};

export default function PageShell({ step, children, wide = false, showRestHint = true }) {
  const meta = STEP_LABELS[step];
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className={`w-full ${wide ? 'max-w-4xl' : 'max-w-3xl'} animate-fadeIn`}>
        <header className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            动作感知与人际判断研究 · {meta.label}
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: meta.total }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-8 rounded-full ${i < meta.no ? 'bg-blue-600' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </header>
        <main className="panel">
          {children}
        </main>
        <footer className="mt-4 text-center text-xs text-slate-400">
          {showRestHint ? '北京师范大学心理学部 · 如您希望暂停休息，请随时告知主试' : '北京师范大学心理学部'}
        </footer>
      </div>
    </div>
  );
}
