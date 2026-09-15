/**
 * react-native-maps has no Node/JSDOM implementation, so the map picker needs a
 * stand-in. Plain string host component types are valid React element types and
 * render as inert host views without needing JSX.
 */

module.exports = {
  __esModule: true,
  default: 'MapView',
  Marker: 'MapMarker',
  Callout: 'MapCallout',
  PROVIDER_GOOGLE: 'google',
  PROVIDER_DEFAULT: 'default',
};
