export function getTimeOfDay(
  dateValue: Date | string,
): string {
  let h = 0;
  if (typeof dateValue === "string") {
    // Matches patterns like T06:, _06:, " 06:" (ISO and EXIF formats)
    const match = dateValue.match(/[T\s_](\d{2}):/);
    if (match) {
      h = parseInt(match[1], 10);
    } else {
      const parsed = new Date(dateValue);
      h = !isNaN(parsed.getTime()) ? parsed.getHours() : 0;
    }
  } else if (dateValue instanceof Date) {
    h = dateValue.getHours();
  }

  // Gallery Filter mappings
  if (h >= 4 && h < 8) return "5_8";      // First Light
  if (h >= 8 && h < 11) return "8_11";    // Morning
  if (h >= 11 && h < 14) return "11_14";  // Lunch
  if (h >= 14 && h < 19) return "14_17";  // Afternoon
  
  return "23_5"; // Fallback / Unknown / Night
}
