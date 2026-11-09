/** GitHub's side of the shared OAuth helper (see oauth.ts). */
import { startOAuth, takeOAuthSession } from "./oauth";

type Start = Parameters<typeof startOAuth>[1];

export const startGithub = (options: Start = {}) => startOAuth("github", options);
export const takeGithubSession = () => takeOAuthSession("github");
