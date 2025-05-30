// Simple in-memory short URL service
// This creates short codes that map to existing event URLs

interface ShortUrlMapping {
  shortCode: string;
  shareableUrl: string;
  eventId: number;
  createdAt: Date;
}

class ShortUrlService {
  private mappings = new Map<string, ShortUrlMapping>();
  private eventToShortCode = new Map<number, string>();

  private generateShortCode(): string {
    // Generate a 6-character alphanumeric code for SMS-friendly URLs
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Exclude O, 0 for clarity
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private ensureUniqueCode(): string {
    let code = this.generateShortCode();
    while (this.mappings.has(code)) {
      code = this.generateShortCode();
    }
    return code;
  }

  createShortUrl(eventId: number, shareableUrl: string): string {
    // Check if event already has a short code
    const existingCode = this.eventToShortCode.get(eventId);
    if (existingCode) {
      return existingCode;
    }

    const shortCode = this.ensureUniqueCode();
    const mapping: ShortUrlMapping = {
      shortCode,
      shareableUrl,
      eventId,
      createdAt: new Date()
    };

    this.mappings.set(shortCode, mapping);
    this.eventToShortCode.set(eventId, shortCode);

    return shortCode;
  }

  getShareableUrl(shortCode: string): string | null {
    const mapping = this.mappings.get(shortCode.toUpperCase());
    return mapping ? mapping.shareableUrl : null;
  }

  getShortCodeForEvent(eventId: number): string | null {
    return this.eventToShortCode.get(eventId) || null;
  }

  getAllMappings(): ShortUrlMapping[] {
    return Array.from(this.mappings.values());
  }
}

export const shortUrlService = new ShortUrlService();