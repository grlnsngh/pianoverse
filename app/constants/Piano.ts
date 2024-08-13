import { FiltersType } from "@/redux/pianos/types";

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
  YOUNG_CHANG: "Young Chang",
  SAMICK: "Samick",
  ROSENSTOCK: "Rosenstock",
  HORUGUL: "Horugul",
  JOHN_BROADWOOD_AND_SONS: "John Broadwood & Sons",
  HARRODSER: "Harrodser",
  FEURICH: "Feurich",
  ALISON: "Alison",
  ERARD: "Erard",
  ZIMMERMANN: "Zimmermann",
  RUSSIAN: "Russian",
  PEARL_RIVER: "Pearl River",
  COLLARD_AND_COLLERD: "Collard & Collerd",
  SCHIMMEL: "Schimmel",
  ESTONIA: "Estonia",
  B_STEINER: "B.Steiner",
  RITMULLER: "Ritmuller",
  KURLMULLER: "Kurlmuller",
  BURGMANN: "Burgmann",
  RAMEAU: "Rameau",
  PETROF: "Petrof",
  SCHUMANN: "Schumann",
  KREUTZER: "Kreutzer",
  FUKUYAMA: "Fukuyama",
  RONISH: "Ronish",
  WEBER: "Weber",
  SAUJIN: "Saujin",
  OTHER: "Other",
};

export const pianoCompaniesMakeList = Object.keys(PIANO_COMPANY_MAKE).map(
  (key) => ({
    label: PIANO_COMPANY_MAKE[key],
    value: PIANO_COMPANY_MAKE[key],
  })
);

export const SORT_BY_OPTIONS = {
  LATEST_ADDED: "Latest Added",
  TITLE: "Title",
  PURCHASE_DATE: "Purchase Date",
};

export const DEFAULT_FILTERS: FiltersType = {
  sortBy: SORT_BY_OPTIONS.LATEST_ADDED,
  category: "",
  isActiveRentals: false,
  isSold: false,
  layoutStatus: {
    card: "checked",
    list: "unchecked",
    grid: "unchecked",
  },
};
