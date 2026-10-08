import { EVENTS, type AnalyticsEventName } from '@/lib/analytics';
import { TableScroll } from '@/components/ui/TableScroll';

/**
 * Plain-English meaning of each custom event in lib/analytics.ts. Typed
 * against the allowlist, so adding an event there without explaining it
 * here fails the type check instead of shipping an undocumented event.
 */
const EVENT_MEANING: Record<AnalyticsEventName, string> = {
  quiz_started: 'You began the sleep quiz.',
  quiz_completed: 'You finished it. Carries the answer categories you picked (for example "side" or "hot"), never your body weight.',
  match_revealed: 'Your top match was shown: the mattress id, its score and tier.',
  match_viewed: 'You viewed your results list.',
  mattress_viewed: 'You opened a mattress page: its id, brand and type.',
  compare_added: 'You added a mattress to compare: its id and how many are selected.',
  compare_removed: 'You removed one.',
  comparison_started: 'You opened the comparison from the compare tray.',
  comparison_completed: 'A comparison was shown: how many mattresses.',
  affiliate_click: 'You followed a labeled affiliate link: the mattress, the retailer and where on the page it was.',
  outbound_click: "You followed a link to a brand's own site: the destination domain and which mattress.",
  guide_viewed: 'You read a sleep guide: its slug and category.',
  search_used: 'You used search: how long the query was and how many results came back, never the words.',
  filter_used: 'You changed a filter: which filter and its value.',
  layer_explored: 'You selected a layer in the mattress cutaway: which layer, and whether by slider or button.',
  slider_interaction: 'You moved a carousel: which one, how (button, drag, swipe or key) and which slide.',
  category_viewed: 'You opened a category page such as "Best for side sleepers": its slug and how many mattresses it lists.',
  nav_used: 'You used the main menu: which menu and which item.',
};

/** Every event the analytics allowlist permits, with what it carries. Server component. */
export function AnalyticsEventsTable() {
  const eventNames: AnalyticsEventName[] = Object.values(EVENTS);
  return (
    <TableScroll label="Custom analytics events table">
      <table>
        <caption className="sr-only">Custom analytics events</caption>
        <thead>
          <tr>
            <th scope="col">Event</th>
            <th scope="col">Sent when</th>
          </tr>
        </thead>
        <tbody>
          {eventNames.map((name) => (
            <tr key={name}>
              <th scope="row">
                <code>{name}</code>
              </th>
              <td>{EVENT_MEANING[name]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
