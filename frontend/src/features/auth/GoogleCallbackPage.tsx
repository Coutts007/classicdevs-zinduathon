import { OAuthCallbackPage } from "./OAuthCallbackPage";

/** Google sends the browser here with ?code&state. */
export function GoogleCallbackPage() {
  return <OAuthCallbackPage provider="google" />;
}
