export function getDeviceMetadata() {
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let formFactor = "Desktop";

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { browser, os, formFactor };
  }

  const ua = navigator.userAgent;

  // OS Detection
  if (/android/i.test(ua)) os = "Android";
  else if (/iPad|iPhone|iPod/.test(ua)) os = "iOS";
  else if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";

  // Form Factor Detection
  if (/Mobi|Android/i.test(ua)) formFactor = "Mobile";
  else if (/Tablet|iPad/i.test(ua)) formFactor = "Tablet";

  // Browser Detection
  if (/Edg/.test(ua)) browser = "Edge";
  else if (/Chrome/.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox/.test(ua)) browser = "Firefox";
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/OPR|Opera/.test(ua)) browser = "Opera";
  else if (/Brave/.test(ua)) browser = "Brave";

  return { browser, os, formFactor };
}
