import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Whether `candidate` is the Site's draft mode secret. A Site without one has draft mode closed. */
export function isDraftModeSecret(candidate: string | null): boolean {
  const secret = process.env.DRAFT_MODE_SECRET;
  if (!secret || candidate === null) return false;
  return timingSafeEqual(digest(candidate), digest(secret));
}

/** A path on this Site, or `/`: never a way to send an Editor to another site. */
export function pathOnThisSite(path: string | null): string {
  return path?.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : '/';
}
