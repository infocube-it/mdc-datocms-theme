import type { RoutableRecord } from './routing/routable-model';

/** Renders a resolved record with the template of its model. */
export function RecordView({ record }: { record: RoutableRecord }) {
  return record.view;
}
