/**
 * Where the shared sign-in lives.
 *
 * Only ever used to build a redirect. The session cookie is set on `.aidenjang.com` and read by this
 * app's Worker alone, so nothing in the browser here ever touches it.
 */
export const AUTH_URL = "https://accounts.aidenjang.com";
