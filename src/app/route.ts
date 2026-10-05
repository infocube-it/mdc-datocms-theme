import { NextResponse } from 'next/server';
import { core } from '@/site/core';

// The bare domain: a route handler, unlike a page, can answer exactly 302.
export async function GET(request: Request) {
  const { destination } = await core.rootRedirect(request.headers.get('accept-language'));
  const response = NextResponse.redirect(new URL(destination, request.url), 302);
  // The destination depends on the browser's language: caches must not share it.
  response.headers.set('Vary', 'Accept-Language');
  return response;
}
