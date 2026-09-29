import { SECONDARY_COLOR } from "@/constants/colors";
import useDeletePiano from "@/lib/useDeletePiano";
import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import {
  formatDate,
  formatDateString,
  getCategoryLabel,
} from "@/utils/ObjectManipulation";
import {
  getRemainingPeriod,
  parseStoredDate,
  periodBetween,
} from "@/utils/dates";
import useUpdatePiano from "@/lib/useUpdatePiano";
import { callNumber, messageOnWhatsApp } from "@/utils/contact";
import { formatRupees } from "@/utils/money";
import { getPianoPhotos } from "@/utils/photos";
import { getPianoRentalState, isSold } from "@/utils/pianoStatus";
import {
  formatPeriod,
  getCategoryColor,
  getCategoryIcon,
  isEndingSoon,
} from "@/utils/rentalStatus";
import { buildShareMessage } from "@/utils/share";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Share,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { PIANO_CATEGORY } from "@/constants/Piano";
import CustomButton from "@/components/CustomButton";
import ExtendRentalSheet from "@/components/ExtendRentalSheet";
import MarkAsSoldSheet from "@/components/MarkAsSoldSheet";
import PhotoGallery from "@/components/PhotoGallery";
import RentPayments from "@/components/RentPayments";
import icons from "@/constants/icons";

const RentableDetails = ({ piano }: { piano: PianoItem }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { rental_period_start, rental_period_end } = piano;

  const start = parseStoredDate(rental_period_start);
  const end = parseStoredDate(rental_period_end);

  const totalDuration =
    start && end
      ? periodBetween(start, end)
      : { days: 0, weeks: 0, months: 0, years: 0 };
  const remaining = getRemainingPeriod(rental_period_end);
  // None for a sold piano, whose rental is over
  const rentalState = getPianoRentalState(piano);
  const isExpiringSoon =
    rentalState === "due_today" ||
    rentalState === "ended" ||
    (rentalState === "active" && isEndingSoon(remaining));

  const rentalStatusTitle =
    rentalState === "ended"
      ? "Rental Ended"
      : rentalState === "due_today"
      ? "Due Today"
      : isExpiringSoon
      ? "Expiring Soon!"
      : "Active Rental";
  const rentalStatusText =
    rentalState === "ended"
      ? `Ended ${formatPeriod(remaining)} ago`
      : rentalState === "due_today"
      ? "The rental ends today"
      : `${formatPeriod(remaining)} remaining`;

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
          {rentalState && (
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
                    {rentalStatusTitle}
                  </Text>
                  <Text className="text-white font-psemibold">
                    {rentalStatusText}
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
                    <Ionicons name="call" size={16} color="#FFA001" />
                  </View>
                  {/* Tap the number to call the customer */}
                  <TouchableOpacity
                    className="flex-1"
                    onPress={() => callNumber(piano.rental_customer_mobile!)}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${piano.rental_customer_mobile}`}
                  >
                    <Text className="text-base text-secondary font-pregular">
                      {piano.rental_customer_mobile}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      messageOnWhatsApp(piano.rental_customer_mobile!)
                    }
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: "rgba(37, 211, 102, 0.15)" }}
                    accessibilityRole="button"
                    accessibilityLabel="Message on WhatsApp"
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  </TouchableOpacity>
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
                    {formatPeriod(totalDuration)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Price */}
          {piano.rental_price !== null && piano.rental_price !== undefined && (
            <View className="border-t border-gray-700 pt-4">
              <View className="bg-secondary/10 rounded-lg p-4">
                <Text className="text-sm text-gray-400 font-pmedium mb-1">
                  Rental Price
                </Text>
                <Text className="text-3xl text-secondary font-pbold">
                  {piano.rental_price !== null &&
                  piano.rental_price !== undefined
                    ? formatRupees(piano.rental_price)
                    : "N/A"}
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
          <View
            className="p-2 rounded-lg"
            style={{
              backgroundColor: `${getCategoryColor(
                PIANO_CATEGORY.WAREHOUSE
              )}33`,
            }}
          >
            <Image
              source={getCategoryIcon(PIANO_CATEGORY.WAREHOUSE)}
              className="w-6 h-6"
              tintColor={getCategoryColor(PIANO_CATEGORY.WAREHOUSE)}
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
          <View
            className="p-2 rounded-lg"
            style={{
              backgroundColor: `${getCategoryColor(PIANO_CATEGORY.EVENTS)}33`,
            }}
          >
            <Image
              source={getCategoryIcon(PIANO_CATEGORY.EVENTS)}
              className="w-6 h-6"
              tintColor={getCategoryColor(PIANO_CATEGORY.EVENTS)}
            />
          </View>
          <View>
            <Text className="text-lg text-white font-psemibold">
              Event Details
            </Text>
            {piano.event_purchase_price !== null &&
              piano.event_purchase_price !== undefined && (
                <Text className="text-sm text-gray-400 font-pregular">
                  {formatRupees(piano.event_purchase_price)}
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
          {piano.event_purchase_price !== null &&
            piano.event_purchase_price !== undefined && (
              <View
                className="rounded-lg p-4"
                style={{
                  backgroundColor: `${getCategoryColor(
                    PIANO_CATEGORY.EVENTS
                  )}1A`,
                }}
              >
                <Text className="text-sm text-gray-400 font-pmedium mb-1">
                  Purchase Price
                </Text>
                <Text
                  className="text-2xl font-pbold"
                  style={{ color: getCategoryColor(PIANO_CATEGORY.EVENTS) }}
                >
                  {formatRupees(piano.event_purchase_price)}
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
          <View
            className="p-2 rounded-lg"
            style={{
              backgroundColor: `${getCategoryColor(PIANO_CATEGORY.ON_SALE)}33`,
            }}
          >
            <Image
              source={getCategoryIcon(PIANO_CATEGORY.ON_SALE)}
              className="w-6 h-6"
              tintColor={getCategoryColor(PIANO_CATEGORY.ON_SALE)}
            />
          </View>
          <View>
            <Text className="text-lg text-white font-psemibold">
              Sale Information
            </Text>
            {piano.on_sale_price !== null &&
              piano.on_sale_price !== undefined && (
                <Text
                  className="text-sm font-psemibold"
                  style={{ color: getCategoryColor(PIANO_CATEGORY.ON_SALE) }}
                >
                  {formatRupees(piano.on_sale_price)}
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
          {piano.on_sale_price !== null &&
            piano.on_sale_price !== undefined && (
              <View
                className="rounded-lg p-4"
                style={{
                  backgroundColor: `${getCategoryColor(
                    PIANO_CATEGORY.ON_SALE
                  )}1A`,
                }}
              >
                <Text className="text-sm text-gray-400 font-pmedium mb-1">
                  Sale Price
                </Text>
                <Text
                  className="text-2xl font-pbold"
                  style={{ color: getCategoryColor(PIANO_CATEGORY.ON_SALE) }}
                >
                  {formatRupees(piano.on_sale_price)}
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

const SaleDetails = ({
  piano,
  onUndo,
}: {
  piano: PianoItem;
  onUndo: () => void;
}) => {
  const price = piano.sold_price ?? 0;
  const rows = [
    ["Sold On", formatDate(piano.sold_date)],
    ["Buyer", piano.sold_to_name],
    ["Address", piano.sold_to_address],
    ["Price", price > 0 ? formatRupees(price) : null],
  ].filter(([, value]) => value);

  return (
    <View className="bg-black-100/50 rounded-2xl p-5">
      <Text className="text-sm text-gray-400 font-pmedium uppercase tracking-wide mb-3">
        Sale
      </Text>
      {rows.map(([label, value]) => (
        <View key={label} className="flex-row justify-between items-start py-2">
          <Text className="text-sm text-gray-400 font-pmedium mr-4">
            {label}
          </Text>
          <Text className="text-white font-psemibold flex-1 text-right">
            {value}
          </Text>
        </View>
      ))}
      <TouchableOpacity
        onPress={onUndo}
        className="mt-3 py-3 rounded-xl border border-gray-600 items-center"
      >
        <Text className="text-gray-100 font-pmedium">Undo Sale</Text>
      </TouchableOpacity>
    </View>
  );
};

const DetailScreen = () => {
  const { id } = useLocalSearchParams();
  const pianosList = useSelector((state: RootState) => state.pianos.items);
  const navigation = useNavigation();
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [showSoldSheet, setShowSoldSheet] = useState(false);
  const [showExtendSheet, setShowExtendSheet] = useState(false);
  const confirmDelete = useDeletePiano();
  const updatePiano = useUpdatePiano();

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

  // Stay blank while navigating away after a delete, instead of "Piano not found"
  if (isDeleted) {
    return <SafeAreaView className="bg-primary h-full" />;
  }

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
    confirmDelete(filteredPiano, () => {
      setIsDeleted(true);
      if (router.canGoBack()) router.back();
      else router.replace("/home");
    });
  };

  const sold = isSold(filteredPiano);

  const handleUndoSale = () =>
    Alert.alert(
      "Undo Sale",
      `Mark "${title}" as not sold? The sale details will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Undo Sale",
          style: "destructive",
          onPress: () =>
            updatePiano(
              filteredPiano,
              {
                sold_date: null,
                sold_price: null,
                sold_to_name: null,
                sold_to_address: null,
              },
              `${title} is back in stock`
            ),
        },
      ]
    );

  const handleShare = async () => {
    try {
      await Share.share({
        title: filteredPiano.title,
        message: buildShareMessage(filteredPiano),
      });
    } catch (error) {
      Alert.alert(
        "Couldn't Share",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="w-full flex min-h-[90vh] px-4 space-y-4 pb-24">
          {/* Image Section with Category Badge */}
          <View className="relative mt-2">
            <PhotoGallery photos={getPianoPhotos(filteredPiano)} height={280} />
            <View
              testID="category-badge"
              className="absolute top-4 right-4 rounded-full px-4 py-2 shadow-lg"
              // The category's colour in the lists too
              style={{ backgroundColor: getCategoryColor(category) }}
            >
              <Text className="text-primary font-pbold text-sm">
                {getCategoryLabel(category)}
              </Text>
            </View>
            {sold && (
              <View className="absolute top-4 left-4 bg-gray-100 rounded-full px-4 py-2 shadow-lg">
                <Text className="text-primary font-pbold text-sm">SOLD</Text>
              </View>
            )}
          </View>

          {/* Title & Make */}
          <View className="bg-black-100/50 rounded-2xl p-5">
            <Text className="text-2xl text-white font-pbold mb-3">
              {title || "Untitled Piano"}
            </Text>

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
                  {make || "Unknown"}
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
            <>
              <RentableDetails piano={filteredPiano} />
              <RentPayments piano={filteredPiano} />
            </>
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

          {sold ? (
            <SaleDetails piano={filteredPiano} onUndo={handleUndoSale} />
          ) : (
            <View className="flex-row space-x-3">
              {category === PIANO_CATEGORY.RENTABLE && (
                <TouchableOpacity
                  onPress={() => setShowExtendSheet(true)}
                  className="flex-1 bg-secondary/20 rounded-xl py-4 border border-secondary/40 items-center"
                >
                  <Text className="text-secondary font-psemibold">
                    Extend Rental
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowSoldSheet(true)}
                className="flex-1 bg-black-100/50 rounded-xl py-4 border border-gray-700 items-center"
              >
                <Text className="text-white font-psemibold">Mark as Sold</Text>
              </TouchableOpacity>
            </View>
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
      <View className="absolute bottom-0 left-0 right-0 bg-primary/95 border-t border-gray-700 p-4">
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
            accessibilityLabel="Share"
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

      <MarkAsSoldSheet
        piano={filteredPiano}
        visible={showSoldSheet}
        onClose={() => setShowSoldSheet(false)}
      />
      <ExtendRentalSheet
        piano={filteredPiano}
        visible={showExtendSheet}
        onClose={() => setShowExtendSheet(false)}
      />
    </SafeAreaView>
  );
};

export default DetailScreen;
