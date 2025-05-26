
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

interface BruteForceEntry {
  attempts: number;
  firstAttempt: number;
  blocked: boolean;
  blockExpiry?: number;
}

class RateLimitService {
  private phoneNumberLimits = new Map<string, RateLimitEntry>();
  private ipLimits = new Map<string, RateLimitEntry>();
  private bruteForceProtection = new Map<string, BruteForceEntry>();
  
  // Configuration
  private readonly SMS_LIMIT_PER_PHONE_PER_HOUR = 3;
  private readonly SMS_LIMIT_PER_IP_PER_HOUR = 10;
  private readonly BRUTE_FORCE_THRESHOLD = 5;
  private readonly BRUTE_FORCE_BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  // Development/testing exemptions
  private readonly EXEMPTED_NUMBERS = new Set([
    '+447961318588',
    '07961318588',
    '447961318588'
  ]);

  constructor() {
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  checkPhoneNumberLimit(phoneNumber: string): { allowed: boolean; timeUntilReset?: number } {
    // Check if this phone number is exempted for testing
    if (this.EXEMPTED_NUMBERS.has(phoneNumber)) {
      console.log(`[DEBUG] Phone number ${phoneNumber} is exempted from rate limiting`);
      return { allowed: true };
    }
    
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    const entry = this.phoneNumberLimits.get(phoneNumber);
    
    if (!entry || entry.firstAttempt < hourAgo) {
      // Reset or create new entry
      this.phoneNumberLimits.set(phoneNumber, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return { allowed: true };
    }
    
    if (entry.count >= this.SMS_LIMIT_PER_PHONE_PER_HOUR) {
      const timeUntilReset = (entry.firstAttempt + (60 * 60 * 1000)) - now;
      return { allowed: false, timeUntilReset };
    }
    
    entry.count++;
    entry.lastAttempt = now;
    return { allowed: true };
  }

  checkIPLimit(ip: string): { allowed: boolean; timeUntilReset?: number } {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    const entry = this.ipLimits.get(ip);
    
    if (!entry || entry.firstAttempt < hourAgo) {
      this.ipLimits.set(ip, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return { allowed: true };
    }
    
    if (entry.count >= this.SMS_LIMIT_PER_IP_PER_HOUR) {
      const timeUntilReset = (entry.firstAttempt + (60 * 60 * 1000)) - now;
      return { allowed: false, timeUntilReset };
    }
    
    entry.count++;
    entry.lastAttempt = now;
    return { allowed: true };
  }

  checkBruteForceProtection(identifier: string): { allowed: boolean; blockTimeRemaining?: number } {
    const now = Date.now();
    const entry = this.bruteForceProtection.get(identifier);
    
    if (!entry) {
      this.bruteForceProtection.set(identifier, {
        attempts: 1,
        firstAttempt: now,
        blocked: false
      });
      return { allowed: true };
    }
    
    // Check if block has expired
    if (entry.blocked && entry.blockExpiry && now > entry.blockExpiry) {
      this.bruteForceProtection.delete(identifier);
      return { allowed: true };
    }
    
    if (entry.blocked) {
      const blockTimeRemaining = entry.blockExpiry ? entry.blockExpiry - now : 0;
      return { allowed: false, blockTimeRemaining };
    }
    
    entry.attempts++;
    
    if (entry.attempts >= this.BRUTE_FORCE_THRESHOLD) {
      entry.blocked = true;
      entry.blockExpiry = now + this.BRUTE_FORCE_BLOCK_DURATION;
      
      console.warn(`[SECURITY] Brute force protection triggered for ${identifier}`);
      
      const blockTimeRemaining = this.BRUTE_FORCE_BLOCK_DURATION;
      return { allowed: false, blockTimeRemaining };
    }
    
    return { allowed: true };
  }

  logSuspiciousActivity(identifier: string, activity: string, metadata?: any) {
    console.warn(`[SECURITY] Suspicious activity detected:`, {
      identifier,
      activity,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  private cleanup() {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // Clean up old phone number limits
    for (const [phone, entry] of this.phoneNumberLimits.entries()) {
      if (entry.firstAttempt < hourAgo) {
        this.phoneNumberLimits.delete(phone);
      }
    }
    
    // Clean up old IP limits
    for (const [ip, entry] of this.ipLimits.entries()) {
      if (entry.firstAttempt < hourAgo) {
        this.ipLimits.delete(ip);
      }
    }
    
    // Clean up expired brute force blocks
    for (const [identifier, entry] of this.bruteForceProtection.entries()) {
      if (entry.blocked && entry.blockExpiry && now > entry.blockExpiry) {
        this.bruteForceProtection.delete(identifier);
      }
    }
  }

  getStats() {
    return {
      phoneNumberLimits: this.phoneNumberLimits.size,
      ipLimits: this.ipLimits.size,
      bruteForceBlocks: Array.from(this.bruteForceProtection.values()).filter(e => e.blocked).length
    };
  }
}

export const rateLimitService = new RateLimitService();
