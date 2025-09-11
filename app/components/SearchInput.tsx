/* eslint-disable react/react-in-jsx-scope */
import { icons } from "@/constants";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import React, { useState, useCallback } from "react";
import { Alert, TextInput, TouchableOpacity, View } from "react-native";

interface SearchInputProps {
  initialQuery?: string;
}

const SearchInput: React.FC<SearchInputProps> = React.memo(
  ({ initialQuery }) => {
    const pathname = usePathname();
    const [query, setQuery] = useState(initialQuery || "");

    const handleSearch = useCallback(() => {
      if (query === "")
        return Alert.alert(
          "Missing Query",
          "Please input something to search results across database"
        );

      if (pathname.startsWith("/search")) router.setParams({ query });
      else router.push(`/search/${query}`);
    }, [query, pathname]);

    const handleTextChange = useCallback((e: string) => {
      setQuery(e);
    }, []);

    return (
      <View
        style={{ height: 60 }}
        className="flex flex-row items-center space-x-4 w-full h-16 
      px-4 bg-black-100 rounded-2xl border-2 border-black-200 focus:border-secondary"
      >
        <TouchableOpacity onPress={handleSearch}>
          <Image
            source={icons.search}
            className="w-5 h-5"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <TextInput
          className="text-base mt-0.5 text-white flex-1 font-pregular"
          value={query}
          placeholder="Search"
          placeholderTextColor="#CDCDE0"
          onChangeText={handleTextChange}
        />
      </View>
    );
  }
);

export default SearchInput;
