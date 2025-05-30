import type { Carpool } from "@shared/schema";

export interface CommunicationHint {
  type: 'greeting' | 'logistics' | 'safety' | 'follow-up';
  message: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
}

export class CommunicationHintsService {
  generateHintsForCarpool(carpool: Carpool): CommunicationHint[] {
    const hints: CommunicationHint[] = [];
    
    // Greeting hints based on driver personality
    hints.push(this.generateGreetingHint(carpool));
    
    // Logistics hints based on journey preferences
    hints.push(...this.generateLogisticsHints(carpool));
    
    // Safety hints for child transportation
    hints.push(...this.generateSafetyHints(carpool));
    
    // Follow-up communication hints
    hints.push(this.generateFollowUpHint(carpool));
    
    return hints.sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority));
  }

  private generateGreetingHint(carpool: Carpool): CommunicationHint {
    const personality = carpool.driverPersonality || 'friendly';
    const contactMethod = carpool.preferredContactMethod || 'phone';
    
    let message = '';
    let context = '';
    
    switch (personality) {
      case 'professional':
        message = `"Hello [Parent Name], I'm ${carpool.parentName} and I'm offering a carpool space for the event. I'd like to discuss the logistics and ensure everything runs smoothly."`;
        context = 'Professional tone - focus on efficiency and clear communication';
        break;
      case 'casual':
        message = `"Hi there! I'm ${carpool.parentName} and saw you're looking for a ride. Happy to help out - let me know if you'd like to chat about the details!"`;
        context = 'Casual tone - friendly and relaxed approach';
        break;
      default: // friendly
        message = `"Hi! I'm ${carpool.parentName} and I'd love to help with transportation to the event. Would you like to discuss the arrangements?"`;
        context = 'Friendly tone - warm and welcoming';
        break;
    }
    
    if (contactMethod === 'whatsapp') {
      message += ' (I prefer WhatsApp for quick coordination)';
    } else if (contactMethod === 'sms') {
      message += ' (SMS works best for me)';
    }

    return {
      type: 'greeting',
      message,
      context,
      priority: 'high'
    };
  }

  private generateLogisticsHints(carpool: Carpool): CommunicationHint[] {
    const hints: CommunicationHint[] = [];
    
    // Pickup/dropoff logistics
    if (carpool.canPickup) {
      let pickupMessage = '';
      if (carpool.outboundDropoffPreference === 'my-address') {
        pickupMessage = `"For pickup, I'll collect from my address (${carpool.address}, ${carpool.city}) at ${carpool.outboundDepartureTime}. Please let me know if this timing works for you."`;
      } else if (carpool.outboundDropoffPreference === 'pickup-point') {
        pickupMessage = `"I can arrange a convenient meeting point for pickup. What location would work best for you?"`;
      }
      
      if (pickupMessage) {
        hints.push({
          type: 'logistics',
          message: pickupMessage,
          context: 'Clarify pickup arrangements and timing',
          priority: 'high'
        });
      }
    }

    // Space availability
    hints.push({
      type: 'logistics',
      message: `"I have ${carpool.spacesAvailable} spaces available${carpool.returnSpacesAvailable ? ` for the outbound journey and ${carpool.returnSpacesAvailable} for the return` : ''}. Please confirm how many children you need spaces for."`,
      context: 'Confirm space requirements and availability',
      priority: 'high'
    });

    // Distance considerations
    if (carpool.outboundMaxDistance && carpool.outboundMaxDistance > 0) {
      hints.push({
        type: 'logistics',
        message: `"I'm comfortable with pickups within ${carpool.outboundMaxDistance} miles of my location. Could you share your postcode so I can check if it's feasible?"`,
        context: 'Address distance limitations upfront',
        priority: 'medium'
      });
    }

    return hints;
  }

  private generateSafetyHints(carpool: Carpool): CommunicationHint[] {
    const hints: CommunicationHint[] = [];
    
    // Emergency contact information
    hints.push({
      type: 'safety',
      message: `"For safety, I'll need your emergency contact details and any specific requirements your child has (allergies, medical needs, etc.)."`,
      context: 'Gather essential safety information',
      priority: 'high'
    });

    // Child-specific considerations
    hints.push({
      type: 'safety',
      message: `"Please let me know your child's age and any car seat requirements. I want to make sure they're comfortable and safe during the journey."`,
      context: 'Ensure appropriate safety measures for child',
      priority: 'high'
    });

    // Special requirements
    if (carpool.specialRequirements) {
      hints.push({
        type: 'safety',
        message: `"I should mention: ${carpool.specialRequirements}. Please let me know if this affects your child's travel needs."`,
        context: 'Address any special requirements transparently',
        priority: 'medium'
      });
    }

    return hints;
  }

  private generateFollowUpHint(carpool: Carpool): CommunicationHint {
    const contactMethod = carpool.preferredContactMethod || 'phone';
    
    return {
      type: 'follow-up',
      message: `"I'll send a quick message the day before to confirm timing and last-minute details. My ${contactMethod === 'phone' ? 'phone number' : contactMethod} is ${carpool.phoneNumber}."`,
      context: 'Set expectations for ongoing communication',
      priority: 'medium'
    };
  }

  private getPriorityWeight(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 3;
    }
  }

  // Generate personalized message templates for specific scenarios
  generateRequestApprovalMessage(carpool: Carpool, requestingParent: string, childName: string): string {
    const personality = carpool.driverPersonality || 'friendly';
    
    switch (personality) {
      case 'professional':
        return `Hello ${requestingParent}, I've received your request for ${childName} to join our carpool. I'd like to confirm the arrangements and discuss any specific requirements. Please call me at ${carpool.phoneNumber} to finalize the details.`;
      case 'casual':
        return `Hi ${requestingParent}! Saw your request for ${childName} - happy to include them in our carpool! Give me a call or text on ${carpool.phoneNumber} and we'll sort out the details. Looking forward to helping out!`;
      default:
        return `Hi ${requestingParent}, thanks for your interest in our carpool for ${childName}. I'd love to discuss the arrangements with you to make sure everything works smoothly. Please contact me on ${carpool.phoneNumber} when convenient.`;
    }
  }

  generateConfirmationMessage(carpool: Carpool, parentName: string): string {
    return `Hi ${parentName}, just confirming our carpool arrangement for tomorrow. ${carpool.canPickup ? `I'll collect from ${carpool.outboundDropoffPreference === 'my-address' ? 'my address' : 'our agreed meeting point'} at ${carpool.outboundDepartureTime}.` : ''} Please confirm you're still able to participate. My number is ${carpool.phoneNumber} for any last-minute updates.`;
  }
}

export const communicationHintsService = new CommunicationHintsService();