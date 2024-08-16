import { CATEGORY_COLORS } from "@/constants/colors";
import { deletePianoEntry } from "@/lib/appwrite";
import { getCategoryLabel } from "@/utils/ObjectManipulation";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import React from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface } from "react-native-paper";

interface GridItemProps {
  item: {
    $id: string;
    title?: string;
    image_url?: string;
    users?: {
      avatar?: string;
    };
    company_associated?: string;
  };
  visibleMenuId: string | null;
  openMenu: (id: string) => void;
  closeMenu: () => void;
}
const { width } = Dimensions.get("window");
const numColumns = 2;
const itemWidth = width / numColumns;

const GridItem: React.FC<GridItemProps> = ({
  item,
  visibleMenuId,
  openMenu,
  closeMenu,
}) => {
  const pathname = usePathname();

  const handleOnClickItem = (item) => {
    console.log("item", item);
    if (pathname.startsWith("/detail")) router.setParams({ id: item.$id });
    else router.push(`/detail/${item.$id}`);
  };

  const handleOnClickEditMenu = (item) => {
    if (pathname.startsWith("/edit")) router.setParams({ id: item.$id });
    else router.push(`/edit/${item.$id}`);
    closeMenu();
  };

  const handleOnClickDeleteMenu = async (item) => {
    const title = item.title;
    try {
      await deletePianoEntry(item);
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

  const renderItem = ({ item }) => {
    if (item.empty) {
      return <View style={[styles.item, styles.itemInvisible]} />;
    }
    const backgroundColor =
      CATEGORY_COLORS[item.category.toUpperCase()] || "#6b7280";

    return (
      <Surface elevation={5} style={styles.item} className="bg-primary-400">
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <TouchableOpacity
            style={{
              width: "100%",
              height: "70%",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
            activeOpacity={0.7}
            onPress={() => handleOnClickItem(item)}
          >
            <Image
              source={{ uri: item.image_url }}
              style={{
                width: "100%",
                height: "100%",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <View
            style={{
              width: "100%",
              height: "30%",
              alignItems: "center",
              backgroundColor: backgroundColor,
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
              display: "flex",
              flexDirection: "row",
              gap: 5,
              paddingHorizontal: 12,
            }}
          >
            <View className="justify-center flex-1">
              <Text className=" font-psemibold text-sm" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="text-xs font-pregular" numberOfLines={1}>
                {getCategoryLabel(item.category)}
              </Text>
              {item.company_associated && (
                <Text className="text-xs font-pregular" numberOfLines={1}>
                  {item.company_associated}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Surface>
    );
  };

  const formatData = (data, numColumns) => {
    const numberOfFullRows = Math.floor(data.length / numColumns);
    let numberOfElementsLastRow = data.length - numberOfFullRows * numColumns;
    while (
      numberOfElementsLastRow !== numColumns &&
      numberOfElementsLastRow !== 0
    ) {
      data.push({ title: `blank-${numberOfElementsLastRow}`, empty: true });
      numberOfElementsLastRow++;
    }
    return data;
  };

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <FlatList
        data={formatData(item, numColumns)}
        numColumns={2}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 12 }}
        contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
        renderItem={renderItem}
        keyExtractor={(item) => item.$id}
      />
    </View>
  );
};

export default GridItem;

const styles = StyleSheet.create({
  item: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    height: itemWidth,
    borderRadius: 20,
  },
  itemInvisible: {
    backgroundColor: "transparent",
  },
});
