import { UAParser } from 'ua-parser-js';

// Helper interface to represent the modern Navigator.userAgentData API
// which provides more accurate/frozen strings for Chromium browsers.
interface NavigatorUAD extends Navigator {
  userAgentData?: {
    brands: { brand: string; version: string }[];
    mobile: boolean;
    platform: string;
    getHighEntropyValues: (hints: string[]) => Promise<{
      platformVersion?: string;
      architecture?: string;
      model?: string;
      uaFullVersion?: string;
    }>;
  };
  brave?: {
    isBrave: () => Promise<boolean>;
  };
}

export async function getDeviceMetadata() {
  let browserName = "Unknown Browser";
  let browserVersion = "";
  let osName = "Unknown OS";
  let osVersion = "";
  let formFactor = "Desktop";

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { browser: browserName, os: osName, formFactor };
  }

  const nav = navigator as NavigatorUAD;
  const ua = navigator.userAgent;

  // 1. Base parsing using ua-parser-js as a fallback
  const parser = new UAParser(ua);
  const result = parser.getResult();

  browserName = result.browser.name || browserName;
  browserVersion = result.browser.version || browserVersion;
  osName = result.os.name || osName;
  osVersion = result.os.version || osVersion;
  
  if (result.device.type === 'mobile') formFactor = 'Mobile';
  else if (result.device.type === 'tablet') formFactor = 'Tablet';
  else if (result.device.type === 'smarttv') formFactor = 'SmartTV';

  // 2. Progressive Enhancement: Use Client Hints if available (Chromium 90+)
  // Client Hints bypass frozen/reduced UA strings and give the true device details
  if (nav.userAgentData) {
    try {
      const entropy = await nav.userAgentData.getHighEntropyValues(['platformVersion', 'uaFullVersion']);
      
      // Get the highest priority brand that isn't just generic "Chromium" or "Not A;Brand"
      const brand = nav.userAgentData.brands.find(b => !b.brand.includes('Not') && b.brand !== 'Chromium');
      if (brand) {
        browserName = brand.brand;
        browserVersion = entropy.uaFullVersion || brand.version;
      }
      
      osName = nav.userAgentData.platform || osName;
      if (entropy.platformVersion) {
        osVersion = entropy.platformVersion;
      }

      formFactor = nav.userAgentData.mobile ? 'Mobile' : 'Desktop';
      // If it's technically a mobile OS but not flagged mobile, it's a tablet
      if (!nav.userAgentData.mobile && ['Android', 'Chrome OS'].includes(osName)) {
        formFactor = 'Tablet';
      }
    } catch (e) {
      // Ignore client hints error and rely on fallback
    }
  }

  // 3. Special Case: Brave Browser
  // Brave explicitly strips its identifier from both UA strings and Client Hints.
  if (nav.brave && typeof nav.brave.isBrave === 'function') {
    try {
      const isBrave = await nav.brave.isBrave();
      if (isBrave) {
        browserName = "Brave";
      }
    } catch (e) {}
  }

  // 4. Special Case: iPadOS Desktop Mode
  // iPadOS 13+ sends a macOS Safari User-Agent by default, completely hiding the fact that it's an iPad.
  // We identify it by checking for Mac metadata combined with a multi-touch screen.
  if (osName === 'macOS' || osName === 'Mac OS' || /Macintosh/.test(ua)) {
    if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) {
      osName = "iPadOS";
      formFactor = "Tablet";
      // We can't definitively grab the iPadOS version since it lies and sends the underlying macOS version,
      // so we leave osVersion as whatever was parsed.
    }
  }

  const finalBrowser = browserVersion ? `${browserName} ${browserVersion.split('.')[0]}` : browserName;
  const finalOS = osVersion ? `${osName} ${osVersion}` : osName;

  return { browser: finalBrowser, os: finalOS, formFactor };
}