/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NAVIGATION CONFIG
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * One place that describes the app's primary navigation. The tab bar, the tabs
 * layout and the "hide chrome on full-screen workflows" rule all read from
 * here, so adding a tab or a full-screen route is a single-line change and
 * cannot drift between the bar and the navigator.
 *
 * ── Information architecture ──
 * The brief suggested Home / Customers / Delivery / Cows / More. This app has
 * no cattle-management feature, so that slot would be an empty tab. Instead we
 * keep the app's real structure and apply the same principle — five primary
 * destinations, task-first ordering:
 *
 *   Home       → dashboard
 *   Customers  → list → detail → (payment · bill · ledger · history)
 *   Delivery   → today's round, the core daily workflow
 *   Billing    → dues and collection
 *   More       → reports · settings
 *
 * Delivery is promoted from a buried CTA to a tab because it is the screen a
 * milkman opens twice a day. Reports and Settings collapse into More since they
 * are visited occasionally, not daily.
 */

import {
  Home,
  MoreHorizontal,
  ReceiptText,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

import type { TranslationKey } from '@/lib/i18n';

export interface TabDefinition {
  /** Route name inside the `(tabs)` group — must match the file/folder name. */
  name: string;
  /** i18n key for the label. */
  labelKey: TranslationKey;
  icon: LucideIcon;
  /** Screen-reader label suffix, e.g. "Customers tab". */
  a11yKey: TranslationKey;
}

/**
 * Order matters and is authoritative.
 *
 * The tabs layout renders one `<Tabs.Screen>` per entry in this order, and Expo
 * Router's `getSortedChildren` orders the navigator by those declarations rather
 * than by the filesystem. Without them the bar would fall back to alphabetical
 * order (billing before customers), which is not the task-first order we want.
 * The bar itself iterates `state.routes`, so it always agrees with the navigator.
 */
export const TABS: readonly TabDefinition[] = [
  { name: 'index', labelKey: 'nav.home', a11yKey: 'nav.home', icon: Home },
  { name: 'customers', labelKey: 'nav.customers', a11yKey: 'nav.customers', icon: Users },
  { name: 'delivery', labelKey: 'nav.delivery', a11yKey: 'nav.delivery', icon: Truck },
  { name: 'billing', labelKey: 'nav.billing', a11yKey: 'nav.billing', icon: ReceiptText },
  { name: 'more', labelKey: 'nav.more', a11yKey: 'nav.more', icon: MoreHorizontal },
];

/**
 * Nested route names that take over the whole screen. The bottom bar animates
 * away for these and returns when the user leaves them.
 *
 * These are full-screen *workflows* — forms and document views where the bar
 * would steal vertical space and invite the user to abandon a half-finished
 * task. Detail and list screens (`[id]/index`, `[id]/ledger`,
 * `[id]/payments`) deliberately keep the bar: they are places to *be*, not
 * tasks to *finish*, so cross-tab navigation should stay one tap away.
 *
 * ── These must be Expo Router *route names*, not URL paths ──
 * For a route nested below a dynamic segment the name keeps the segment, so the
 * payment screen is `[id]/payment` and NOT `payment` or `/customers/1/payment`.
 * The names Expo Router generates for the Customers stack are exactly:
 *
 *   index · new · [id]/index · [id]/bill · [id]/ledger · [id]/payment · [id]/payments
 *
 * `isFullScreenWorkflow` tests every segment of the focused route path against
 * this set, so a bare name like `new` and a nested one like `[id]/payment` both
 * work. If you add a full-screen screen and forget to register it here, the bar
 * will simply stay visible — it fails soft, so it is worth checking.
 */
export const FULL_SCREEN_ROUTES: ReadonlySet<string> = new Set([
  'new', // add / edit customer form
  '[id]/payment', // record payment form
  '[id]/bill', // invoice document view
]);

/** Route name of the tab the app opens on, and the Android back target. */
export const INITIAL_TAB = 'index';
