import React, { useEffect } from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { TabBar, TabScenes } from "@/components/ui";
import type { TabBarItem } from "@/components/ui";
import { colors } from "@/constants/theme";
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

const TabsLayout = () => {
  const dispatch = useDispatch();
  // Kept in the store so other screens can switch tabs instead of pushing
  // another copy of the tabs
  const activeTab = useSelector(
    (state: RootState) => state.navigation.activeTab
  );

  // Start on the first tab after signing in or opening the app
  useEffect(() => {
    dispatch(setActiveTab(INITIAL_TAB) as any);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <TabScenes scenes={SCENES} active={activeTab} />
      <TabBar
        tabs={TABS}
        active={activeTab}
        onSelect={(tab) => dispatch(setActiveTab(tab) as any)}
      />
    </View>
  );
};

export default TabsLayout;
