
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

interface RequestTiming {
  timestamp: number;
  ip: string;
  phoneNumber: string;
}

class RateLimitService {
  private phoneNumberLimits = new Map<string, RateLimitEntry>();
  private ipLimits = new Map<string, RateLimitEntry>();
  private bruteForceProtection = new Map<string, BruteForceEntry>();
  private requestTimings = new Map<string, RequestTiming[]>();
  private blockedPhoneNumbers = new Set<string>();
  private suspiciousIPs = new Map<string, number>();
  
  // Configuration - Much stricter limits to prevent bot attacks
  private readonly SMS_LIMIT_PER_PHONE_PER_HOUR = 2;
  private readonly SMS_LIMIT_PER_PHONE_PER_DAY = 5;
  private readonly SMS_LIMIT_PER_IP_PER_HOUR = 5;
  private readonly SMS_LIMIT_PER_IP_PER_DAY = 20;
  private readonly BRUTE_FORCE_THRESHOLD = 3;
  private readonly BRUTE_FORCE_BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  // Bot detection patterns
  private readonly MIN_TIME_BETWEEN_REQUESTS = 5000; // 5 seconds minimum between requests
  private readonly SUSPICIOUS_PATTERNS = [
    /^(\d)\1{9,}$/, // Repeated digits like 1111111111
    /^0{10,}$/, // All zeros (10 or more)
    /^1{10,}$/, // All ones (10 or more)
    /^[0-9]{15,}$/, // Too many digits (15 or more)
  ];
  
  // Development/testing exemptions
  private readonly EXEMPTED_NUMBERS = new Set([
    '+447961318588',  // Test number 1
    '07961318588',    // Test number 1 local format
    '+447734660565',  // Test number 2
    '07734660565'     // Test number 2 local format
  ]);

  constructor() {
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  // Bot detection methods
  private isSuspiciousPhoneNumber(phoneNumber: string): boolean {
    // Check if this phone number is exempted for testing first
    if (this.EXEMPTED_NUMBERS.has(phoneNumber)) {
      return false;
    }

    // Check for patterns indicating fake/bot numbers
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(phoneNumber.replace(/^\+44/, '0'))) {
        return true;
      }
    }
    return false;
  }

  private detectRapidRequests(ip: string, phoneNumber: string): boolean {
    const now = Date.now();
    const key = `${ip}:${phoneNumber}`;
    const timings = this.requestTimings.get(key) || [];
    
    // Remove old entries (older than 1 minute)
    const recentTimings = timings.filter(t => now - t.timestamp < 60000);
    
    // Check if there are more than 3 requests in the last minute
    if (recentTimings.length >= 3) {
      return true;
    }
    
    // Check minimum time between requests
    if (recentTimings.length > 0) {
      const lastRequest = recentTimings[recentTimings.length - 1];
      if (now - lastRequest.timestamp < this.MIN_TIME_BETWEEN_REQUESTS) {
        return true;
      }
    }
    
    // Store this request
    recentTimings.push({ timestamp: now, ip, phoneNumber });
    this.requestTimings.set(key, recentTimings);
    
    return false;
  }

  checkPhoneNumberLimit(phoneNumber: string): { allowed: boolean; timeUntilReset?: number } {
    // Check if this phone number is exempted for testing
    console.log(`[DEBUG] Checking rate limit for phone: "${phoneNumber}"`);
    console.log(`[DEBUG] Exempted numbers:`, Array.from(this.EXEMPTED_NUMBERS));
    
    // Check both original and normalized formats
    if (this.EXEMPTED_NUMBERS.has(phoneNumber)) {
      console.log(`[DEBUG] Phone number ${phoneNumber} is exempted from rate limiting`);
      return { allowed: true };
    }
    
    // Also check normalized format (convert 07 to +44)
    const normalizedPhone = phoneNumber.startsWith('07') ? 
      '+44' + phoneNumber.substring(1) : phoneNumber;
    if (this.EXEMPTED_NUMBERS.has(normalizedPhone)) {
      console.log(`[DEBUG] Normalized phone number ${normalizedPhone} is exempted from rate limiting`);
      return { allowed: true };
    }

    // Check if phone number is permanently blocked
    if (this.blockedPhoneNumbers.has(phoneNumber)) {
      this.logSuspiciousActivity(phoneNumber, 'Attempted to use blocked phone number');
      return { allowed: false };
    }

    // Check for suspicious phone number patterns
    if (this.isSuspiciousPhoneNumber(phoneNumber)) {
      this.blockedPhoneNumbers.add(phoneNumber);
      this.logSuspiciousActivity(phoneNumber, 'Suspicious phone number pattern detected');
      return { allowed: false };
    }
    
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
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

  // Comprehensive bot protection that combines all checks
  performBotProtection(ip: string, phoneNumber: string): { allowed: boolean; reason?: string; timeUntilReset?: number } {
    // 0. Check if this phone number is exempted for testing - bypass all checks
    if (this.EXEMPTED_NUMBERS.has(phoneNumber) || 
        this.EXEMPTED_NUMBERS.has(phoneNumber.startsWith('07') ? '+44' + phoneNumber.substring(1) : phoneNumber)) {
      console.log(`[DEBUG] Phone number ${phoneNumber} is exempted from all rate limiting and bot protection`);
      return { allowed: true };
    }

    // 1. Check for suspicious phone number patterns first
    if (this.isSuspiciousPhoneNumber(phoneNumber)) {
      this.blockedPhoneNumbers.add(phoneNumber);
      this.logSuspiciousActivity(phoneNumber, 'Blocked suspicious phone number pattern');
      return { allowed: false, reason: 'Invalid phone number format detected.' };
    }

    // 2. Check if phone number is already blocked
    if (this.blockedPhoneNumbers.has(phoneNumber)) {
      this.logSuspiciousActivity(phoneNumber, 'Attempted to use blocked phone number');
      return { allowed: false, reason: 'Phone number is temporarily blocked.' };
    }

    // 3. Check for rapid requests (bot-like behavior)
    if (this.detectRapidRequests(ip, phoneNumber)) {
      this.logSuspiciousActivity(`${ip}:${phoneNumber}`, 'Rapid requests detected - potential bot');
      return { allowed: false, reason: 'Too many requests. Please wait at least 5 seconds between attempts.' };
    }

    // 4. Check phone number rate limits
    const phoneCheck = this.checkPhoneNumberLimit(phoneNumber);
    if (!phoneCheck.allowed) {
      return { 
        allowed: false, 
        reason: phoneCheck.timeUntilReset 
          ? `Phone number rate limit exceeded. Try again in ${phoneCheck.timeUntilReset} seconds.`
          : 'Phone number has exceeded daily verification limit.',
        timeUntilReset: phoneCheck.timeUntilReset
      };
    }

    // 5. Check IP rate limits
    const ipCheck = this.checkIPLimit(ip);
    if (!ipCheck.allowed) {
      return { 
        allowed: false, 
        reason: ipCheck.timeUntilReset 
          ? `Too many verification attempts from this location. Try again in ${ipCheck.timeUntilReset} seconds.`
          : 'IP address has exceeded verification limits.',
        timeUntilReset: ipCheck.timeUntilReset
      };
    }

    // 6. Check brute force protection
    const bruteForceCheck = this.checkBruteForceProtection(`${ip}:${phoneNumber}`);
    if (!bruteForceCheck.allowed) {
      return { 
        allowed: false, 
        reason: bruteForceCheck.blockTimeRemaining 
          ? `Account temporarily locked for ${Math.ceil(bruteForceCheck.blockTimeRemaining / 60000)} minutes due to suspicious activity.`
          : 'Account temporarily locked due to too many failed verification attempts.'
      };
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

  clearPhoneNumberLimit(phoneNumber: string) {
    this.phoneNumberLimits.delete(phoneNumber);
    console.log(`[DEBUG] Cleared rate limit for phone: ${phoneNumber}`);
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
