// In dev this is the auth UI's own Vite server, which proxies /auth to the auth Worker beside it, so
// one origin serves both the login page and the endpoint our Worker asks about you.
export const AUTH_URL = import.meta.env.DEV ? "http://localhost:34110" : "https://accounts.aidenjang.com";
