import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { searchPianoItems } from "@/utils/ObjectManipulation";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import EmptyState from "../components/EmptyState";
import CardItem from "../components/CardItem";
import { SECONDARY_COLOR } from "@/constants/colors";
import ListItem from "../components/ListItem";
import GridItem from "../components/GridItem";

const Search = () => {
  const { query } = useLocalSearchParams();
  const navigation = useNavigation();
  const pianoItems = useSelector((state: RootState) => state.pianos.items);
  const [items, setItems] = useState<PianoItem[]>([]);

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: SECONDARY_COLOR,
      },
      headerTintColor: "#161622",
      title: `Search results for ${query}`,
    });
    const searchResults = searchPianoItems(pianoItems, query[0]);
    setItems(searchResults);
  }, [query]);

  const [visibleMenuId, setVisibleMenuId] = useState<string | null>(null);

  const openMenu = (menuId: string) => setVisibleMenuId(menuId);
  const closeMenu = () => setVisibleMenuId(null);

  const layoutView = useSelector(
    (state: RootState) => state.pianos.filters.layoutStatus
  );

  return (
    <SafeAreaView className="bg-primary h-full">
      {layoutView.grid === "checked" ? (
        <GridItem
          item={items}
          visibleMenuId={visibleMenuId}
          openMenu={openMenu}
          closeMenu={closeMenu}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => {
            if (layoutView.card === "checked") {
              return (
                <CardItem
                  item={item}
                  visibleMenuId={visibleMenuId}
                  openMenu={openMenu}
                  closeMenu={closeMenu}
                />
              );
            } else if (layoutView.list === "checked") {
              return (
                <ListItem
                  item={item}
                  visibleMenuId={visibleMenuId}
                  openMenu={openMenu}
                  closeMenu={closeMenu}
                />
              );
            } else {
              return null; // Render nothing if no view is checked
            }
          }}
          ListEmptyComponent={() => (
            <EmptyState
              title="No Pianos Found"
              subtitle="Try other search terms"
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default Search;
