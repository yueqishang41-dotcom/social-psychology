import React, { useEffect, useState } from 'react';
import { TestProvider, useTestState } from './store/testStore';
import { isDesktop, deviceBlockReason } from './utils/device';
import { flushPendingUploads } from './utils/upload';
import Step0ConsentPage from './pages/Step0ConsentPage';
import Step1VideoPage from './pages/Step1VideoPage';
import Step2BlamePage from './pages/Step2BlamePage';
import Step3PoliticalPage from './pages/Step3PoliticalPage';
import Step4DemographicsPage from './pages/Step4DemographicsPage';
import Step5CompletionPage from './pages/Step5CompletionPage';

/* 设备校验：仅允许 PC 浏览器（屏幕尺寸 + UA）；移动端全屏阻止 */
function useDeviceBlocked() {
  const [blocked, setBlocked] = useState(() => !isDesktop());
  useEffect(() => {
    const onResize = () => setBlocked(!isDesktop());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return blocked;
}

function DeviceBlockScreen() {
  const reason = deviceBlockReason();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-6">
      <div className="max-w-md text-center space-y-4">
        <div className="text-5xl">💻</div>
        <h1 className="text-xl font-semibold text-white">请使用 PC 电脑参加本实验</h1>
        <p className="text-sm text-slate-300 leading-6">
          本研究包含精确按键的视频观察任务，需使用键盘并保证稳定的显示环境，仅支持电脑浏览器访问。
          {reason ? `（检测原因：${reason}）` : ''}
        </p>
        <p className="text-xs text-slate-500">如有疑问请联系主试：19985706517</p>
      </div>
    </div>
  );
}

function ExperimentRouter() {
  const state = useTestState();
  switch (state.step) {
    case 'step0': return <Step0ConsentPage />;
    case 'step1': return <Step1VideoPage />;
    case 'step2': return <Step2BlamePage />;
    case 'step3': return <Step3PoliticalPage />;
    case 'step4': return <Step4DemographicsPage />;
    case 'step5': return <Step5CompletionPage />;
    default: return <Step0ConsentPage />;
  }
}

export default function App() {
  const blocked = useDeviceBlocked();

  // 挂载时静默补传历史失败数据（被试无感）
  useEffect(() => {
    flushPendingUploads().catch(() => {});
  }, []);

  if (blocked) return <DeviceBlockScreen />;

  return (
    <TestProvider>
      <ExperimentRouter />
    </TestProvider>
  );
}
