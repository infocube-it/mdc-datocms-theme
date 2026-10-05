import { type FragmentOf, graphql, readFragment } from '../content/graphql';

export const PageTemplateFragment = graphql(`
  fragment PageTemplateFragment on PageRecord {
    title
  }
`);

export function PageTemplate({ data }: { data: FragmentOf<typeof PageTemplateFragment> }) {
  const page = readFragment(PageTemplateFragment, data);

  return (
    <article>
      <h1>{page.title}</h1>
    </article>
  );
}
