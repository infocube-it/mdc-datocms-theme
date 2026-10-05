import type { Metadata } from 'next';
import { type FragmentOf, graphql, readFragment } from './content/graphql';

export const RecordMetadataFragment = graphql(`
  fragment RecordMetadataFragment on PageRecord {
    title
  }
`);

/** Builds the Next.js metadata of a resolved record. */
export function recordMetadata(data: FragmentOf<typeof RecordMetadataFragment>): Metadata {
  const record = readFragment(RecordMetadataFragment, data);
  return { title: record.title };
}
