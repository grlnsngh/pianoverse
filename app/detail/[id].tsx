import { SECONDARY_COLOR } from "@/constants/colors";
import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import {
  formatDate,
  formatDateString,
  printCategoryLabel,
} from "@/utils/ObjectManipulation";
import {
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
  format,
} from "date-fns";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import React, { useEffect } from "react";
import { ScrollView, Text, View, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { PIANO_CATEGORY } from "../constants/Piano";
import CustomButton from "../components/CustomButton";
import icons from "../../constants/icons";

const calculateDifference = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const days = differenceInDays(endDate, startDate);
  const weeks = differenceInWeeks(endDate, startDate);
  const months = differenceInMonths(endDate, startDate);
  const years = differenceInYears(endDate, startDate);

  return { days, weeks, months, years };
};

const formatRentalDate = (date: Date | string) => {
  if (date instanceof Date) {
    return format(date, "yyyy-MM-dd");
  }
  return date;
};

const calculateRemainingPeriod = (end: string) => {
  const endDate = new Date(end);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const days = differenceInDays(endDate, currentDate);
  const weeks = differenceInWeeks(endDate, currentDate);
  const months = differenceInMonths(endDate, currentDate);
  const years = differenceInYears(endDate, currentDate);

  return { days, weeks, months, years };
};

const isLessThanOrEqualTo7Days = (remaining: {
  years: number;
  months: number;
  weeks: number;
  days: number;
}) => {
  return (
    remaining.years === 0 &&
    remaining.months === 0 &&
    remaining.weeks === 0 &&
    remaining.days <= 7
  );
};

const pluralize = (value: number, unit: string) =>
  `${value} ${unit}${value > 1 ? "s" : ""}`;

const displayRemainingTime = (remaining: {
  years: number;
  months: number;
  weeks: number;
  days: number;
}) => {
  if (remaining.years > 0) return pluralize(remaining.years, "year");
  if (remaining.months > 0) return pluralize(remaining.months, "month");
  if (remaining.weeks > 0) return pluralize(remaining.weeks, "week");
  return pluralize(remaining.days, "day");
};

export const DurationText = ({
  label,
  period,
}: {
  label: string;
  period: { days: number; weeks: number; months: number; years: number };
}) => (
  <View className="flex-row items-center space-x-2">
    <Image source={icons.eye} className="w-5 h-5" tintColor="#FFA001" />
    <Text className="text-base text-gray-100 font-pmedium">
      {label}:{" "}
      <Text
        className={`text-white font-psemibold ${
          isLessThanOrEqualTo7Days(period) ? "text-red-500" : ""
        }`}
      >
        {displayRemainingTime(period)}
      </Text>
    </Text>
  </View>
);

const RentableDetails = ({ piano }: { piano: PianoItem }) => {
  const { rental_period_start, rental_period_end } = piano;

  // Ensure rental_period_start and rental_period_end are strings
  const start = rental_period_start
    ? formatRentalDate(rental_period_start)
    : "";
  const end = rental_period_end ? formatRentalDate(rental_period_end) : "";

  const { days, weeks, months, years } = calculateDifference(start, end);

  const totalDuration = calculateDifference(start, end);
  const remaining = calculateRemainingPeriod(end);
  const isRemainingPositive =
    remaining.days > 0 ||
    remaining.weeks > 0 ||
    remaining.months > 0 ||
    remaining.years > 0;

  return (
    <View className="bg-black-100/50 rounded-xl p-4 space-y-4">
      <Text className="text-lg text-secondary font-psemibold mb-2">
        Rental Details
      </Text>

      {piano.rental_customer_name && (
        <View className="flex-row items-center space-x-2">
          <Image
            source={icons.profile}
            className="w-5 h-5"
            tintColor="#FFA001"
          />
          <Text className="text-base text-gray-100 font-pmedium flex-1">
            Customer:{" "}
            <Text className="text-white font-psemibold">
              {piano.rental_customer_name}
            </Text>
          </Text>
        </View>
      )}

      {piano.rental_customer_address && (
        <View className="flex-row items-start space-x-2">
          <Image
            source={icons.home}
            className="w-5 h-5 mt-1"
            tintColor="#FFA001"
          />
          <Text className="text-base text-gray-100 font-pmedium flex-1">
            Address:{" "}
            <Text className="text-white font-psemibold">
              {piano.rental_customer_address}
            </Text>
          </Text>
        </View>
      )}

      {piano.rental_customer_mobile && (
        <View className="flex-row items-center space-x-2">
          <Image
            source={icons.search}
            className="w-5 h-5"
            tintColor="#FFA001"
          />
          <Text className="text-base text-gray-100 font-pmedium flex-1">
            Mobile:{" "}
            <Text className="text-white font-psemibold">
              {piano.rental_customer_mobile}
            </Text>
          </Text>
        </View>
      )}

      <View className="border-t border-gray-600 pt-4 space-y-3">
        {piano.rental_period_start && (
          <View className="flex-row items-center space-x-2">
            <Image
              source={icons.play}
              className="w-5 h-5"
              tintColor="#FFA001"
            />
            <Text className="text-base text-gray-100 font-pmedium">
              Start:{" "}
              <Text className="text-white font-psemibold">
                {formatDate(piano.rental_period_start)}
              </Text>
            </Text>
          </View>
        )}

        {piano.rental_period_end && (
          <View className="flex-row items-center space-x-2">
            <Image
              source={icons.close}
              className="w-5 h-5"
              tintColor="#FFA001"
            />
            <Text className="text-base text-gray-100 font-pmedium">
              End:{" "}
              <Text className="text-white font-psemibold">
                {formatDate(piano.rental_period_end)}
              </Text>
            </Text>
          </View>
        )}

        {piano.rental_period_start && piano.rental_period_end && (
          <DurationText label="Total Duration" period={totalDuration} />
        )}

        {piano.rental_period_end && isRemainingPositive && (
          <DurationText label="Remaining Period" period={remaining} />
        )}

        <View className="flex-row items-center space-x-2">
          <Image
            source={icons.bookmark}
            className="w-5 h-5"
            tintColor="#FFA001"
          />
          <Text className="text-base text-gray-100 font-pmedium">
            Current Date:{" "}
            <Text className="text-white font-psemibold">
              {formatDate(new Date())}
            </Text>
          </Text>
        </View>

        {piano.rental_price && (
          <View className="flex-row items-center space-x-2">
            <Image
              source={icons.card}
              className="w-5 h-5"
              tintColor="#FFA001"
            />
            <Text className="text-base text-gray-100 font-pmedium">
              Price:{" "}
              <Text className="text-secondary font-psemibold text-lg">
                {piano.rental_price}
              </Text>
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const WarehouseDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="bg-black-100/50 rounded-xl p-4 space-y-4">
    <Text className="text-lg text-secondary font-psemibold mb-2">
      Warehouse Details
    </Text>

    {piano.warehouse_since_date && (
      <View className="flex-row items-center space-x-2">
        <Image
          source={icons.bookmark}
          className="w-5 h-5"
          tintColor="#FFA001"
        />
        <Text className="text-base text-gray-100 font-pmedium">
          Since:{" "}
          <Text className="text-white font-psemibold">
            {formatDate(piano.warehouse_since_date)}
          </Text>
        </Text>
      </View>
    )}
  </View>
);

const EventDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="bg-black-100/50 rounded-xl p-4 space-y-4">
    <Text className="text-lg text-secondary font-psemibold mb-2">
      Event Details
    </Text>

    {piano.event_purchase_price && (
      <View className="flex-row items-center space-x-2">
        <Image source={icons.card} className="w-5 h-5" tintColor="#FFA001" />
        <Text className="text-base text-gray-100 font-pmedium">
          Purchase Price:{" "}
          <Text className="text-secondary font-psemibold text-lg">
            {piano.event_purchase_price}
          </Text>
        </Text>
      </View>
    )}

    {piano.event_purchase_from && (
      <View className="flex-row items-center space-x-2">
        <Image source={icons.home} className="w-5 h-5" tintColor="#FFA001" />
        <Text className="text-base text-gray-100 font-pmedium">
          Purchased From:{" "}
          <Text className="text-white font-psemibold">
            {piano.event_purchase_from}
          </Text>
        </Text>
      </View>
    )}

    {piano.event_model_number && (
      <View className="flex-row items-center space-x-2">
        <Image source={icons.search} className="w-5 h-5" tintColor="#FFA001" />
        <Text className="text-base text-gray-100 font-pmedium">
          Model Number:{" "}
          <Text className="text-white font-psemibold">
            {piano.event_model_number}
          </Text>
        </Text>
      </View>
    )}

    {piano.event_b_number && (
      <View className="flex-row items-center space-x-2">
        <Image source={icons.filter} className="w-5 h-5" tintColor="#FFA001" />
        <Text className="text-base text-gray-100 font-pmedium">
          B Number:{" "}
          <Text className="text-white font-psemibold">
            {piano.event_b_number}
          </Text>
        </Text>
      </View>
    )}
  </View>
);

const OnSaleDetails = ({ piano }: { piano: PianoItem }) => (
  <View className="bg-black-100/50 rounded-xl p-4 space-y-4">
    <Text className="text-lg text-secondary font-psemibold mb-2">
      Sale Details
    </Text>

    {piano.on_sale_purchase_from && (
      <View className="flex-row items-center space-x-2">
        <Image source={icons.home} className="w-5 h-5" tintColor="#FFA001" />
        <Text className="text-base text-gray-100 font-pmedium">
          Purchased From:{" "}
          <Text className="text-white font-psemibold">
            {piano.on_sale_purchase_from}
          </Text>
        </Text>
      </View>
    )}

    {piano.on_sale_import_date && (
      <View className="flex-row items-center space-x-2">
        <Image
          source={icons.bookmark}
          className="w-5 h-5"
          tintColor="#FFA001"
        />
        <Text className="text-base text-gray-100 font-pmedium">
          Import Date:{" "}
          <Text className="text-white font-psemibold">
            {formatDate(piano.on_sale_import_date)}
          </Text>
        </Text>
      </View>
    )}

    {piano.on_sale_price && (
      <View className="flex-row items-center space-x-2">
        <Image source={icons.card} className="w-5 h-5" tintColor="#FFA001" />
        <Text className="text-base text-gray-100 font-pmedium">
          Sale Price:{" "}
          <Text className="text-secondary font-psemibold text-lg">
            {piano.on_sale_price}
          </Text>
        </Text>
      </View>
    )}
  </View>
);

const DetailScreen = () => {
  const { id } = useLocalSearchParams();
  const pianosList = useSelector((state: RootState) => state.pianos.items);
  const dispatch = useDispatch();

  const filteredPiano: PianoItem | undefined = pianosList.find(
    (piano) => piano.$id === id
  );

  if (!filteredPiano) {
    return (
      <SafeAreaView className="bg-primary h-full">
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg text-white font-psemibold">
            Piano not found
          </Text>
          <CustomButton
            title="Go Back"
            handlePress={() => router.back()}
            containerStyles="mt-4 w-32"
          />
        </View>
      </SafeAreaView>
    );
  }

  const {
    title,
    image_url,
    category,
    make,
    description,
    company_associated,
    date_of_purchase,
  } = filteredPiano;

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: SECONDARY_COLOR,
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

  const handleEdit = () => {
    router.push(`/edit/${id}`);
  };

  const handleDelete = () => {
    Alert.alert("Delete Piano", "Are you sure you want to delete this piano?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          // TODO: Implement delete functionality
          console.log("Delete piano:", id);
        },
      },
    ]);
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    Alert.alert("Share", "Share functionality coming soon!");
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="w-full flex min-h-[90vh] px-4 space-y-6 pb-20">
          {/* Image Section */}
          <View className="relative">
            <Image
              source={{ uri: image_url }}
              style={{ height: 300 }}
              className="w-full h-64 rounded-xl"
              resizeMode="cover"
            />
            <View className="absolute top-4 right-4 bg-secondary/80 rounded-full p-2">
              <Text className="text-primary font-psemibold text-xs">
                {printCategoryLabel(category)}
              </Text>
            </View>
          </View>

          {/* Basic Info Section */}
          <View className="bg-black-100/50 rounded-xl p-4 space-y-4">
            <Text className="text-xl text-white font-psemibold mb-2">
              {title}
            </Text>

            <View className="flex-row items-center space-x-2">
              <Image
                source={icons.card}
                className="w-5 h-5"
                tintColor="#FFA001"
              />
              <Text className="text-base text-gray-100 font-pmedium">
                Make: <Text className="text-white font-psemibold">{make}</Text>
              </Text>
            </View>

            {company_associated && (
              <View className="flex-row items-center space-x-2">
                <Image
                  source={icons.home}
                  className="w-5 h-5"
                  tintColor="#FFA001"
                />
                <Text className="text-base text-gray-100 font-pmedium">
                  Company:{" "}
                  <Text className="text-white font-psemibold">
                    {company_associated}
                  </Text>
                </Text>
              </View>
            )}

            {date_of_purchase && (
              <View className="flex-row items-center space-x-2">
                <Image
                  source={icons.bookmark}
                  className="w-5 h-5"
                  tintColor="#FFA001"
                />
                <Text className="text-base text-gray-100 font-pmedium">
                  Purchase Date:{" "}
                  <Text className="text-white font-psemibold">
                    {formatDate(date_of_purchase)}
                  </Text>
                </Text>
              </View>
            )}

            <View className="flex-row items-center space-x-2">
              <Image
                source={icons.eye}
                className="w-5 h-5"
                tintColor="#FFA001"
              />
              <Text className="text-base text-gray-100 font-pmedium">
                {dateLabel}:{" "}
                <Text className="text-white font-psemibold">{dateString}</Text>
              </Text>
            </View>

            {description && (
              <View className="mt-4">
                <Text className="text-base text-gray-100 font-pmedium mb-2">
                  Description:
                </Text>
                <Text className="text-white font-pregular leading-6">
                  {description}
                </Text>
              </View>
            )}
          </View>

          {/* Category Specific Details */}
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

      {/* Action Buttons */}
      <View className="absolute bottom-0 left-0 right-0 bg-primary border-t border-gray-700 p-4">
        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={handleEdit}
            className="flex-1 bg-secondary/20 rounded-xl py-3 flex-row justify-center items-center space-x-2"
          >
            <Image
              source={icons.pencil}
              className="w-5 h-5"
              tintColor="#FFA001"
            />
            <Text className="text-secondary font-psemibold">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            className="flex-1 bg-secondary/20 rounded-xl py-3 flex-row justify-center items-center space-x-2"
          >
            <Image
              source={icons.upload}
              className="w-5 h-5"
              tintColor="#FFA001"
            />
            <Text className="text-secondary font-psemibold">Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            className="flex-1 bg-red-500/20 rounded-xl py-3 flex-row justify-center items-center space-x-2"
          >
            <Image
              source={icons.trash}
              className="w-5 h-5"
              tintColor="#FF4444"
            />
            <Text className="text-red-400 font-psemibold">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DetailScreen;
