import React from "react";
import { Platform } from "react-native";
import { act, create } from "react-test-renderer";
import PaperPreview from "@/components/PaperPreview";

/**
 * A page preview is paper, so it doesn't follow the phone's Font size
 * (docs/large-text/PLAN.md, F29). Android's web view enlarges text by the font
 * scale unless told not to, and the preview would stop matching the PDF.
 */
describe("the page preview", () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, "OS", "android");
  });

  it("draws the page with the web view's text zoom at 100", () => {
    let tree: ReturnType<typeof create>;
    act(() => {
      tree = create(<PaperPreview html="<p>page</p>" width={250} accessibilityLabel="A page" />);
    });

    const webView = tree!.root.find((node) => typeof node.type === "string" && node.props.testID === "webview");
    expect(webView.props.textZoom).toBe(100);
  });
});
