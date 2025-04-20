
import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const messagingService = {
  async sendVerificationCode(phoneNumber: string, code: string, channel: 'sms' | 'whatsapp' = 'sms') {
    const from = channel === 'whatsapp' 
      ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
      : process.env.TWILIO_PHONE_NUMBER;
    
    return client.messages.create({
      body: `Your KidPool verification code is: ${code}`,
      to: channel === 'whatsapp' ? `whatsapp:${phoneNumber}` : phoneNumber,
      from
    });
  },

  async sendCarpoolUpdate(phoneNumber: string, message: string, channel: 'sms' | 'whatsapp' = 'sms') {
    const from = channel === 'whatsapp' 
      ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
      : process.env.TWILIO_PHONE_NUMBER;

    return client.messages.create({
      body: message,
      to: channel === 'whatsapp' ? `whatsapp:${phoneNumber}` : phoneNumber,
      from
    });
  },

  async sendCarpoolGroupMessage(numbers: string[], message: string, channel: 'sms' | 'whatsapp' = 'sms') {
    return Promise.all(
      numbers.map(number => this.sendCarpoolUpdate(number, message, channel))
    );
  }
};
