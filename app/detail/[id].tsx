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
import React, { useEffect, useState } from "react";
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
  const [isExpanded, setIsExpanded] = useState(true);
  const { rental_period_start, rental_period_end } = piano;

  const start = rental_period_start
    ? formatRentalDate(rental_period_start)
    : "";
  const end = rental_period_end ? formatRentalDate(rental_period_end) : "";

  const totalDuration = calculateDifference(start, end);
  const remaining = calculateRemainingPeriod(end);
  const isRemainingPositive =
    remaining.days > 0 ||
    remaining.weeks > 0 ||
    remaining.months > 0 ||
    remaining.years > 0;
  const isExpiringSoon = isLessThanOrEqualTo7Days(remaining);

  return (
    <View className="bg-black-100/50 rounded-xl overflow-hidden">
      {/* Header */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between p-4 border-b border-gray-700"
      >
        <View className="flex-row items-center space-x-3">
          <View
            className={`p-2 rounded-lg ${
              isExpiringSoon ? "bg-red-500/20" : "bg-secondary/20"
            }`}
          >
            <Image
              source={icons.profile}
              className="w-6 h-6"
              tintColor={isExpiringSoon ? "#FF4444" : "#FFA001"}
            />
          </View>
          <View>
            <Text className="text-lg text-white font-psemibold">
              Rental Information
            </Text>
            {piano.rental_customer_name && (
              <Text className="text-sm text-gray-400 font-pregular">
                {piano.rental_customer_name}
              </Text>
            )}
          </View>
        </View>
        <Image
          source={icons.rightArrow}
          className={`w-5 h-5 ${isExpanded ? "rotate-90" : ""}`}
          tintColor="#888"
        />
      </TouchableOpacity>

      {/* Content */}
      {isExpanded && (
        <View className="p-4 space-y-4">
          {/* Rental Period Alert */}
          {isRemainingPositive && (
            <View
              className={`p-3 rounded-lg ${
                isExpiringSoon
                  ? "bg-red-500/20 border border-red-500/50"
                  : "bg-secondary/10 border border-secondary/30"
              }`}
            >
              <View className="flex-row items-center space-x-2">
                <Image
                  source={icons.eye}
                  className="w-5 h-5"
                  tintColor={isExpiringSoon ? "#FF4444" : "#FFA001"}
                />
                <View className="flex-1">
                  <Text
                    className={`text-sm font-pmedium ${
                      isExpiringSoon ? "text-red-400" : "text-secondary"
                    }`}
                  >
                    {isExpiringSoon ? "Expiring Soon!" : "Active Rental"}
                  </Text>
                  <Text className="text-white font-psemibold">
                    {displayRemainingTime(remaining)} remaining
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Customer Details */}
          {(piano.rental_customer_name ||
            piano.rental_customer_mobile ||
            piano.rental_customer_address) && (
            <View className="space-y-3">
              <Text className="text-sm text-gray-400 font-pmedium uppercase tracking-wide">
                Customer
              </Text>

              {piano.rental_customer_name && (
                <View className="flex-row items-center space-x-3">
                  <View className="w-8 h-8 bg-secondary/10 rounded-full items-center justify-center">
                    <Image
                      source={icons.profile}
                      className="w-4 h-4"
                      tintColor="#FFA001"
                    />
                  </View>
                  <Text className="text-base text-white font-pregular flex-1">
                    {piano.rental_customer_name}
                  </Text>
                </View>
              )}

              {piano.rental_customer_mobile && (
                <View className="flex-row items-center space-x-3">
                  <View className="w-8 h-8 bg-secondary/10 rounded-full items-center justify-center">
                    <Image
                      source={icons.search}
                      className="w-4 h-4"
                      tintColor="#FFA001"
                    />
                  </View>
                  <Text className="text-base text-white font-pregular flex-1">
                    {piano.rental_customer_mobile}
                  </Text>
                </View>
              )}

              {piano.rental_customer_address && (
                <View className="flex-row items-start space-x-3">
                  <View className="w-8 h-8 bg-secondary/10 rounded-full items-center justify-center">
                    <Image
                      source={icons.home}
                      className="w-4 h-4"
                      tintColor="#FFA001"
                    />
                  </View>
                  <Text className="text-base text-white font-pregular flex-1">
                    {piano.rental_customer_address}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Rental Period */}
          <View className="border-t border-gray-700 pt-4 space-y-3">
            <Text className="text-sm text-gray-400 font-pmedium uppercase tracking-wide">
              Period
            </Text>

            <View className="bg-black-200/50 rounded-lg p-3 space-y-2">
              {piano.rental_period_start && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-gray-400 font-pmedium">
                    Start
                  </Text>
                  <Text className="text-white font-psemibold">
                    {formatDate(piano.rental_period_start)}
                  </Text>
                </View>
              )}

              {piano.rental_period_end && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-gray-400 font-pmedium">
                    End
                  </Text>
                  <Text className="text-white font-psemibold">
                    {formatDate(piano.rental_period_end)}
                  </Text>
                </View>
              )}

              {piano.rental_period_start && piano.rental_period_end && (
                <View className="flex-row justify-between items-center pt-2 border-t border-gray-700">
                  <Text className="text-sm text-gray-400 font-pmedium">
                    Duration
                  </Text>
                  <Text className="text-secondary font-psemibold">
                    {displayRemainingTime(totalDuration)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Price */}
          {piano.rental_price && (
            <View className="border-t border-gray-700 pt-4">
              <View className="bg-secondary/10 rounded-lg p-4">
                <Text className="text-sm text-gray-400 font-pmedium mb-1">
                  Rental Price
                </Text>
                <Text className="text-3xl text-secondary font-pbold">
                  ₹{piano.rental_price.toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const WarehouseDetails = ({ piano }: { piano: PianoItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View className="bg-black-100/50 rounded-xl overflow-hidden">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between p-4 border-b border-gray-700"
      >
        <View className="flex-row items-center space-x-3">
          <View className="p-2 bg-blue-500/20 rounded-lg">
            <Image
              source={icons.home}
              className="w-6 h-6"
              tintColor="#3B82F6"
            />
          </View>
          <Text className="text-lg text-white font-psemibold">
            Warehouse Storage
          </Text>
        </View>
        <Image
          source={icons.rightArrow}
          className={`w-5 h-5 ${isExpanded ? "rotate-90" : ""}`}
          tintColor="#888"
        />
      </TouchableOpacity>

      {isExpanded && piano.warehouse_since_date && (
        <View className="p-4">
          <View className="bg-black-200/50 rounded-lg p-4">
            <Text className="text-sm text-gray-400 font-pmedium mb-2">
              Stored Since
            </Text>
            <Text className="text-xl text-white font-psemibold">
              {formatDate(piano.warehouse_since_date)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const EventDetails = ({ piano }: { piano: PianoItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View className="bg-black-100/50 rounded-xl overflow-hidden">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between p-4 border-b border-gray-700"
      >
        <View className="flex-row items-center space-x-3">
          <View className="p-2 bg-purple-500/20 rounded-lg">
            <Image
              source={icons.bookmark}
              className="w-6 h-6"
              tintColor="#A855F7"
            />
          </View>
          <View>
            <Text className="text-lg text-white font-psemibold">
              Event Details
            </Text>
            {piano.event_purchase_price && (
              <Text className="text-sm text-gray-400 font-pregular">
                ₹{piano.event_purchase_price.toLocaleString()}
              </Text>
            )}
          </View>
        </View>
        <Image
          source={icons.rightArrow}
          className={`w-5 h-5 ${isExpanded ? "rotate-90" : ""}`}
          tintColor="#888"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View className="p-4 space-y-4">
          {piano.event_purchase_price && (
            <View className="bg-purple-500/10 rounded-lg p-4">
              <Text className="text-sm text-gray-400 font-pmedium mb-1">
                Purchase Price
              </Text>
              <Text className="text-2xl text-purple-400 font-pbold">
                ₹{piano.event_purchase_price.toLocaleString()}
              </Text>
            </View>
          )}

          <View className="space-y-3">
            {piano.event_purchase_from && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-400 font-pmedium">
                  Purchased From
                </Text>
                <Text className="text-white font-psemibold flex-1 text-right ml-4">
                  {piano.event_purchase_from}
                </Text>
              </View>
            )}

            {piano.event_model_number && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-400 font-pmedium">
                  Model Number
                </Text>
                <Text className="text-white font-psemibold">
                  {piano.event_model_number}
                </Text>
              </View>
            )}

            {piano.event_b_number && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-400 font-pmedium">
                  B Number
                </Text>
                <Text className="text-white font-psemibold">
                  {piano.event_b_number}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const OnSaleDetails = ({ piano }: { piano: PianoItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View className="bg-black-100/50 rounded-xl overflow-hidden">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between p-4 border-b border-gray-700"
      >
        <View className="flex-row items-center space-x-3">
          <View className="p-2 bg-green-500/20 rounded-lg">
            <Image
              source={icons.card}
              className="w-6 h-6"
              tintColor="#10B981"
            />
          </View>
          <View>
            <Text className="text-lg text-white font-psemibold">
              Sale Information
            </Text>
            {piano.on_sale_price && (
              <Text className="text-sm text-green-400 font-psemibold">
                ₹{piano.on_sale_price.toLocaleString()}
              </Text>
            )}
          </View>
        </View>
        <Image
          source={icons.rightArrow}
          className={`w-5 h-5 ${isExpanded ? "rotate-90" : ""}`}
          tintColor="#888"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View className="p-4 space-y-4">
          {piano.on_sale_price && (
            <View className="bg-green-500/10 rounded-lg p-4">
              <Text className="text-sm text-gray-400 font-pmedium mb-1">
                Sale Price
              </Text>
              <Text className="text-2xl text-green-400 font-pbold">
                ₹{piano.on_sale_price.toLocaleString()}
              </Text>
            </View>
          )}

          <View className="space-y-3">
            {piano.on_sale_purchase_from && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-400 font-pmedium">
                  Purchased From
                </Text>
                <Text className="text-white font-psemibold flex-1 text-right ml-4">
                  {piano.on_sale_purchase_from}
                </Text>
              </View>
            )}

            {piano.on_sale_import_date && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-400 font-pmedium">
                  Import Date
                </Text>
                <Text className="text-white font-psemibold">
                  {formatDate(piano.on_sale_import_date)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const DetailScreen = () => {
  const { id } = useLocalSearchParams();
  const pianosList = useSelector((state: RootState) => state.pianos.items);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

  const filteredPiano: PianoItem | undefined = pianosList.find(
    (piano) => piano.$id === id
  );

  useEffect(() => {
    if (filteredPiano) {
      navigation.setOptions({
        headerStyle: {
          backgroundColor: SECONDARY_COLOR,
        },
        headerTintColor: "#161622",
        title: `${filteredPiano.title}`,
      });
    }
  }, [id, filteredPiano]);

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

  const createdAtString = formatDateString(filteredPiano.$createdAt);
  const updatedAtString = formatDateString(filteredPiano.$updatedAt);

  const isUpdated = filteredPiano.$updatedAt !== filteredPiano.$createdAt;

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

  const getCategoryColor = () => {
    switch (category) {
      case PIANO_CATEGORY.RENTABLE:
        return "bg-orange-500";
      case PIANO_CATEGORY.WAREHOUSE:
        return "bg-blue-500";
      case PIANO_CATEGORY.EVENTS:
        return "bg-purple-500";
      case PIANO_CATEGORY.ON_SALE:
        return "bg-green-500";
      default:
        return "bg-secondary";
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="w-full flex min-h-[90vh] px-4 space-y-4 pb-24">
          {/* Image Section with Category Badge */}
          <View className="relative mt-2">
            <Image
              source={{ uri: image_url }}
              style={{ height: 280 }}
              className="w-full rounded-2xl"
              resizeMode="cover"
            />
            <View
              className={`absolute top-4 right-4 ${getCategoryColor()} rounded-full px-4 py-2 shadow-lg`}
            >
              <Text className="text-white font-pbold text-sm">
                {printCategoryLabel(category)}
              </Text>
            </View>
          </View>

          {/* Title & Make */}
          <View className="bg-black-100/50 rounded-2xl p-5">
            <Text className="text-2xl text-white font-pbold mb-3">{title}</Text>

            <View className="flex-row items-center space-x-2 mb-3">
              <View className="w-10 h-10 bg-secondary/20 rounded-full items-center justify-center">
                <Image
                  source={icons.card}
                  className="w-5 h-5"
                  tintColor="#FFA001"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-400 font-pmedium">Make</Text>
                <Text className="text-base text-white font-psemibold">
                  {make}
                </Text>
              </View>
            </View>

            {company_associated && (
              <View className="flex-row items-center space-x-2">
                <View className="w-10 h-10 bg-secondary/20 rounded-full items-center justify-center">
                  <Image
                    source={icons.home}
                    className="w-5 h-5"
                    tintColor="#FFA001"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-400 font-pmedium">
                    Company
                  </Text>
                  <Text className="text-base text-white font-psemibold">
                    {company_associated}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Description if available */}
          {description && (
            <View className="bg-black-100/50 rounded-2xl p-5">
              <Text className="text-sm text-gray-400 font-pmedium mb-2 uppercase tracking-wide">
                Description
              </Text>
              <Text className="text-white font-pregular leading-6 text-base">
                {description}
              </Text>
            </View>
          )}

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

          {/* Additional Information - Collapsible */}
          <View className="bg-black-100/50 rounded-2xl overflow-hidden">
            <TouchableOpacity
              onPress={() => setShowAdditionalInfo(!showAdditionalInfo)}
              className="flex-row items-center justify-between p-4"
            >
              <Text className="text-base text-gray-300 font-pmedium">
                Additional Information
              </Text>
              <Image
                source={icons.rightArrow}
                className={`w-5 h-5 ${showAdditionalInfo ? "rotate-90" : ""}`}
                tintColor="#888"
              />
            </TouchableOpacity>

            {showAdditionalInfo && (
              <View className="px-4 pb-4 space-y-3 border-t border-gray-700 pt-4">
                {date_of_purchase && (
                  <View className="flex-row justify-between items-center py-2">
                    <Text className="text-sm text-gray-400 font-pmedium">
                      Purchase Date
                    </Text>
                    <Text className="text-white font-psemibold">
                      {formatDate(date_of_purchase)}
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-400 font-pmedium">
                    {isUpdated ? "Last Updated" : "Created"}
                  </Text>
                  <Text className="text-white font-psemibold">
                    {isUpdated ? updatedAtString : createdAtString}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-sm text-gray-400 font-pmedium">
                    Piano ID
                  </Text>
                  <Text className="text-white font-pregular text-xs">
                    {filteredPiano.$id.substring(0, 12)}...
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-primary/95 backdrop-blur-lg border-t border-gray-700 p-4">
        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={handleEdit}
            className="flex-1 bg-secondary rounded-xl py-4 flex-row justify-center items-center space-x-2"
          >
            <Image
              source={icons.pencil}
              className="w-5 h-5"
              tintColor="#161622"
            />
            <Text className="text-primary font-pbold text-base">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            className="bg-secondary/20 rounded-xl px-5 py-4 flex-row justify-center items-center"
          >
            <Image
              source={icons.upload}
              className="w-5 h-5"
              tintColor="#FFA001"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            className="bg-red-500/20 rounded-xl px-5 py-4 flex-row justify-center items-center"
          >
            <Image
              source={icons.trash}
              className="w-5 h-5"
              tintColor="#FF4444"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DetailScreen;
