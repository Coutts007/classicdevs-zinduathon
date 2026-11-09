/** Rough guide only; the backend's password validators make the final call. */
export function passwordScore(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  if (/^(.)\1+$/.test(value) || /^(password|12345678|qwerty)/i.test(value)) score = 1;
  return Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;
}
