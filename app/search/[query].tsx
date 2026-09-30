import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { searchPianoItems } from "@/utils/ObjectManipulation";
import { padToFullRows } from "@/utils/grid";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import EmptyState from "@/components/EmptyState";
import CardItem from "@/components/CardItem";
import { SECONDARY_COLOR } from "@/constants/colors";
import ListItem from "@/components/ListItem";
import SearchInput from "@/components/SearchInput";

const Search = () => {
  const { query } = useLocalSearchParams();
  const searchQuery = (Array.isArray(query) ? query[0] : query) ?? "";
  const navigation = useNavigation();
  const pianoItems = useSelector((state: RootState) => state.pianos.items);
  const [items, setItems] = useState<PianoItem[]>([]);

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: SECONDARY_COLOR,
      },
      headerTintColor: "#161622",
      title: `Search results for ${searchQuery}`,
    });
    const searchResults = searchPianoItems(pianoItems, searchQuery);
    setItems(searchResults);
  }, [searchQuery, pianoItems]);

  const [visibleMenuId, setVisibleMenuId] = useState<string | null>(null);

  const openMenu = (menuId: string) => setVisibleMenuId(menuId);
  const closeMenu = () => setVisibleMenuId(null);

  const layoutView = useSelector(
    (state: RootState) => state.pianos.filters.layoutStatus
  );
  const isGrid = layoutView.grid === "checked";

  const emptyState = () => (
    <EmptyState title="No Pianos Found" subtitle="Try other search terms" />
  );

  return (
    <SafeAreaView className="bg-primary h-full">
      {/* Search again without going back */}
      <View className="px-4 pt-4 pb-2">
        <SearchInput initialQuery={searchQuery} autoFocus={searchQuery === ""} />
      </View>

      {isGrid ? (
        // The same cards as Home's grid
        <FlatList
          key="grid"
          data={padToFullRows(items, 2)}
          keyExtractor={(item) => item.$id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 12 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 20, paddingTop: 8 }}
          renderItem={({ item, index }) =>
            item.empty ? (
              <View style={{ flex: 1, margin: 4 }} />
            ) : (
              <CardItem
                item={item}
                index={index}
                visibleMenuId={visibleMenuId}
                openMenu={openMenu}
                closeMenu={closeMenu}
                isGridView
              />
            )
          }
          ListEmptyComponent={emptyState}
        />
      ) : (
        <FlatList
          key="list"
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
          ListEmptyComponent={emptyState}
        />
      )}
    </SafeAreaView>
  );
};

export default Search;
