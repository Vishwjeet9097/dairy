/**
 * Helpers for reading the *currently focused* route out of a (possibly nested)
 * navigation state.
 *
 * The tab bar needs this to decide whether it should be on screen: the tabs
 * navigator only knows which tab is focused, while the thing that matters is
 * which screen is focused inside that tab's stack.
 *
 * Deriving this synchronously from navigation state — rather than having each
 * screen imperatively tell the bar to hide on mount — is what keeps the
 * transition flicker-free. The bar knows the destination is full-screen at the
 * same moment the navigator does, so both animate on the same frame instead of
 * the bar catching up a frame late.
 */

import { FULL_SCREEN_ROUTES } from './config';

/**
 * Structural shape shared by React Navigation's `NavigationState` and
 * `PartialState`. Typed locally so we don't depend on navigator-specific
 * generics, and so partially-initialised nested states (where `index` is
 * undefined until the child navigator mounts) are handled.
 */
export interface RouteStateLike {
  index?: number;
  routes?: readonly { readonly name: string; readonly state?: RouteStateLike }[];
}

/**
 * Names of every route along the focused path, outermost first.
 *
 * e.g. Customers tab showing the payment form →
 *   ['customers', '[id]/payment']
 */
export function focusedRoutePath(state: RouteStateLike | undefined): string[] {
  const path: string[] = [];
  let current: RouteStateLike | undefined = state;

  while (current?.routes?.length) {
    // A freshly-created nested state has no `index` yet; the focused route is
    // then the last one in the list.
    const index = current.index ?? current.routes.length - 1;
    const route = current.routes[index];
    if (!route) break;
    path.push(route.name);
    current = route.state;
  }

  return path;
}

/** The deepest focused route name, or undefined for an empty state. */
export function focusedRouteName(state: RouteStateLike | undefined): string | undefined {
  const path = focusedRoutePath(state);
  return path[path.length - 1];
}

/**
 * True when the focused screen is a full-screen workflow and the bottom bar
 * should step aside. Checks every segment so a route nested more than one level
 * deep is still matched.
 */
export function isFullScreenWorkflow(state: RouteStateLike | undefined): boolean {
  return focusedRoutePath(state).some((name) => FULL_SCREEN_ROUTES.has(name));
}
