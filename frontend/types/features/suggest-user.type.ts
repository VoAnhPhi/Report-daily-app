import { Attachment } from '../attachment.type';
import { Role } from '../user.type';

export type SuggestUser = {
  id: string;
  referenceId: string;

  role: Role;

  email: string;
  fullName: string | null;
  avatar?: Attachment | null;
  cover?: Attachment | null;
  dob: Date | null; // ISO Date
  verificationDate: Date | null; // ISO Date
  isActive: boolean;
};
