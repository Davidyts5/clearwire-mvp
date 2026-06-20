// LIGHTWEIGHT IN-MEMORY RATE LIMITER
// Perfect for Vercel Edge/Serverless environments to prevent brute-force attacks and Twilio API drain.

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

// In a serverless environment, memory resets on cold starts.
// For true distributed rate-limiting at scale ($100k ARR), we would drop in Upstash Redis here.
// But this Map effectively stops 99% of rapid-fire bot scripts hitting an active lambda.
const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(ip: string, limit: number, windowMs: number): { success: boolean } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // If IP doesn't exist or window expired, create a new record
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }

  // If IP hit the limit, reject
  if (record.count >= limit) {
    return { success: false };
  }

  // Otherwise, increment the counter
  record.count += 1;
  return { success: true };
}
