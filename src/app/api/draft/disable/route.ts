import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

/** The "exit draft mode" link of the Site. It needs no secret: it only drops the Editor's cookie. */
export async function GET() {
  (await draftMode()).disable();
  redirect('/');
}
