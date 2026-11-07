/** Domain types, all derived from the generated schema (never hand-written duplicates). */
import type { components } from "./schema";

type S = components["schemas"];
export type Me = S["Me"];
export type AuthResponse = S["AuthResponse"];
export type Role = NonNullable<Me["role"]>;
export type ApprovalStatus = NonNullable<S["RecruiterProfile"]["approvalStatus"]>;
export type RegisterRequest = S["RegisterRequest"];
export type Card = S["Card"];
export type CardSkill = S["CardSkill"];
export type CardRepo = S["CardRepo"];
export type CardFlag = S["CardFlag"];
export type SubScoreKey = keyof S["CardSubScores"];
export type AnalysisDetail = S["AnalysisDetail"];
export type AnalysisListItem = S["AnalysisListItem"];
export type Skill = S["Skill"];
export type ClaimedSkill = S["ClaimedSkill"];
export type Feedback = S["Feedback"];
export type Notification = S["Notification"];
export type PreferenceMatrix = S["PreferenceMatrix"];
export type PreferenceChange = S["PreferenceChangeRequest"];
