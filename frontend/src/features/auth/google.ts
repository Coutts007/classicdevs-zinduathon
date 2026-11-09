/** Google's side of the shared OAuth helper (see oauth.ts). */
import { startOAuth, takeOAuthSession } from "./oauth";

type Start = Parameters<typeof startOAuth>[1];

export const startGoogle = (options: Start = {}) => startOAuth("google", options);
export const takeGoogleSession = () => takeOAuthSession("google");
