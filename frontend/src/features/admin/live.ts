/**
 * Admin lists that should feel live: refetch every 15 s while the tab is visible, and straight away
 * when the admin comes back to the tab (the app-wide default turns focus refetching off). Polling
 * is enough for sign-up volumes; there is no push channel from the API.
 */
export const ADMIN_LIVE = { refetchInterval: 15_000, refetchOnWindowFocus: true } as const;
