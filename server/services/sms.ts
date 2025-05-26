
import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const messagingService = {
  async sendVerificationCode(phoneNumber: string, code: string, action: string = 'verification', channel: 'sms' | 'whatsapp' = 'sms') {
    const from = channel === 'whatsapp' 
      ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
      : process.env.TWILIO_PHONE_NUMBER;
    
    const actionMessages = {
      'verification': 'Your KidPool verification code is',
      'create_event': 'To create an event, enter this verification code',
      'create_carpool': 'To create a carpool offer, enter this verification code',
      'edit_event': 'To edit this event, enter this verification code',
      'book_carpool': 'To book this carpool, enter this verification code',
      'delete_event': 'To delete this event, enter this verification code',
      'delete_carpool': 'To delete this carpool, enter this verification code'
    };
    
    const message = `${actionMessages[action] || actionMessages['verification']}: ${code}`;
    
    return client.messages.create({
      body: message,
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
