let currentSessionUid = null;

export function setSessionUid(uid) {
  currentSessionUid = uid;
}

export function getSessionUid() {
  return currentSessionUid;
}
