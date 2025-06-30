
// Hasty comment-out - this is deprecated, remove soon
// import { randomBytes } from 'crypto';

// export function generateSessionId(): string {
//   // Generate a random 8-byte buffer and convert to hex
//   return randomBytes(8).toString('hex');
// }

// // Alternative shorter version using timestamp + random
// export function generateShortSessionId(): string {
//   const timestamp = Date.now().toString(36);
//   const random = Math.random().toString(36).substring(2, 8);
//   return `${timestamp}-${random}`;
// }
