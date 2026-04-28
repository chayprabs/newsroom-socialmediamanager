const AUTH_STORAGE_KEY = 'newsroom.authenticated';

function getExpectedCredentials() {
  return {
    username: import.meta.env.VITE_NEWSROOM_USERNAME ?? '',
    password: import.meta.env.VITE_NEWSROOM_PASSWORD ?? '',
  };
}

export function validateCredentials(username: string, password: string) {
  const expected = getExpectedCredentials();

  if (!expected.username || !expected.password) {
    return false;
  }

  return username.trim() === expected.username && password === expected.password;
}

export function isAuthenticated() {
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export function signIn() {
  localStorage.setItem(AUTH_STORAGE_KEY, 'true');
}

export function signOut() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
