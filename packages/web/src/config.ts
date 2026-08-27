/**
 * Where the shared sign-in lives.
 *
 * Only ever used to build a redirect. The session cookie is set on `.aidenjang.com` and read by this
 * app's Worker alone, so nothing in the browser here ever touches it.
 *
 * In dev that is the auth UI's own Vite server, which proxies `/auth` to the auth Worker beside it,
 * so one origin serves both the login page and the endpoint this app's Worker asks about you.
 */
export const AUTH_URL = import.meta.env.DEV ? "http://localhost:34110" : "https://accounts.aidenjang.com";
