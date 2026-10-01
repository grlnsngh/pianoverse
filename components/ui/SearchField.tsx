import React, { forwardRef } from "react";
import {
  Pressable,
  StyleProp,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { fonts, shadows } from "@/constants/theme";
import Icon from "./Icon";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const HEIGHT = 52;

export type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** Empties the field. The clear button only shows while there is something to clear. */
  onClear: () => void;
  /** Opens the keyboard at once */
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The search field of the search screen: the same white pill as the Pianos
 * tab's, but one you type in. A round clear button appears at its right end
 * once something is typed.
 */
const SearchField = forwardRef<TextInput, SearchFieldProps>(
  ({ value, onChangeText, onClear, autoFocus, style, testID }, ref) => {
    const colors = useColors();
    const styles = useStyles();
    return (
      <View style={[styles.pill, style]} testID={testID}>
        <Icon name="search" size={20} color={colors.ink} strokeWidth={2} />
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
          placeholder="Search pianos"
          placeholderTextColor={colors.ink3}
          accessibilityLabel="Search pianos"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={colors.ink}
          underlineColorAndroid="transparent"
          style={styles.input}
        />
        {value.length > 0 && (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.clear}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={12} r={10} fill={colors.ink2} />
              <Path
                d="M8.5 8.5l7 7M15.5 8.5l-7 7"
                stroke={colors.surface}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        )}
      </View>
    );
  }
);
SearchField.displayName = "SearchField";

const useStyles = makeStyles((colors) => ({
  pill: {
    height: HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 16,
    paddingRight: 4,
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    ...shadows.searchPill,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    padding: 0,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  clear: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
}));

export default SearchField;
