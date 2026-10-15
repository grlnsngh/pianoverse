import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import type { AgreementKind, FormThumbnailKind, PaperFormId } from "@/utils/paperForms/catalog";

/**
 * Drawings of the paper forms (PaperForms and PaperFormDetail boards): a
 * small page in the list of forms, and a large one at the top of a form's
 * screen. They are pictures of paper, so they stay black on white in the dark
 * theme too, and they are hidden from screen readers: the text next to them
 * says what the form is.
 */
const PAPER = {
  page: "#FFFFFF",
  edge: "#CFCBC2",
  edgeLarge: "#D9D5CC",
  ink: "#1A1814",
  rule: "#8A857C",
  faint: "#B4AEA3",
  light: "#D9D5CC",
  band: "#EFEDE8",
} as const;

const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants" as const,
};

/** A line `width` wide (a number, or a share of the row) and `height` thick. */
const Bar = ({
  width,
  height = 1,
  color = PAPER.rule,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  color?: string;
  style?: ViewStyle;
}) => <View style={[{ width, height, backgroundColor: color, borderRadius: height > 2 ? 2 : 0 }, style]} />;

/** A row of lines to write on, sharing the width as `flexes` says. */
const Rules = ({ flexes, gap = 8, top = 11 }: { flexes: number[]; gap?: number; top?: number }) => (
  <View style={{ flexDirection: "row", gap, marginTop: top }}>
    {flexes.map((flex, index) => (
      <View key={index} style={{ flex, height: 1, backgroundColor: PAPER.rule }} />
    ))}
  </View>
);

/** Ruled rows under a shaded header, with lines down at `columns` (shares of the width). */
const Table = ({
  rows,
  rowHeight,
  columns = [],
  top = 6,
}: {
  rows: number;
  rowHeight: number;
  columns?: number[];
  top?: number;
}) => (
  <View style={[styles.table, { marginTop: top }]}>
    <View style={styles.tableHead} />
    {Array.from({ length: rows }, (_, index) => (
      <View
        key={index}
        style={{
          height: rowHeight,
          borderBottomWidth: index < rows - 1 ? 1 : 0,
          borderBottomColor: PAPER.faint,
        }}
      />
    ))}
    {columns.map((share) => (
      <View key={share} style={[styles.columnLine, { left: `${share * 100}%` }]} />
    ))}
  </View>
);

const Header = () => (
  <View style={styles.header}>
    <View>
      <Bar width={72} height={8} color={PAPER.ink} />
      <Bar width={100} height={3} color={PAPER.faint} style={{ marginTop: 5 }} />
    </View>
    <View style={{ width: 70 }}>
      <Bar />
      <Bar style={{ marginTop: 8 }} />
    </View>
  </View>
);

const RentCardBody = () => (
  <>
    <Bar width={30} height={4} color={PAPER.ink} style={{ marginTop: 9 }} />
    <Rules flexes={[1.6, 1]} top={9} />
    <Rules flexes={[1]} />
    <Rules flexes={[1, 1]} />
    <Rules flexes={[1, 1, 1]} />
    <Rules flexes={[1, 1, 1, 1]} gap={6} />
    <Bar width={40} height={4} color={PAPER.ink} style={{ marginTop: 12 }} />
    <Table rows={12} rowHeight={12} columns={[0.14, 0.28, 0.43, 0.57, 0.75, 0.87]} />
    <Rules flexes={[1, 1]} gap={20} top={16} />
  </>
);

const ReceiptsBody = () => (
  <>
    <View style={[styles.header, { borderBottomWidth: 0, paddingBottom: 2 }]}>
      <Bar width={64} height={6} color={PAPER.ink} />
      <Bar width={80} height={3} color={PAPER.faint} />
    </View>
    {[0, 1, 2].map((index) => (
      <View key={index}>
        {index > 0 && <Bar color={PAPER.faint} style={{ marginVertical: 5 }} />}
        <View style={styles.receipt}>
          <View style={styles.receiptOffice}>
            {[0, 1, 2, 3, 4].map((line) => (
              <Bar key={line} style={{ marginTop: line === 0 ? 10 : 11 }} />
            ))}
          </View>
          <View style={styles.receiptMain}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <Bar width={36} height={5} color={PAPER.ink} />
              <Bar width={60} />
            </View>
            <Rules flexes={[1]} top={9} />
            <Rules flexes={[1]} top={9} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 }}>
              <View style={styles.receiptAmount} />
              <Bar width={60} height={3} color={PAPER.faint} />
            </View>
            <Rules flexes={[1.6, 1]} top={9} />
            <Rules flexes={[1]} top={12} />
          </View>
        </View>
      </View>
    ))}
  </>
);

const RegisterBody = ({ rows }: { rows: number }) => (
  <>
    <Bar width={180} height={3} color={PAPER.faint} style={{ marginTop: 8 }} />
    <Table
      rows={rows}
      rowHeight={rows > 20 ? 11 : 12}
      columns={[0.06, 0.29, 0.43, 0.5, 0.62, 0.75, 0.9]}
      top={8}
    />
  </>
);

const HandoverBody = () => (
  <>
    <Rules flexes={[1, 1]} top={13} />
    <Rules flexes={[1.6, 1]} />
    <Table rows={11} rowHeight={11} columns={[0.58, 0.79]} top={10} />
    <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
      <View style={styles.marksBox} />
      <View style={{ flex: 1, justifyContent: "flex-end", gap: 14 }}>
        {[0, 1, 2, 3].map((line) => (
          <Bar key={line} color={PAPER.ink} />
        ))}
      </View>
    </View>
  </>
);

const PREVIEW_BODY: Record<PaperFormId, () => React.ReactElement> = {
  rent_card: () => (
    <>
      <Header />
      <RentCardBody />
    </>
  ),
  receipts: () => <ReceiptsBody />,
  piano_register: () => (
    <>
      <Header />
      <RegisterBody rows={22} />
    </>
  ),
  rental_register: () => (
    <>
      <Header />
      <RegisterBody rows={20} />
    </>
  ),
  handover: () => (
    <>
      <Header />
      <HandoverBody />
    </>
  ),
};

/** The large drawing of a form, an A4 page 250 wide, at the top of its screen. */
export const FormPreview = ({ id, testID }: { id: PaperFormId; testID?: string }) => {
  const Body = PREVIEW_BODY[id];
  return (
    <View style={styles.large} testID={testID} {...hidden}>
      <Body />
    </View>
  );
};

/** The letterhead's colour on the agreement's drawing: the business's own name at the top */
const LETTERHEAD = { name: "#A85D00", line: "#D9B98A" } as const;

/** The two pages of a rental agreement, side by side (PaperAgreement board). */
export const AgreementPreview = ({ kind, testID }: { kind: AgreementKind; testID?: string }) => (
  <View style={styles.agreement} testID={testID} {...hidden}>
    <View style={styles.agreementPage}>
      <Bar width={70} height={6} color={LETTERHEAD.name} />
      <Bar width={90} height={2} color={LETTERHEAD.line} style={{ marginTop: 4 }} />
      <Bar color={PAPER.ink} style={{ marginTop: 6 }} />
      <Bar width={70} height={4} color={PAPER.ink} style={{ marginTop: 8, alignSelf: "center" }} />
      <Bar style={{ marginTop: 8 }} />
      <Bar style={{ marginTop: 6 }} />
      <Bar width="70%" style={{ marginTop: 6 }} />
      <View style={[styles.agreementTable, { height: kind === "private" ? 28 : 24 }]} />
      {(["100%", "100%", "100%", "80%", "100%", "60%", "100%"] as const).map((width, line) => (
        <Bar key={line} width={width} height={2} color={PAPER.light} style={{ marginTop: line === 0 ? 8 : 4 }} />
      ))}
    </View>
    <View style={styles.agreementPage}>
      <Bar width={80} height={2} color={PAPER.light} />
      {(["100%", "100%", "85%", "100%", "70%", "100%"] as const).map((width, line) => (
        <Bar key={line} width={width} height={2} color={PAPER.light} style={{ marginTop: line === 0 ? 10 : 4 }} />
      ))}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        {[0, 1].map((side) => (
          <View key={side} style={{ flex: 1 }}>
            <Bar />
            <Bar style={{ marginTop: 8 }} />
            <Bar style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <View style={styles.agreementStamp} />
        {kind === "hotel" ? <View style={styles.agreementStamp} /> : <View style={{ flex: 1 }} />}
      </View>
      <Bar style={{ marginTop: 14 }} />
      <Bar style={{ marginTop: 8 }} />
    </View>
  </View>
);

/** Three pages fanned out, on the full kit's card. */
export const KitThumbnail = () => (
  <View style={styles.kit} {...hidden}>
    <View style={[styles.small, styles.kitPage, styles.kitBack]} />
    <View style={[styles.small, styles.kitPage, styles.kitMiddle]} />
    <View style={[styles.small, styles.kitPage, styles.kitFront]}>
      <Bar width={20} height={3} color={PAPER.ink} />
      <Bar height={2} color={PAPER.light} style={{ marginTop: 5 }} />
      <Bar width="70%" height={2} color={PAPER.light} style={{ marginTop: 3 }} />
      <View style={styles.kitBox} />
    </View>
  </View>
);

/** The small drawing of a form in the list: a page with a table, receipts or lines. */
const FormThumbnail = ({ kind, testID }: { kind: FormThumbnailKind; testID?: string }) => (
  <View style={styles.small} testID={testID} {...hidden}>
    <Bar width={20} height={3} color={PAPER.ink} />
    {kind === "table" && (
      <View style={styles.smallTable}>
        {[0, 1, 2, 3, 4].map((line) => (
          <View key={line} style={styles.smallTableLine} />
        ))}
      </View>
    )}
    {kind === "receipt" &&
      [0, 1, 2].map((box) => (
        <View key={box} style={[styles.smallReceipt, { marginTop: box === 0 ? 5 : 2 }]} />
      ))}
    {kind === "lines" &&
      (["100%", "100%", "80%", "100%", "60%", "100%"] as const).map((width, line) => (
        <Bar key={line} width={width} height={2} color={PAPER.light} style={{ marginTop: line === 0 ? 6 : 4 }} />
      ))}
  </View>
);

const styles = StyleSheet.create({
  small: {
    width: 44,
    height: 62,
    flexShrink: 0,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PAPER.edge,
    backgroundColor: PAPER.page,
    paddingVertical: 6,
    paddingHorizontal: 5,
  },
  smallTable: {
    marginTop: 6,
    height: 38,
    borderWidth: 1,
    borderColor: PAPER.light,
    justifyContent: "space-evenly",
  },
  smallTableLine: { height: 1, backgroundColor: PAPER.light },
  smallReceipt: { height: 12, borderWidth: 1, borderColor: PAPER.light },
  agreement: { flexDirection: "row", justifyContent: "center", gap: 12 },
  agreementPage: {
    width: 150,
    height: 212,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PAPER.edgeLarge,
    backgroundColor: PAPER.page,
    paddingVertical: 10,
    paddingHorizontal: 9,
    overflow: "hidden",
  },
  agreementTable: { marginTop: 8, borderWidth: 1, borderColor: PAPER.faint },
  agreementStamp: { flex: 1, height: 30, borderWidth: 1, borderStyle: "dashed", borderColor: PAPER.faint },
  kit: { width: 76, height: 72 },
  kitPage: { position: "absolute" },
  kitBack: { left: 24, top: 0, transform: [{ rotate: "8deg" }] },
  kitMiddle: { left: 12, top: 4, transform: [{ rotate: "-4deg" }] },
  kitFront: { left: 4, top: 8 },
  kitBox: { height: 22, marginTop: 5, borderWidth: 1, borderColor: PAPER.light, borderRadius: 1 },
  large: {
    width: 250,
    height: 354,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PAPER.edgeLarge,
    backgroundColor: PAPER.page,
    paddingVertical: 16,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: PAPER.ink,
  },
  table: { borderWidth: 1, borderColor: PAPER.rule, overflow: "hidden" },
  tableHead: {
    height: 10,
    backgroundColor: PAPER.band,
    borderBottomWidth: 1,
    borderBottomColor: PAPER.rule,
  },
  columnLine: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: PAPER.faint },
  receipt: {
    flexDirection: "row",
    height: 92,
    borderWidth: 1,
    borderColor: PAPER.rule,
    borderRadius: 3,
    overflow: "hidden",
  },
  receiptOffice: {
    width: 52,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: PAPER.faint,
  },
  receiptMain: { flex: 1, paddingTop: 8, paddingHorizontal: 8 },
  receiptAmount: { width: 40, height: 12, borderWidth: 1, borderColor: PAPER.ink, borderRadius: 2 },
  marksBox: { width: 108, height: 72, borderWidth: 1, borderColor: PAPER.rule, borderRadius: 3 },
});

export default React.memo(FormThumbnail);
