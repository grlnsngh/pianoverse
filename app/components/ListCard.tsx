import React, { useState } from "react";
import { icons } from "@/constants";
import PropTypes from "prop-types";
import {
  Image,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Menu,
  Divider,
  PaperProvider,
  IconButton,
} from "react-native-paper";

const ListCard = ({ item, visibleMenuId, openMenu, closeMenu }) => {
  const { title = "", image_url = "", users = {} } = item;
  const { username = "", avatar = "" } = users;

  // const [visible, setVisible] = useState(false);

  // const openMenu = () => setVisible(true);
  // const closeMenu = () => setVisible(false);

  const handleOnClickItem = () => {
    ToastAndroid.show(`Item clicked: ${title}`, ToastAndroid.SHORT);
  };

  return (
    <PaperProvider>
      <View className="flex-col items-center px-4 mb-14">
        <View className="flex-row gap-3 items-start">
          <View className="justify-center items-center flex-row flex-1">
            <View
              className="w-[46px] h-[46px] rounded-lg 
           justify-center items-center p-0.5"
            >
              <Image
                source={{ uri: avatar }}
                className="w-full h-full rounded-lg"
                resizeMode="cover"
              />
            </View>
            <View className="justify-center flex-1 ml-3 gap-y-1">
              <Text
                className="text-white font-psemibold text-sm"
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                className="text-xs text-gray-100 font-pregular"
                numberOfLines={1}
              >
                {username}
              </Text>
            </View>
          </View>
          <View className="pt-2">
            <View style={styles.container}>
              <Menu
                style={styles.menu}
                visible={visibleMenuId === item.$id}
                onDismiss={closeMenu}
                anchor={
                  <TouchableOpacity onPress={() => openMenu(item.$id)}>
                    <Image
                      source={icons.menu}
                      style={styles.menuIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={() => {
                    console.log("Edit");
                    closeMenu();
                  }}
                  title="Edit"
                  leadingIcon={() => {
                    return (
                      <IconButton
                        icon={icons.pencil}
                        size={15}
                        style={styles.menuItemIcon}
                      />
                    );
                  }}
                />
                <Menu.Item
                  onPress={() => {
                    console.log("Delete");
                    closeMenu();
                  }}
                  title="Delete"
                  leadingIcon={() => {
                    return (
                      <IconButton
                        icon={icons.trash}
                        size={15}
                        style={styles.menuItemIcon}
                      />
                    );
                  }}
                />
              </Menu>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOnClickItem}
          className="w-full h-60 rounded-xl mt-3 relative 
        justify-center items-center"
        >
          <Image
            source={{ uri: image_url }}
            className="w-full h-full rounded-xl mt-3"
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    </PaperProvider>
  );
};

ListCard.propTypes = {
  item: PropTypes.shape({
    title: PropTypes.string.isRequired,
    image_url: PropTypes.string.isRequired,
    users: PropTypes.shape({
      username: PropTypes.string.isRequired,
      avatar: PropTypes.string.isRequired,
    }),
  }).isRequired,
};

export default ListCard;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  menuIcon: {
    width: 20,
    height: 20,
  },
  menu: { top: 0, right: 20, width: 120 },
  menuItemIcon: { paddingEnd: 10 },
});
