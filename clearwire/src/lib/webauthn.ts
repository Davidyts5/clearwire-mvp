export const rpName = 'ClearWire Security';

export const getRpId = (req: Request) => {
  const host = req.headers.get('host') || 'localhost:3000';
  return host.split(':')[0]; // Strips port for localhost
};

export const getOrigin = (req: Request) => {
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const uint8ArrayToBase64 = (buffer: Uint8Array): string => {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
};
