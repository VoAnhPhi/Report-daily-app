import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ClassConstructor } from 'class-transformer/types/interfaces';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Readable } from 'stream';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as crypto from 'crypto';
import * as unidecode from 'unidecode';

function validateConfig<T extends object>(
  config: Record<string, unknown>,
  envVariablesClass: ClassConstructor<T>,
) {
  const validatedConfig = plainToClass(envVariablesClass, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}

export default validateConfig;

async function deepResolvePromises(input) {
  if (input instanceof Promise) {
    return await input;
  }

  if (Array.isArray(input)) {
    const resolvedArray = await Promise.all(input.map(deepResolvePromises));
    return resolvedArray;
  }

  if (input instanceof Date) {
    return input;
  }

  // Pass through binary / stream payloads unchanged. Rebuilding them via
  // Object.keys would strip the prototype (e.g. StreamableFile), which then
  // defeats ClassSerializerInterceptor's StreamableFile bypass and trips
  // class-transformer on the handler's response.
  if (
    input instanceof StreamableFile ||
    Buffer.isBuffer(input) ||
    input instanceof Readable ||
    input instanceof ArrayBuffer ||
    ArrayBuffer.isView(input)
  ) {
    return input;
  }

  if (typeof input === 'object' && input !== null) {
    const keys = Object.keys(input);
    const resolvedObject = {};

    for (const key of keys) {
      const resolvedValue = await deepResolvePromises(input[key]);
      resolvedObject[key] = resolvedValue;
    }

    return resolvedObject;
  }

  return input;
}

@Injectable()
export class ResolvePromisesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => deepResolvePromises(data)));
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a user-friendly but secure password
 * @param length Password length (default: 12, minimum: 8)
 * @returns Secure but readable password string
 */
export function generateSecurePassword(length: number = 12): string {
  if (length < 8) {
    throw new Error(
      'Password length must be at least 8 characters for security',
    );
  }

  // Use only alphanumeric characters for better readability
  // Avoid ambiguous characters like '0', 'O', '1', 'l', 'I'
  const lowercase = 'abcdefghijkmnpqrstuvwxyz'; // Removed 'l' and 'o'
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed 'I' and 'O'
  const numbers = '23456789'; // Removed '0' and '1'

  // Combine character sets
  const allChars = lowercase + uppercase + numbers;

  let password = '';

  // Ensure good distribution of character types
  const parts = Math.floor(length / 3);
  const remainder = length % 3;

  // Add lowercase letters
  for (let i = 0; i < parts + (remainder > 0 ? 1 : 0); i++) {
    password += getRandomChar(lowercase);
  }

  // Add uppercase letters
  for (let i = 0; i < parts + (remainder > 1 ? 1 : 0); i++) {
    password += getRandomChar(uppercase);
  }

  // Add numbers
  for (let i = 0; i < parts; i++) {
    password += getRandomChar(numbers);
  }

  // Fill remaining length if needed
  while (password.length < length) {
    password += getRandomChar(allChars);
  }

  // Shuffle the password to avoid predictable patterns
  return shuffleString(password);
}

/**
 * Get a random character from a string using cryptographically secure random bytes
 */
function getRandomChar(charSet: string): string {
  const randomBytes = crypto.randomBytes(1);
  const randomIndex = randomBytes[0] % charSet.length;
  return charSet[randomIndex];
}

/**
 * Shuffle a string using Fisher-Yates algorithm with cryptographically secure randomness
 */
function shuffleString(str: string): string {
  const array = str.split('');
  for (let i = array.length - 1; i > 0; i--) {
    const randomBytes = crypto.randomBytes(1);
    const j = randomBytes[0] % (i + 1);

    // Swap elements
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array.join('');
}

function normalize(s: string) {
  return unidecode((s || '').toLowerCase().trim());
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Score theo mức độ khớp tên:
 * exact full === 1000
 * exact từ (word-equal) === 950
 * khớp đầu từ (word-start) === 900
 * startsWith toàn chuỗi === 800
 * contains === 700
 * + ưu tiên vị trí xuất hiện gần đầu chuỗi
 */
export function scoreFullName(fullName: string, query: string): number {
  const n = normalize(fullName);
  const q = normalize(query);
  if (!q) return 0;

  if (n === q) return 1000;

  // tách từ để ưu tiên khớp đúng từ "hương" trong "nguyễn thị hương"
  const words = n.split(/\s+/);
  if (words.includes(q)) return 950;

  // khớp ở đầu từ: (^|\s)q(\b|…)
  const wordStart = new RegExp(`(^|\\s)${escapeRegExp(q)}(\\b|\\s|$)`);
  if (wordStart.test(n)) return 900;

  if (n.startsWith(q)) return 800;

  if (n.includes(q)) {
    // ưu tiên vị trí xuất hiện càng sớm càng tốt
    const pos = n.indexOf(q); // 0 tốt nhất
    return 700 + Math.max(0, 100 - pos); // 700..800
  }

  return 0;
}

// Điểm thấp hơn cho các trường khác
export interface ScoreOtherFieldsInput {
  referenceId?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
}

export function scoreOtherFields(
  u: ScoreOtherFieldsInput,
  query: string,
): number {
  const q = normalize(query);
  const inRef = normalize(u.referenceId || '');
  const inEmail = normalize(u.email || '');
  const inPhone = normalize(u.phoneNumber || '');
  let s = 0;

  if (inRef.startsWith(q)) s = Math.max(s, 500);
  else if (inRef.includes(q)) s = Math.max(s, 450);

  if (inEmail.startsWith(q)) s = Math.max(s, 420);
  else if (inEmail.includes(q)) s = Math.max(s, 400);

  if (inPhone.includes(q)) s = Math.max(s, 380);

  return s;
}
