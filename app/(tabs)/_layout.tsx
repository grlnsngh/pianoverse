import React, { useEffect } from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { TabBar, TabScenes } from "@/components/ui";
import type { TabBarItem } from "@/components/ui";
import { colors } from "@/constants/theme";
import { PianoDataProvider } from "@/lib/PianoDataContext";
import { setActiveTab, TabKey } from "@/redux/navigation/actions";
import { INITIAL_TAB } from "@/redux/navigation/reducer";
import { RootState } from "@/redux/store";
import Home from "./home";
import Profile from "./profile";
import Today from "./today";

const TABS: readonly TabBarItem<TabKey>[] = [
  { key: "today", label: "Today", icon: "tabToday" },
  { key: "pianos", label: "Pianos", icon: "tabPianos" },
  { key: "account", label: "Account", icon: "tabAccount" },
];

// Home.tsx is the Pianos tab, and profile.tsx the Account tab
const SCENES: Record<TabKey, React.ComponentType> = {
  today: Today,
  pianos: Home,
  account: Profile,
};

// The tabs made at the start: the one that loads the pianos for the others
const LOADS_DATA: readonly TabKey[] = ["pianos"];

const TabsLayout = () => {
  const dispatch = useDispatch();
  // Kept in the store so other screens can switch tabs instead of pushing
  // another copy of the tabs
  const activeTab = useSelector(
    (state: RootState) => state.navigation.activeTab,
  );
  // While choosing pianos to delete, the Delete bar takes the tab bar's place
  const choosingPianos = useSelector(
    (state: RootState) => state.pianos.isBulkSelectionMode,
  );

  // Start on the first tab after signing in or opening the app
  useEffect(() => {
    dispatch(setActiveTab(INITIAL_TAB) as any);
  }, []);

  return (
    <PianoDataProvider>
      <View style={{ flex: 1, backgroundColor: colors.page }}>
        {/* The Pianos screen loads the pianos that Today reads, so it is made
            at the start even though the app opens on Today */}
        <TabScenes scenes={SCENES} active={activeTab} eager={LOADS_DATA} />
        {!choosingPianos && (
          <TabBar
            tabs={TABS}
            active={activeTab}
            onSelect={(tab) => dispatch(setActiveTab(tab) as any)}
          />
        )}
      </View>
    </PianoDataProvider>
  );
};

export default TabsLayout;
