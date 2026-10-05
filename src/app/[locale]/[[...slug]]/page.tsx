import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RecordView } from '@/core';
import { core } from '@/site/core';

type Props = PageProps<'/[locale]/[[...slug]]'>;

// Shared by `generateMetadata` and the page within one request. React `cache`
// compares arguments by identity, so the segments travel as one string.
const resolve = cache((locale: string, path: string) =>
  core.resolvePath({ locale, segments: path ? path.split('/') : [] }),
);

async function resolveFromParams(params: Props['params']) {
  const { locale, slug } = await params;
  return resolve(locale, (slug ?? []).join('/'));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return core.metadataFor(await resolveFromParams(params));
}

export default async function CatchAllPage({ params }: Props) {
  const route = await resolveFromParams(params);
  if (route.kind === 'not-found') notFound();

  return <RecordView record={route.record} />;
}
