export function getTimeOfDay(
  date: Date,
): string {
  const h = date.getHours();
  if (h >= 5 && h < 8) return "5_8";
  if (h >= 8 && h < 11) return "8_11";
  if (h >= 11 && h < 14) return "11_14";
  if (h >= 14 && h < 17) return "14_17";
  if (h >= 17 && h < 20) return "17_20";
  if (h >= 20 && h < 23) return "20_23";
  return "23_5";
}
