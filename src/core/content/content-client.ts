import type { TadaDocumentNode } from './graphql';

/**
 * The single boundary between the Core and DatoCMS. Every read goes through
 * it, and it is the only part of the Core that tests replace with a fake.
 */
export interface ContentClient {
  query<Result, Variables>(
    query: TadaDocumentNode<Result, Variables>,
    variables: Variables,
  ): Promise<Result>;
}
