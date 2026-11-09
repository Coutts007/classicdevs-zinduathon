import { OAuthCallbackPage } from "./OAuthCallbackPage";

/** GitHub sends the browser here with ?code&state. */
export function GithubCallbackPage() {
  return <OAuthCallbackPage provider="github" />;
}
