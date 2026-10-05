import { localeRootPath } from './path-builder';

export type Redirect = { kind: 'redirect'; destination: string; permanent: boolean };

export function redirectToLocaleRoot(locale: string, { permanent }: { permanent: boolean }): Redirect {
  return { kind: 'redirect', destination: localeRootPath(locale), permanent };
}
