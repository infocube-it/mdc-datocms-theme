import 'server-only';
import { executeQuery } from '@datocms/cda-client';
import type { ContentClient } from './content-client';

/**
 * Content client backed by the DatoCMS Content Delivery API. It reads
 * published content from the project's primary environment.
 *
 * `excludeInvalid` narrows the generated types: fields with a Required
 * validation are non-null, so `schema.graphql` must be downloaded with the
 * same header.
 */
export function createDatoContentClient(): ContentClient {
  return {
    query(query, variables) {
      return executeQuery(query, {
        variables,
        excludeInvalid: true,
        token: requiredEnv('DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN'),
      });
    },
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
