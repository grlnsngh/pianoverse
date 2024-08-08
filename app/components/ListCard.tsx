import { icons } from "@/constants";
import { deletePianoEntry } from "@/lib/appwrite";
import { router, usePathname } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Menu, PaperProvider } from "react-native-paper";

interface ListCardProps {
  item: {
    $id: string;
    title?: string;
    image_url?: string;
    users?: {
      username?: string;
      avatar?: string;
    };
  };
  visibleMenuId: string | null;
  openMenu: (id: string) => void;
  closeMenu: () => void;
}

const ListCard: React.FC<ListCardProps> = ({
  item,
  visibleMenuId,
  openMenu,
  closeMenu,
}) => {
  const { title = "", image_url = "", users = {} } = item;
  const { username = "", avatar = "" } = users;
  const pathname = usePathname();

  const handleOnClickItem = () => {
    if (pathname.startsWith("/detail")) router.setParams({ id: item.$id });
    else router.push(`/detail/${item.$id}`);
  };

  const handleOnClickCloseMenu = async () => {
    try {
      await deletePianoEntry(item.$id);
      ToastAndroid.show(`Deleted ${title} successfully`, ToastAndroid.SHORT);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(
          "Error",
          `Error deleting piano entry: ${title} - ${error.message}`
        );
      } else {
        Alert.alert("Error", "An unknown error occurred");
      }
    } finally {
      closeMenu();
    }
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
                    ToastAndroid.show(`Edit: ${title}`, ToastAndroid.SHORT);
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
                  onPress={handleOnClickCloseMenu}
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
