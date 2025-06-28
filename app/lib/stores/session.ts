import { atom } from 'nanostores';
import { randomBytes } from 'crypto';

// a session ID meant to be random for each user+session
export const sessionUid = atom<string | undefined>(undefined);
const description = randomBytes(8).toString('hex');
sessionUid.set(description);
