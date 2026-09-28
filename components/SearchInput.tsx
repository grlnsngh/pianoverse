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
    // NativeWind v2 ignores focus: classes on a View, so track focus here
    const [isFocused, setIsFocused] = useState(false);

    const handleSearch = useCallback(() => {
      const trimmed = query.trim();
      if (trimmed === "")
        return Alert.alert(
          "Missing Query",
          "Please input something to search results across database"
        );

      if (pathname.startsWith("/search")) router.setParams({ query: trimmed });
      // Let the router encode the query, so "/", "#", "%" and "?" survive
      else
        router.push({
          pathname: "/search/[query]",
          params: { query: trimmed },
        });
    }, [query, pathname]);

    const handleTextChange = useCallback((e: string) => {
      setQuery(e);
    }, []);

    return (
      <View
        style={{ height: 60 }}
        className={`flex flex-row items-center space-x-4 w-full h-16 px-4 bg-black-100 rounded-2xl border-2 ${
          isFocused ? "border-secondary" : "border-black-200"
        }`}
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          // Search from the keyboard too
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
      </View>
    );
  }
);

export default SearchInput;
