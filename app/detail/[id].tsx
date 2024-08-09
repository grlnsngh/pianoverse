import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import {
  formatDate,
  formatDateString,
  printCategoryLabel,
} from "@/utils/ObjectManipulation";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { PIANO_CATEGORY } from "../constants/Piano";

const RentableDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="space-y-6 mt-6">
    {piano.rental_customer_name && (
      <Text className="text-base text-gray-100 font-pmedium">
        Customer Name:{" "}
        <Text className="text-white font-psemibold text-base">
          {piano.rental_customer_name}
        </Text>
      </Text>
    )}
    {piano.rental_customer_address && (
      <Text className="text-base text-gray-100 font-pmedium">
        Customer Address:{" "}
        <Text className="text-white font-psemibold text-base">
          {piano.rental_customer_address}
        </Text>
      </Text>
    )}
    {piano.rental_customer_mobile && (
      <Text className="text-base text-gray-100 font-pmedium">
        Customer Mobile:{" "}
        <Text className="text-white font-psemibold text-base">
          {piano.rental_customer_mobile}
        </Text>
      </Text>
    )}
    {piano.rental_period_start && (
      <Text className="text-base text-gray-100 font-pmedium">
        Rental Period Start:{" "}
        <Text className="text-white font-psemibold text-base">
          {formatDate(piano.rental_period_start)}
        </Text>
      </Text>
    )}
    {piano.rental_period_end && (
      <Text className="text-base text-gray-100 font-pmedium">
        Rental Period End:{" "}
        <Text className="text-white font-psemibold text-base">
          {formatDate(piano.rental_period_end)}
        </Text>
      </Text>
    )}
    {piano.rental_price && (
      <Text className="text-base text-gray-100 font-pmedium">
        Rental Price:{" "}
        <Text className="text-white font-psemibold text-base">
          {piano.rental_price}
        </Text>
      </Text>
    )}
  </View>
);

const WarehouseDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="space-y-6 mt-6">
    {piano.warehouse_since_date && (
      <Text className="text-base text-gray-100 font-pmedium">
        Warehouse Since Date:{" "}
        <Text className="text-white font-psemibold text-base">
          {formatDate(piano.warehouse_since_date)}
        </Text>
      </Text>
    )}
  </View>
);

const EventDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="space-y-6 mt-6">
    {piano.event_purchase_price && (
      <Text className="text-base text-gray-100 font-pmedium">
        Event Purchase Price:{" "}
        <Text className="text-white font-psemibold text-base">
          {piano.event_purchase_price}
        </Text>
      </Text>
    )}
    {piano.event_purchase_from && (
      <Text className="text-base text-gray-100 font-pmedium">
        Event Purchase From:{" "}
        <Text className="text-white font-psemibold text-base">
          {piano.event_purchase_from}
        </Text>
      </Text>
    )}
    {piano.event_model_number && (
      <Text className="text-base text-gray-100 font-pmedium">
        Event Model Number:{" "}
        <Text className="text-white font-psemibold text-base">
          {piano.event_model_number}
        </Text>
      </Text>
    )}
    {piano.event_b_number && (
      <Text className="text-base text-gray-100 font-pmedium">
        Event B Number:{" "}
        <Text className="text-white font-psemibold text-base">
          {piano.event_b_number}
        </Text>
      </Text>
    )}
  </View>
);

const OnSaleDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="space-y-6 mt-6">
    {piano.on_sale_purchase_from && (
      <Text className="text-base text-gray-100 font-pmedium">
        On Sale Purchase From:{" "}
        <Text className="text-white font-psemibold text-base">
          {piano.on_sale_purchase_from}
        </Text>
      </Text>
    )}
    {piano.on_sale_import_date && (
      <Text className="text-base text-gray-100 font-pmedium">
        On Sale Import Date:{" "}
        <Text className="text-white font-psemibold text-base">
          {formatDate(piano.on_sale_import_date)}
        </Text>
      </Text>
    )}
    {piano.on_sale_price && (
      <Text className="text-base text-gray-100 font-pmedium">
        On Sale Price:{" "}
        <Text className="text-white font-psemibold text-base">
          {piano.on_sale_price}
        </Text>
      </Text>
    )}
  </View>
);

const DetailScreen = () => {
  const { id } = useLocalSearchParams();
  const pianosList = useSelector((state: RootState) => state.pianos.items);

  const filteredPiano: PianoItem | undefined = pianosList.find(
    (piano) => piano.$id === id
  );

  if (!filteredPiano) {
    return (
      <SafeAreaView className="bg-primary h-full">
        <Text className="text-lg text-white">Piano not found</Text>
      </SafeAreaView>
    );
  }

  const { title, image_url, category, make, description, company_associated } =
    filteredPiano;

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: "#FFA001",
      },
      headerTintColor: "#161622",
      title: `${title}`,
    });
  }, [id]);

  const createdAtString = formatDateString(filteredPiano.$createdAt);
  const updatedAtString = formatDateString(filteredPiano.$updatedAt);

  const isUpdated = filteredPiano.$updatedAt !== filteredPiano.$createdAt;
  const dateLabel = isUpdated ? "Last Updated" : "Created on";
  const dateString = isUpdated ? updatedAtString : createdAtString;

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex min-h-[90vh] px-4 space-y-6 pb-16">
          <Image
            source={{ uri: image_url }}
            style={{ height: 300 }}
            className="w-max h-64 rounded-xl"
            resizeMode="cover"
          />

          <Text className="text-base text-gray-100 font-pmedium">
            {dateLabel}:{" "}
            <Text className="text-white font-psemibold text-base">
              {dateString}
            </Text>
          </Text>

          <Text className="text-base text-gray-100 font-pmedium">
            Category:{" "}
            <Text className="text-white font-psemibold text-base">
              {printCategoryLabel(category)}
            </Text>
          </Text>

          {company_associated && (
            <Text className="text-base text-gray-100 font-pmedium">
              Company Associated:{" "}
              <Text className="text-white font-psemibold text-base">
                {company_associated}
              </Text>
            </Text>
          )}

          <Text className="text-base text-gray-100 font-pmedium">
            Make:{" "}
            <Text className="text-white font-psemibold text-base">{make}</Text>
          </Text>
          {description && (
            <Text className="text-base text-gray-100 font-pmedium">
              Description:{" "}
              <Text className="text-white font-psemibold text-base">
                {description}
              </Text>
            </Text>
          )}
          {category === PIANO_CATEGORY.RENTABLE && (
            <RentableDetails piano={filteredPiano} />
          )}
          {category === PIANO_CATEGORY.WAREHOUSE && (
            <WarehouseDetails piano={filteredPiano} />
          )}
          {category === PIANO_CATEGORY.EVENTS && (
            <EventDetails piano={filteredPiano} />
          )}
          {category === PIANO_CATEGORY.ON_SALE && (
            <OnSaleDetails piano={filteredPiano} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DetailScreen;
