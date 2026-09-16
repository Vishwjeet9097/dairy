/**
 * Text inputs.
 *
 * `Field` for forms, `SearchField` for the filter bars that appear on four
 * screens. Both keep the same height, radius and icon treatment.
 *
 * Focus is animated with a border-colour crossfade rather than a shadow, so
 * focusing an input never triggers a layout pass mid-keystroke.
 */

import type { LucideIcon } from 'lucide-react-native';
import { Search, X } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui';

import { IconButton } from '@/components/ui/button';
import { Colors, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';

/* ─── Field ──────────────────────────────────────────────────────────────── */

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: LucideIcon;
  /** Validation message. Recolours the border and shows the text below. */
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, icon: Icon, error, containerStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const { accent } = useAppTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? Colors.danger : focused ? accent.color : 'transparent';

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.field, { borderColor }]}>
        {Icon ? (
          <Icon size={18} color={error ? Colors.danger : accent.color} />
        ) : null}

        <TextInput
          ref={ref}
          placeholderTextColor={Colors.mutedForeground}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={styles.input}
          {...rest}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

/* ─── Search field ───────────────────────────────────────────────────────── */

export function SearchField({
  value,
  onChangeText,
  placeholder,
  onSubmitEditing,
  style,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.search, style]}>
      <Search size={18} color={Colors.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.mutedForeground}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        // Search fields are transient; never autocorrect a customer's name.
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.searchInput}
      />
      {value.length > 0 ? (
        <IconButton
          icon={X}
          onPress={() => onChangeText('')}
          accessibilityLabel="Clear search"
          size={26}
          iconSize={14}
          background="transparent"
          color={Colors.mutedForeground}
          style={styles.searchClear}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...Type.footnote,
    fontWeight: '800',
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    // Border is always present and only changes colour, so focusing cannot
    // resize the field.
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    ...Type.body,
    color: Colors.foreground,
    // Vertical padding on the input rather than the wrapper keeps the text
    // baseline stable when `multiline` grows the field.
    paddingVertical: 13,
  },
  error: {
    ...Type.footnote,
    color: Colors.danger,
    marginTop: 5,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    ...Type.callout,
    color: Colors.foreground,
    paddingVertical: 13,
  },
  searchClear: {
    borderWidth: 0,
  },
});
