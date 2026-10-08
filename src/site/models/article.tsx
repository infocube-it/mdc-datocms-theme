import { defineRoutableModel, graphql, type ResultOf } from '@/core';

/*
 * The sample Routable model of the Seed's reference schema. Its records get
 * their Paths from the Routing rule for `article` (migration
 * 1759950000_routing_rules_and_article.ts).
 */

const ArticleBySlugQuery = graphql(`
  query ArticleBySlug($locale: SiteLocale!, $slug: String!) {
    article(locale: $locale, filter: { slug: { eq: $slug }, _locales: { allIn: [$locale] } }) {
      id
      title
    }
  }
`);

type Article = NonNullable<ResultOf<typeof ArticleBySlugQuery>['article']>;

export const article = defineRoutableModel({
  apiKey: 'article',
  async findBySlug(contentClient, { locale, slug }) {
    return (await contentClient.query(ArticleBySlugQuery, { locale, slug })).article;
  },
  title: (record: Article) => record.title,
  render: (record: Article) => (
    <article>
      <h1>{record.title}</h1>
    </article>
  ),
});
