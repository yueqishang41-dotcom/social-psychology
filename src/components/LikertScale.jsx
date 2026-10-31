import React from 'react';

/**
 * 7 点 Likert 单选（1~7），两端锚点文案可配置。
 */
export default function LikertScale({ name, value, onChange, anchorLow, anchorHigh }) {
  return (
    <div>
      <div className="flex items-stretch gap-1.5" role="radiogroup" aria-label={name}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(n)}
              className={`flex-1 h-12 rounded-lg border text-base font-medium transition-all
                ${active
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:bg-blue-50'}`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate-500">
        <span>{anchorLow}</span>
        <span>{anchorHigh}</span>
      </div>
    </div>
  );
}
