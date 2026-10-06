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
  // Not an HTTP redirect: Netlify appends the request's query string, and with
  // it the secret, to any redirect's Location. A meta refresh keeps it out.
  const destination = escapeAttribute(new URL(target, request.url).toString());
  return new Response(
    `<!doctype html><meta http-equiv="refresh" content="0;url=${destination}"><a href="${destination}">Continue</a>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    },
  );
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
