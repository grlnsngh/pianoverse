export const PIANO_CATEGORY = {
  RENTABLE: "rentable",
  EVENTS: "events",
  ON_SALE: "on_sale",
  WAREHOUSE: "warehouse",
};

export const categoryOptions = [
  { label: "Rentable", value: PIANO_CATEGORY.RENTABLE },
  { label: "Events", value: PIANO_CATEGORY.EVENTS },
  { label: "On Sale", value: PIANO_CATEGORY.ON_SALE },
  { label: "Warehouse", value: PIANO_CATEGORY.WAREHOUSE },
];

export const COMPANY_ASSOCIATED = {
  SHAMSHERSONS: "Shamshersons",
  KIRPALSONS: "Kirpalsons",
  RS_MUSIC_CENTER: "RS Music Center",
  THE_PIANO_SERVICES: "The Piano Services",
};

export const PIANO_COMPANY_MAKE: { [key: string]: string } = {
  YAMAHA: "Yamaha",
  KAWAI: "Kawai",
  STEINWAY: "Steinway",
  BOSTON: "Boston",
  ESSEX: "Essex",
  YONGCHANG: "Yongchang",
  PEARL_RIVER: "Pearl River",
  OTHER: "Other",
};

export const pianoCompaniesMakeList = Object.keys(PIANO_COMPANY_MAKE).map(
  (key) => ({
    label: PIANO_COMPANY_MAKE[key],
    value: PIANO_COMPANY_MAKE[key],
  })
);
