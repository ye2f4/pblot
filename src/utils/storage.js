import { isBrowser } from './env';

export const storage = {
  get: (key) => {
    if (!isBrowser) return null;
    return localStorage.getItem(key);
  },
  set: (key, value) => {
    if (!isBrowser) return;
    localStorage.setItem(key, value);
  },
  remove: (key) => {
    if (!isBrowser) return;
    localStorage.removeItem(key);
  }
};