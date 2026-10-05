import type { RoutableRecord } from './routing/resolve-route';
import { PageTemplate } from './templates/page-template';

/** Renders a resolved record with the template of its model. */
export function RecordView({ record }: { record: RoutableRecord }) {
  switch (record.__typename) {
    case 'PageRecord':
      return <PageTemplate data={record} />;
  }
}
