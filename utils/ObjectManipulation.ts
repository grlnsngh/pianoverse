import { categoryOptions } from "@/app/constants/Piano";

export const printCategoryLabel = (category: string | undefined) => {
  const option = categoryOptions.find((option) => option.value === category);
  if (option) {
    return option.label;
  } else {
    return "Unknown Category";
  }
};
