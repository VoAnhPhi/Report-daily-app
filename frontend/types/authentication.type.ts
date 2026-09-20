export interface EmailChange {
  token: string;
  newEmail: string;
  userId: string;
  validUntil: Date;
}

export interface EmailVerification {
  token: string;
  userId: string;
  validUntil: Date;
}

export interface PasswordReset {
  token: string;
  userId: string;
  validUntil: Date;
}
