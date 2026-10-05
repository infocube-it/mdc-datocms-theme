/*
 * gql.tada setup for the DatoCMS Content Delivery API. Types come from
 * `schema.graphql` (see the `generate-schema` script); the custom scalars are
 * mapped by hand, as documented in
 * https://www.datocms.com/docs/content-delivery-api/custom-scalar-types
 */
import { initGraphQLTada } from 'gql.tada';
import type { introspection } from './graphql-env';

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    BooleanType: boolean;
    CustomData: Record<string, string>;
    Date: string;
    DateTime: string;
    FloatType: number;
    IntType: number;
    ItemId: string;
    JsonField: unknown;
    MetaTagAttributes: Record<string, string>;
    UploadId: string;
  };
}>();

export { readFragment } from 'gql.tada';
export type { FragmentOf, ResultOf, TadaDocumentNode, VariablesOf } from 'gql.tada';
