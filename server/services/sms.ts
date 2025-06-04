
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
    
    const actionMessages: Record<string, string> = {
      'verification': '🔐 Your KidPool verification code is',
      'create_event': '🎉 To create your event, enter this verification code',
      'create_carpool': '🚗 To create your carpool offer, enter this verification code',
      'edit_event': '✏️ To edit your event, enter this verification code',
      'book_carpool': '🎫 To book this carpool spot, enter this verification code',
      'delete_event': '🗑️ To delete your event, enter this verification code',
      'delete_carpool': '❌ To delete your carpool offer, enter this verification code'
    };
    
    const message = `${actionMessages[action as keyof typeof actionMessages] || actionMessages['verification']}: ${code}\n\n⚡ Code expires in 10 minutes. Don't share this code with anyone!`;
    
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
  },

  async sendCarpoolConfirmation(phoneNumber: string, carpoolData: any, eventData: any, recommendedDepartureTime: string, channel: 'sms' | 'whatsapp' = 'sms') {
    const from = channel === 'whatsapp' 
      ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
      : process.env.TWILIO_PHONE_NUMBER;

    const directionText = carpoolData.canBoth ? "round trip" : 
                         (carpoolData.canPickup ? "to event" : "from event");
    
    // Use appropriate spaces count based on carpool direction
    const passengersCount = carpoolData.canBoth ? carpoolData.spacesAvailable : 
                           (carpoolData.canPickup ? carpoolData.spacesAvailable : 
                            (carpoolData.returnSpacesAvailable || carpoolData.spacesAvailable));
    
    const message = `🚗 Carpool offer created for ${eventData.name}!

${directionText} service for ${passengersCount} passengers
Event: ${eventData.eventAddress}, ${eventData.eventCity}
Date: ${eventData.eventDate} at ${eventData.targetArrivalTime}

💡 Recommended departure: ${recommendedDepartureTime}

View your driver route summary and manage bookings at:
${process.env.VITE_APP_URL || 'https://carfull.replit.app'}/event/${eventData.shareableUrl}

We'll send updates when passengers book with you.`;

    return client.messages.create({
      body: message,
      to: channel === 'whatsapp' ? `whatsapp:${phoneNumber}` : phoneNumber,
      from
    });
  },

  async sendBookingUpdate(phoneNumber: string, carpoolData: any, eventData: any, bookingData: any, recommendedDepartureTime: string, allBookings: any[], estimatedArrivalTime?: string, channel: 'sms' | 'whatsapp' = 'sms') {
    const from = channel === 'whatsapp' 
      ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
      : process.env.TWILIO_PHONE_NUMBER;

    const directionText = bookingData.needsPickup && bookingData.needsDropoff ? "round trip" : 
                         (bookingData.needsPickup ? "pickup" : "dropoff");
    
    const approvedBookings = allBookings.filter(b => b.approvalStatus === 'approved');
    const pickupBookings = approvedBookings.filter(b => b.needsPickup);
    
    let collectingText = "";
    if (pickupBookings.length > 0) {
      const names = pickupBookings.map(b => b.childName).join(", ");
      collectingText = `\n\nYou're collecting: ${names}`;
    }

    // Add estimated arrival time if provided (only for pickup/outbound trips)
    let arrivalTimeText = "";
    if (estimatedArrivalTime && bookingData.needsPickup) {
      arrivalTimeText = `\n⏰ Estimated pickup time: ${estimatedArrivalTime}`;
    }

    const message = `📍 New ${directionText} booking for ${eventData.name}

${bookingData.childName} from ${bookingData.address}, ${bookingData.city}

💡 Updated departure time: ${recommendedDepartureTime}${collectingText}${arrivalTimeText}

View updated route summary:
${process.env.VITE_APP_URL || 'https://carfull.replit.app'}/event/${eventData.shareableUrl}`;

    return client.messages.create({
      body: message,
      to: channel === 'whatsapp' ? `whatsapp:${phoneNumber}` : phoneNumber,
      from
    });
  }
};
