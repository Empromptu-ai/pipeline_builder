// let currentSessionUid = null;

// export function setSessionUid(uid) {
//   currentSessionUid = uid;
// }

// export function getSessionUid() {
//   return currentSessionUid;
// }


let currentSessionUid: string | null = null;

export function setSessionUid(uid: string): void {
  currentSessionUid = uid;
}

export function getSessionUid(): string | null {
  return currentSessionUid;
}