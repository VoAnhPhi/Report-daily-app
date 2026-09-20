import { AuthUser } from '@/lib/auth';

export enum AddressType {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
}

export interface Address {
  id: string;

  // Basic address information
  type: AddressType; // Type: 'home', 'work', 'other'
  fullName: string; // Full name of the recipient
  phone: string; // Phone number

  // Address components
  street: string; // Street address
  ward?: string; // Ward/Neighborhood (for detailed addressing)
  district?: string; // District (for detailed addressing)
  city: string; // City
  state?: string; // State/Province (optional for international addresses)
  country: string; // Country
  postalCode?: string; // Postal/ZIP code

  // Google Places API fields (for future implementation)
  placeId?: string; // Google Places ID
  latitude?: number; // Latitude coordinate
  longitude?: number; // Longitude coordinate
  formattedAddress?: string; // Google-formatted address

  // User settings
  isDefault: boolean;
  userId: string;

  createdAt: Date;
  updatedAt: Date;

  user?: AuthUser;
}
