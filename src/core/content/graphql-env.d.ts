/* eslint-disable */
/* prettier-ignore */

export type introspection_types = {
    'Boolean': unknown;
    'BooleanType': unknown;
    'CustomData': unknown;
    'Date': unknown;
    'DateTime': unknown;
    'FloatType': unknown;
    'IntType': unknown;
    'ItemId': unknown;
    'JsonField': unknown;
    'MetaTagAttributes': unknown;
    'PageRecord': { kind: 'OBJECT'; name: 'PageRecord'; fields: { 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ItemId'; ofType: null; }; } }; 'slug': { name: 'slug'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'title': { name: 'title'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; }; };
    'Query': { kind: 'OBJECT'; name: 'Query'; fields: { '_site': { name: '_site'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Site'; ofType: null; }; } }; 'siteSettings': { name: 'siteSettings'; type: { kind: 'OBJECT'; name: 'SiteSettingsRecord'; ofType: null; } }; }; };
    'RecordInterface': { kind: 'INTERFACE'; name: 'RecordInterface'; fields: { 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ItemId'; ofType: null; }; } }; }; possibleTypes: 'PageRecord' | 'SiteSettingsRecord'; };
    'Site': { kind: 'OBJECT'; name: 'Site'; fields: { 'locales': { name: 'locales'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'ENUM'; name: 'SiteLocale'; ofType: null; }; }; }; } }; }; };
    'SiteLocale': { name: 'SiteLocale'; enumValues: 'it' | 'en'; };
    'SiteSettingsRecord': { kind: 'OBJECT'; name: 'SiteSettingsRecord'; fields: { 'homePage': { name: 'homePage'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'PageRecord'; ofType: null; }; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ItemId'; ofType: null; }; } }; }; };
    'String': unknown;
    'UploadId': unknown;
};

/** An IntrospectionQuery representation of your schema.
 *
 * @remarks
 * This is an introspection of your schema saved as a file by GraphQLSP.
 * It will automatically be used by `gql.tada` to infer the types of your GraphQL documents.
 * If you need to reuse this data or update your `scalars`, update `tadaOutputLocation` to
 * instead save to a .ts instead of a .d.ts file.
 */
export type introspection = {
  name: never;
  query: 'Query';
  mutation: never;
  subscription: never;
  types: introspection_types;
};

import * as gqlTada from 'gql.tada';

declare module 'gql.tada' {
  interface setupSchema {
    introspection: introspection
  }
}