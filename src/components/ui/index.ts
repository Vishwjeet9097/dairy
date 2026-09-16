/**
 * Shared UI barrel.
 *
 * Import from `@/components/ui` rather than reaching into individual files, so
 * screens have one obvious place to look for a primitive and the internal file
 * layout stays free to change.
 */

export { AppBar, HeaderAction, ScreenHeader, type AppBarProps, type ScreenHeaderProps } from './app-bar';
export { Avatar, type AvatarProps } from './avatar';
export { BottomFog } from './bottom-fog';
export { BottomSheet, type BottomSheetProps } from './bottom-sheet';
export {
  Button,
  IconButton,
  Segmented,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
  type SegmentedOption,
} from './button';
export { Dialog, type DialogProps } from './dialog';
export { Badge, EmptyState, LoadingState, type BadgeTone } from './feedback';
export { Field, SearchField, type FieldProps } from './field';
export { AppGlassMaterial, type AppGlassMaterialProps, type GlassLevel } from './glass';
export { Screen, type ScreenProps } from './screen';
export { Sparkline, type SparklineProps } from './sparkline';
export {
  Card,
  Divider,
  NavRow,
  PressableCard,
  SectionHeading,
  SectionLabel,
  type CardProps,
  type NavRowProps,
} from './surfaces';
export { Toggle, ToggleRow, type ToggleProps } from './toggle';
export { TopFog } from './top-fog';
export { Text } from './text';
