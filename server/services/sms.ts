
import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const smsService = {
  async sendVerificationCode(phoneNumber: string, code: string) {
    return client.messages.create({
      body: `Your KidPool verification code is: ${code}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
  },

  async sendCarpoolUpdate(phoneNumber: string, message: string) {
    return client.messages.create({
      body: message,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
  }
};
