import { draftMode } from 'next/headers';
import { core } from '@/site/core';

/** Entered from the DatoCMS Web Previews plugin: `?secret=…&path=/it/some-page`. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = core.draftEnableTarget({
    secret: searchParams.get('secret'),
    path: searchParams.get('path'),
  });
  if (target === null) return new Response('Invalid secret', { status: 401 });

  (await draftMode()).enable();
  // An absolute Location: Netlify appends the request's query string, and with
  // it the secret, to a relative one (`redirect()` sends a relative one too).
  return Response.redirect(new URL(target, request.url), 307);
}
