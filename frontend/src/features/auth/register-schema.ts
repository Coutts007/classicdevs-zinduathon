import { z } from "zod";

import { toE164 } from "@/lib/phone";

/** Registration form rules (both steps). Server errors still land on the fields. */
export const registerSchema = z
  .object({
    role: z.enum(["job_seeker", "recruiter"]),
    fullName: z.string().trim().min(1, "Enter your name.").max(150),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
    phone: z.string().trim(),
    companyName: z.string().trim().max(120),
    jobTitle: z.string().trim().max(120),
    consents: z.object({
      terms: z.boolean().refine((v) => v, "Accept the terms and privacy policy to continue."),
      emailFeedback: z.boolean(),
      smsFeedback: z.boolean(),
    }),
  })
  .superRefine((v, ctx) => {
    if (v.role === "recruiter" && !v.companyName)
      ctx.addIssue({ code: "custom", path: ["companyName"], message: "Enter your company's name." });
    if (v.consents.smsFeedback && !v.phone)
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Add a phone number to get feedback by SMS.",
      });
    if (v.phone && !toE164(v.phone))
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Enter a valid phone number, e.g. 0712 345 678.",
      });
  });
export type RegisterValues = z.infer<typeof registerSchema>;
