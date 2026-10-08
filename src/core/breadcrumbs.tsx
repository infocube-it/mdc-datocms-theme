import type { Breadcrumb } from './routing/path-builder';

/**
 * The breadcrumbs of a resolved record, the last step being the current
 * record. Marked as repeated layout, so Site search doesn't index it.
 */
export function Breadcrumbs({ items, label }: { items: Breadcrumb[]; label: string }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={label} data-datocms-noindex="">
      <ol>
        {items.map((item, index) => (
          <li key={item.path}>
            {index === items.length - 1 ? (
              <span aria-current="page">{item.title}</span>
            ) : (
              <a href={item.path}>{item.title}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
