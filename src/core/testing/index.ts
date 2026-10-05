/*
 * Test helpers that are part of the Core's public interface. Not for
 * production code.
 */
import type { ContentClient } from '../content/content-client';

/** Returns the fixture response data for one query, given its variables. */
export type Fixture = (variables: Record<string, unknown>) => unknown;

/**
 * A content client that answers each query with the fixture registered under
 * the query's operation name, as DatoCMS would answer it. An unexpected
 * query fails loudly.
 */
export function createFakeContentClient(fixtures: Record<string, Fixture>): ContentClient {
  return {
    async query(query, variables) {
      const operationName = query.definitions.find(
        (definition) => definition.kind === 'OperationDefinition',
      )?.name?.value;
      const fixture = operationName ? fixtures[operationName] : undefined;
      if (!fixture) throw new Error(`No fixture for query ${operationName ?? '(anonymous)'}`);

      return structuredClone(fixture(variables as Record<string, unknown>)) as never;
    },
  };
}
