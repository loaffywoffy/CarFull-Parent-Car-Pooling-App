
export class PhoneValidationService {
  private readonly SUSPICIOUS_PATTERNS = [
    /^\+1234567890$/, // Sequential numbers
    /^(\+?\d)\1{9,}$/, // Repeated digits
    /^\+?0+$/, // All zeros
    /^\+?1+$/, // All ones
  ];

  private readonly BLOCKED_COUNTRIES = [
    // Add country codes known for spam/abuse
    // Example: '+999' (fake country code)
  ];

  private readonly KNOWN_VOIP_PATTERNS = [
    // Add patterns for known VOIP/virtual number providers if needed
  ];

  validatePhoneNumber(phoneNumber: string): { 
    valid: boolean; 
    reason?: string; 
    risk: 'low' | 'medium' | 'high' 
  } {
    // Remove all non-digit characters except +
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Basic format validation
    if (!/^\+?[\d]{7,15}$/.test(cleanNumber)) {
      return { valid: false, reason: 'Invalid phone number format', risk: 'high' };
    }

    // Check for suspicious patterns
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(cleanNumber)) {
        return { valid: false, reason: 'Suspicious number pattern detected', risk: 'high' };
      }
    }

    // Check blocked countries
    for (const countryCode of this.BLOCKED_COUNTRIES) {
      if (cleanNumber.startsWith(countryCode)) {
        return { valid: false, reason: 'Phone number from blocked region', risk: 'high' };
      }
    }

    // Additional validation for UK numbers (since your app seems UK-focused)
    if (cleanNumber.startsWith('+44') || cleanNumber.startsWith('44') || cleanNumber.startsWith('0')) {
      return this.validateUKNumber(cleanNumber);
    }

    // For other countries, allow but mark as medium risk
    return { valid: true, risk: 'medium' };
  }

  private validateUKNumber(number: string): { 
    valid: boolean; 
    reason?: string; 
    risk: 'low' | 'medium' | 'high' 
  } {
    // Normalize UK number
    let ukNumber = number.replace(/^\+44/, '').replace(/^44/, '').replace(/^0/, '');
    
    // UK mobile numbers start with 7 and are 10 digits total
    if (/^7\d{9}$/.test(ukNumber)) {
      return { valid: true, risk: 'low' };
    }

    // UK landline validation (basic)
    if (/^[1-6]\d{8,9}$/.test(ukNumber)) {
      return { valid: true, risk: 'medium' }; // Landlines are less preferred for SMS
    }

    return { valid: false, reason: 'Invalid UK phone number', risk: 'high' };
  }

  normalizePhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Convert UK numbers to international format
    if (cleaned.startsWith('0')) {
      return '+44' + cleaned.substring(1);
    }
    
    if (cleaned.startsWith('44') && !cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    if (!cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  }
}

export const phoneValidator = new PhoneValidationService();
