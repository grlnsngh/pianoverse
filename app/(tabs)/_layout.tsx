import { SECONDARY_COLOR } from "@/constants/colors";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { TabView, SceneMap } from "react-native-tab-view";
import { useDispatch, useSelector } from "react-redux";
import { setActiveTab, TabKey } from "@/redux/navigation/actions";
import { RootState } from "@/redux/store";
import { icons } from "../../constants";
import Home from "./home";
import Create from "./create";
import Profile from "./profile";

const TabIcon = ({
  icon,
  color,
  name,
  focused,
}: {
  icon: any;
  color: string;
  name: string;
  focused: boolean;
}) => {
  return (
    <View className="flex items-center justify-center gap-2">
      <Image
        source={icon}
        resizeMode="contain"
        tintColor={color}
        className="w-6 h-6"
      />
      <Text
        className={`${focused ? "font-psemibold" : "font-pregular"} text-xs`}
        style={{ color: color }}
      >
        {name}
      </Text>
    </View>
  );
};

const TabsLayout = () => {
  const dispatch = useDispatch();
  const [routes] = useState<{ key: TabKey; title: string }[]>([
    { key: "home", title: "Home" },
    { key: "create", title: "Create" },
    { key: "profile", title: "Profile" },
  ]);
  // Kept in the store so other screens can switch tabs instead of pushing
  // another copy of the tabs
  const activeTab = useSelector(
    (state: RootState) => state.navigation.activeTab
  );
  const index = Math.max(
    routes.findIndex((route) => route.key === activeTab),
    0
  );
  const setIndex = (i: number) => dispatch(setActiveTab(routes[i].key) as any);

  // Start on Home after signing in or opening the app
  useEffect(() => {
    dispatch(setActiveTab("home") as any);
  }, []);

  const renderScene = SceneMap({
    home: Home,
    create: Create,
    profile: Profile,
  });

  const renderTabBar = (props: any) => (
    <View className="flex-row bg-primary-100 border-t border-primary-200 h-20">
      {props.navigationState.routes.map((route: any, i: number) => {
        const isActive = index === i;
        const icon =
          i === 0 ? icons.home : i === 1 ? icons.plus : icons.profile;
        const label = route.title;

        return (
          <TouchableOpacity
            key={route.key}
            className="flex-1 items-center justify-center"
            onPress={() => setIndex(i)}
          >
            <TabIcon
              icon={icon}
              color={isActive ? SECONDARY_COLOR : "#CDCDE0"}
              name={label}
              focused={isActive}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      onIndexChange={setIndex}
      swipeEnabled={true}
      tabBarPosition="bottom"
    />
  );
};

export default TabsLayout;
