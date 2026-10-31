/**
 * 设备校验：仅允许 PC 浏览器访问（屏幕尺寸 + UA 双重判定）。
 */
const MOBILE_UA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk|Windows Phone/i;

export function isDesktop() {
  const mobileUA = MOBILE_UA.test(navigator.userAgent || '');
  // iPadOS 13+ 的 Safari 桌面模式 UA 伪装 Mac，用触点特征兜底
  const isIPadOS = /MacIntel/.test(navigator.platform) && navigator.maxTouchPoints > 1;
  const tooSmall = window.innerWidth < 1024 || window.innerHeight < 600;
  return !mobileUA && !isIPadOS && !tooSmall;
}

export function deviceBlockReason() {
  if (MOBILE_UA.test(navigator.userAgent || '')) return '手机';
  if (/MacIntel/.test(navigator.platform) && navigator.maxTouchPoints > 1) return '平板';
  if (window.innerWidth < 1024 || window.innerHeight < 600) return '屏幕分辨率过低（需至少 1024×600）';
  return null;
}
