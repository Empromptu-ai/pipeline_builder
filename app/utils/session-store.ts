

declare global {
  var currentSessionUid: string | undefined;
}

export function setSessionUid(uid: string): void {
  global.currentSessionUid = uid;
}

export function getSessionUid(): string | undefined {
  return global.currentSessionUid;
}