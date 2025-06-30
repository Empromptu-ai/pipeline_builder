type CommonRequest = Omit<RequestInit, 'body'> & { body?: URLSearchParams | string };

export async function request(url: string, init?: CommonRequest) {
  return fetch(url, init as RequestInit);
}
