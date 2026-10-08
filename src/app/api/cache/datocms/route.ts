import { core } from '@/site/core';

/** Called by the DatoCMS `cda_cache_tags` webhook after a publish. */
export const POST = (request: Request) => core.handleCacheTagsWebhook(request);
