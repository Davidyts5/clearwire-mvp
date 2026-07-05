// LIGHTWEIGHT IN-MEMORY RATE LIMITER
// Perfect for Edge/Serverless environments to prevent brute-force attacks and Twilio API drain.

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;

  record.count += 1;
  return true;
}
