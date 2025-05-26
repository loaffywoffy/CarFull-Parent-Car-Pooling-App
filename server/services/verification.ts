
import { storage } from '../storage';

export const verificationService = {
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async storeVerificationCode(phoneNumber: string, code: string, action: string = 'general') {
    await storage.storeVerificationCode(phoneNumber, code, action);
  },

  async verifyCode(phoneNumber: string, code: string, action?: string): Promise<boolean> {
    return await storage.verifyCode(phoneNumber, code, action || 'general');
  }
};
