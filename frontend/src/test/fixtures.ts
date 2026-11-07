import type { Feedback, Me, Notification } from "@/lib/api/types";

/** /me payloads shaped exactly like the generated schema type. */
export function makeMe(overrides: Partial<Me> = {}): Me {
  return {
    id: "6f1c7a2e-4c9b-4d1f-9a0e-2b8f1d3c5e7a",
    email: "amina@jobseeker.demo",
    role: "job_seeker",
    fullName: "Amina Odhiambo",
    phone: null,
    emailVerified: true,
    phoneVerified: false,
    hasPassword: true,
    dateJoined: "2026-11-07T10:00:00+03:00",
    github: null,
    jobSeekerProfile: { headline: "", location: "", cardVisible: true, openToWork: true },
    recruiterProfile: null,
    ...overrides,
  };
}

export function recruiterMe(status: "pending" | "approved" | "rejected" | "suspended"): Me {
  return makeMe({
    role: "recruiter",
    email: "grace@savanna.demo",
    jobSeekerProfile: null,
    recruiterProfile: {
      company: { id: "c1", name: "Savanna Fintech", isVerified: true },
      jobTitle: "Engineering manager",
      approvalStatus: status,
      reviewNote: "",
      reviewedAt: null,
    },
  });
}

import type { AnalysisDetail, Card } from "@/lib/api/types";

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    username: "amina-demo",
    profile: {
      username: "amina-demo",
      name: "Amina Odhiambo",
      avatarUrl: "https://avatars.example/a.png",
      verifiedOwner: true,
    },
    signalScore: 94,
    subScores: {
      consistency: { value: 20, reason: "Active in 44 of the last 52 weeks" },
      iteration: { value: 14, reason: "Median commit 100 lines" },
      quality: { value: 20, reason: "Has tests, CI, a README and Docker or .env.example" },
      breadth: { value: 20, reason: "1 strong skill, 11 moderate" },
      ownership: { value: 20, reason: "Wrote most of the commits in 3 of 3 original repos" },
    },
    skills: [
      {
        name: "Testing",
        category: "Practice",
        label: "Strong",
        evidence: 2,
        repos: [
          {
            name: "shop-app",
            url: "https://github.com/amina-demo/shop-app",
            commits: 44,
            firstCommit: "2026-01-05T09:00:00Z",
            lastCommit: "2026-10-26T09:00:00Z",
            hasTests: true,
            hasCI: true,
          },
        ],
      },
    ],
    claims: [{ skill: "Kubernetes", status: "Unverified" }],
    flags: [
      {
        type: "one_shot_dump",
        repo: "matatu-routes",
        reason: "99% of the sampled code arrived in one commit.",
      },
    ],
    aiSummary: "Strongest evidence is in Testing across 3 public repositories.",
    reposAnalysed: 3,
    commitsAnalysed: 71,
    analysedAt: "2026-11-07T12:00:00Z",
    ...overrides,
  };
}

export function makeAnalysis(overrides: Partial<AnalysisDetail> = {}): AnalysisDetail {
  return {
    id: "a1",
    githubLogin: "amina-demo",
    status: "running",
    progressStep: 1,
    errorCode: "",
    errorMessage: "",
    signalScore: null,
    createdAt: "2026-11-07T12:00:00Z",
    completedAt: null,
    card: null,
    tips: [],
    ...overrides,
  };
}

export function makeFeedback(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: "fb1",
    status: "shortlisted",
    message: "Loved your shop-app tests. Can we talk on Thursday?",
    company: "Savanna Tech",
    recruiterName: "Wanjiru K.",
    candidate: null,
    jobPosting: null,
    readAt: null,
    createdAt: "2026-11-06T09:00:00Z",
    ...overrides,
  };
}

export function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    kind: "recruiter_feedback",
    title: "New feedback from Savanna Tech",
    body: "You were shortlisted.",
    linkPath: "/inbox",
    readAt: null,
    createdAt: "2026-11-06T09:00:00Z",
    ...overrides,
  };
}

export const page = <T>(results: T[]) => ({ count: results.length, next: null, previous: null, results });
