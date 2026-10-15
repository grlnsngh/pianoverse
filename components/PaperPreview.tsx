import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { Spinner } from "@/components/ui";
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/utils/paperForms/html";

export type PaperPreviewProps = {
  /** The page as a whole HTML document (previewDocument), or null while it is being made */
  html: string | null;
  /** Width on screen; the height follows the A4 page */
  width: number;
  /** Show only the top of the page, this many page px (a letterhead's top), instead of all of it */
  visibleHeight?: number;
  /** Drawn over the page: a guide, such as where the writing may go */
  overlay?: React.ReactNode;
  /** What the page shows, for a screen reader */
  accessibilityLabel: string;
  testID?: string;
};

/** The paper drawn on any theme: a page is white. */
const PAPER = "#FFFFFF";
const EDGE = "#D9D5CC";

/**
 * The real page a PDF will print (canvas page "Letterhead"): the same HTML
 * as the PDF, drawn by the phone's web view and scaled to fit. It can't be
 * touched or scrolled; the screen around it is how it changes.
 */
const PaperPreview = ({ html, width, visibleHeight = PAGE_HEIGHT, overlay, accessibilityLabel, testID }: PaperPreviewProps) => {
  const height = Math.round((visibleHeight * width) / PAGE_WIDTH);
  const pageHeight = Math.round((PAGE_HEIGHT * width) / PAGE_WIDTH);
  return (
    <View
      style={[styles.frame, { width: width + 2, height: height + 2 }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <View pointerEvents="none" style={{ width, height, overflow: "hidden" }}>
        {html === null ? (
          <View style={styles.loading}>
            <Spinner size={24} decorative />
          </View>
        ) : Platform.OS === "web" ? (
          React.createElement("iframe", {
            srcDoc: html,
            title: accessibilityLabel,
            style: { width, height: pageHeight, border: 0, display: "block" },
          })
        ) : (
          <WebView
            source={{ html }}
            originWhitelist={["*"]}
            scrollEnabled={false}
            javaScriptEnabled={false}
            // Paper keeps its size: don't follow the phone's Font size (Android)
            textZoom={100}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            importantForAccessibility="no-hide-descendants"
            style={{ width, height: pageHeight, backgroundColor: PAPER }}
          />
        )}
      </View>
      {overlay ? <View pointerEvents="none" style={StyleSheet.absoluteFill}>{overlay}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderColor: EDGE,
    borderRadius: 4,
    backgroundColor: PAPER,
    overflow: "hidden",
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default React.memo(PaperPreview);
