/** Every TanStack Query key in one place, so invalidation after mutations stays precise. */
export const qk = {
  health: ["health"] as const,
  me: ["me"] as const,
  skills: (search: string) => ["skills", search] as const,
  card: (login: string) => ["card", login.toLowerCase()] as const,
  analyses: (page = 1) => ["analyses", "list", page] as const,
  analysis: (id: string) => ["analyses", "detail", id] as const,
  claimedSkills: ["me", "claimed-skills"] as const,
  profileViews: ["me", "profile-views"] as const,
  feedback: (page = 1, pageSize = 20, status = "") => ["feedback", page, pageSize, status] as const,
  notifications: (unread: boolean, page = 1) => ["notifications", unread ? "unread" : "all", page] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  preferences: ["me", "notification-preferences"] as const,
};
