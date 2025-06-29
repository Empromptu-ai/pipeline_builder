// import { atom } from 'nanostores';
// import { randomBytes } from 'crypto';

// a session ID meant to be random for each user+session
// export const sessionUid = atom<string | undefined>(undefined);
// const description = randomBytes(8).toString('hex');
// sessionUid.set(description);


import { atom } from 'nanostores';

export function generateUID() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// export const sessionUid = atom<string | undefined>(undefined);
// const description = generateUID();
// sessionUid.set(description);

export const sessionUid = atom<string | undefined>(undefined);
// Only set if it's currently undefined - so just an initial setting here
if (sessionUid.get() === undefined) {
  sessionUid.set(generateUID());
}