
import { storage } from '../storage';

export const verificationService = {
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async storeVerificationCode(phoneNumber: string, code: string, action: string = 'general') {
    // Store code with 5 minute expiry
    // Note: In production, use Redis or similar for this
    const verificationData = {
      code,
      action,
      expires: Date.now() + 5 * 60 * 1000
    };
    await storage.storeVerificationCode(phoneNumber, verificationData);
  },

  async verifyCode(phoneNumber: string, code: string, action?: string): Promise<boolean> {
    const storedData = await storage.getVerificationCode(phoneNumber);
    if (!storedData) return false;
    
    const isValid = storedData.code === code && 
                    Date.now() < storedData.expires &&
                    (!action || storedData.action === action);
                    
    if (isValid) {
      await storage.removeVerificationCode(phoneNumber);
    }
    
    return isValid;
  }
};
