import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { formatDate, printCategoryLabel } from "@/utils/ObjectManipulation";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { PIANO_CATEGORY } from "../constants/Piano";

const RentableDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="space-y-6">
    <Text className="text-lg text-white">
      Customer Name: {piano.rental_customer_name}
    </Text>
    <Text className="text-lg text-white">
      Customer Address: {piano.rental_customer_address}
    </Text>
    <Text className="text-lg text-white">
      Customer Mobile: {piano.rental_customer_mobile}
    </Text>
    <Text className="text-lg text-white">
      Rental Period Start: {formatDate(piano.rental_period_start)}
    </Text>
    <Text className="text-lg text-white">
      Rental Period End: {formatDate(piano.rental_period_end)}
    </Text>
    <Text className="text-lg text-white">
      Rental Price: {piano.rental_price}
    </Text>
  </View>
);

const WarehouseDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="space-y-6">
    <Text className="text-lg text-white">
      Warehouse Since Date: {formatDate(piano.warehouse_since_date)}
    </Text>
  </View>
);

const EventDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="space-y-6">
    <Text className="text-lg text-white">
      Event Purchase Price: {piano.event_purchase_price}
    </Text>
    <Text className="text-lg text-white">
      Event Purchase From: {piano.event_purchase_from}
    </Text>
    <Text className="text-lg text-white">
      Event Model Number: {piano.event_model_number}
    </Text>
    <Text className="text-lg text-white">
      Event B Number: {piano.event_b_number}
    </Text>
    <Text className="text-lg text-white">
      Event Company Associated: {piano.event_company_associated}
    </Text>
  </View>
);

const OnSaleDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="space-y-6">
    <Text className="text-lg text-white">
      On Sale Purchase From: {piano.on_sale_purchase_from}
    </Text>
    <Text className="text-lg text-white">
      On Sale Import Date: {formatDate(piano.on_sale_import_date)}
    </Text>
    <Text className="text-lg text-white">
      On Sale Price: {piano.on_sale_price}
    </Text>
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

  const { title, image_url, category, make, description } = filteredPiano;

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: `${title}` });
  }, [id]);

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex min-h-[90vh] px-4 space-y-6 pb-16">
          <Image
            source={{ uri: image_url }}
            className="w-max h-64 rounded-xl"
            resizeMode="cover"
          />

          <Text className="text-lg text-white">
            Category: {printCategoryLabel(category)}
          </Text>
          <Text className="text-lg text-white">Make: {make}</Text>
          {description && (
            <Text className="text-lg text-white">
              Description: {description}
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
