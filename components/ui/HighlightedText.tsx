import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";
import { splitMatches } from "@/utils/highlight";

export type HighlightedTextProps = {
  text: string;
  /** What was searched for. Without it the text is drawn as it is. */
  term?: string;
  /** How the letters that match look, on top of the surrounding text's style */
  matchStyle: StyleProp<TextStyle>;
};

/**
 * Text with the letters that match a search made bold. Put it inside a
 * `<Text>`: it hands back plain strings and nested `<Text>` pieces, so the
 * line keeps its own style, its ellipsis and its one line.
 */
const HighlightedText = ({ text, term, matchStyle }: HighlightedTextProps) => {
  const parts = term ? splitMatches(text, term) : null;
  if (!parts || (parts.length === 1 && !parts[0].match)) return <>{text}</>;

  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <Text key={index} style={matchStyle}>
            {part.text}
          </Text>
        ) : (
          part.text
        )
      )}
    </>
  );
};

export default HighlightedText;
