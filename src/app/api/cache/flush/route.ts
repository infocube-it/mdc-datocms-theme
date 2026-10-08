import { core } from '@/site/core';

/** Called by a Netlify deploy notification after a code deploy or a rollback. */
export const POST = (request: Request) => core.handleCacheFlush(request);
