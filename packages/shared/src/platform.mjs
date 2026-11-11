export const SUPPORTED_PLATFORMS = Object.freeze({ LEETCODE: "leetcode", GEEKSFORGEEKS: "geeksforgeeks" });
export function identifyPlatform(hostname = "") {
  if (hostname.includes("leetcode.com")) return SUPPORTED_PLATFORMS.LEETCODE;
  if (hostname.includes("geeksforgeeks.org")) return SUPPORTED_PLATFORMS.GEEKSFORGEEKS;
  return null;
}
