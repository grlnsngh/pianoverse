import { DefaultTheme } from "@react-navigation/native";
import { darkColors, lightColors } from "@/constants/theme";
import { navigationThemeFor } from "@/utils/navigationTheme";

describe("the navigation's theme", () => {
  it("is the library's own in light, exactly as the app has always had it", () => {
    expect(navigationThemeFor("light", lightColors)).toBe(DefaultTheme);
  });

  it("is dark in dark, with the app's colours behind every screen that slides in", () => {
    const theme = navigationThemeFor("dark", darkColors);

    expect(theme.dark).toBe(true);
    expect(theme.colors).toMatchObject({
      background: darkColors.page,
      card: darkColors.page,
      text: darkColors.ink,
      border: darkColors.hairline,
      primary: darkColors.brand,
      notification: darkColors.late,
    });
    expect(theme.colors.background).not.toBe(DefaultTheme.colors.background);
  });
});
