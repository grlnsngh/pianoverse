import React, { createContext, useContext } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { fonts, radii, type } from "@/constants/theme";
import { makeStyles } from "@/lib/ThemeContext";

/** What a group tells the rows inside it. */
type GroupSettings = {
  /** Rows in a sheet are 52 high with the value on the right, not 56 with it after the label */
  inSheet: boolean;
  /** Width of the label column of a form row */
  labelWidth: number;
};

export const DEFAULT_LABEL_WIDTH = 84;

export const GroupContext = createContext<GroupSettings>({
  inSheet: false,
  labelWidth: DEFAULT_LABEL_WIDTH,
});

export type GroupProps = {
  children: React.ReactNode;
  /** Small heading above the panel, such as "Show" */
  title?: string;
  /** A hint under the panel */
  footer?: string;
  /** Rows sit in a sheet (Record payment) rather than on a page (Add piano) */
  inSheet?: boolean;
  /** Width of the label column. 84 fits "Purchased"; "Purchase price" needs 112. */
  labelWidth?: number;
  /** Corners: 16 for form panels (default), 20 for the cards on Account and Detail */
  radius?: "card" | "panel";
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A white panel of rows on a grouped background, with a hairline between one
 * row and the next. Rows can be FormRows or anything else.
 */
const Group = ({
  children,
  title,
  footer,
  inSheet = false,
  labelWidth = DEFAULT_LABEL_WIDTH,
  radius = "card",
  style,
  testID,
}: GroupProps) => {
  const styles = useStyles();
  const rows = rowsOf(children);

  return (
    <View style={style} testID={testID}>
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}

      <GroupContext.Provider value={{ inSheet, labelWidth }}>
        <View
          style={[styles.panel, { borderRadius: radii[radius] }]}
          testID={testID ? `${testID}-panel` : undefined}
        >
          {rows.map((row, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={styles.divider} />}
              {row}
            </React.Fragment>
          ))}
        </View>
      </GroupContext.Provider>

      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
};

/** What the rows of the group they are in should look like. */
export const useGroup = () => useContext(GroupContext);

/**
 * The rows of a group, in order. Rows wrapped in a fragment count as rows, so
 * `{isRentable && <>…</>}` gets its lines; left out rows (false, null) don't.
 */
const rowsOf = (children: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(children).flatMap((child) =>
    React.isValidElement(child) && child.type === React.Fragment
      ? rowsOf((child.props as { children?: React.ReactNode }).children)
      : [child]
  );

const useStyles = makeStyles((colors) => ({
  title: {
    ...type.status,
    marginLeft: 16,
    marginBottom: 8,
    color: colors.ink2,
  },
  panel: {
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  divider: { height: 1, backgroundColor: colors.hairline },
  footer: {
    ...type.caption,
    fontFamily: fonts.regular,
    marginTop: 8,
    marginHorizontal: 16,
    color: colors.ink2,
  },
}));

export default Group;
