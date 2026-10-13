import { UAParser } from 'ua-parser-js';

interface NavigatorWithClientHints extends Navigator {
  userAgentData?: {
    brands: { brand: string; version: string }[];
    mobile: boolean;
    platform: string;
  };
}

export async function getDeviceMetadata() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { browser: 'Unknown Browser', os: 'Unknown OS', formFactor: 'Desktop' };
  }

  const nav = navigator as NavigatorWithClientHints;
  const result = new UAParser(navigator.userAgent).getResult();
  let browserName = result.browser.name || 'Unknown Browser';
  const browserMajor = result.browser.major || result.browser.version?.split('.')[0] || '';
  let osName = result.os.name || nav.userAgentData?.platform || 'Unknown OS';
  let formFactor = result.device.type === 'mobile'
    ? 'Mobile'
    : result.device.type === 'tablet'
      ? 'Tablet'
      : result.device.type === 'smarttv'
        ? 'SmartTV'
        : 'Desktop';

  // Use only low-entropy browser hints as a fallback; do not request full versions or model details.
  if (browserName === 'Unknown Browser' && nav.userAgentData) {
    const brand = nav.userAgentData.brands.find((item) => !item.brand.includes('Not') && item.brand !== 'Chromium');
    if (brand) browserName = brand.brand;
  }
  if (formFactor === 'Desktop' && nav.userAgentData?.mobile) formFactor = 'Mobile';

  // iPadOS desktop mode can look like macOS; report only the coarse device type.
  if ((osName === 'macOS' || osName === 'Mac OS' || /Macintosh/.test(navigator.userAgent)) && navigator.maxTouchPoints > 1) {
    osName = 'iPadOS';
    formFactor = 'Tablet';
  }

  const browser = browserMajor ? `${browserName} ${browserMajor}` : browserName;
  return { browser, os: osName, formFactor };
}
