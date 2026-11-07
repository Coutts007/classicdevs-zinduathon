import type { Me } from "@/lib/api/types";

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
