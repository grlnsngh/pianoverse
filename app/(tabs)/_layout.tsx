import { SECONDARY_COLOR } from "@/constants/colors";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { TabView, SceneMap } from "react-native-tab-view";
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
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "home", title: "Home" },
    { key: "create", title: "Create" },
    { key: "profile", title: "Profile" },
  ]);

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
