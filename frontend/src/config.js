export const api_base =
  "https://greensteps-api.devlix.org";

if (typeof window !== "undefined") {
  window.api_base = api_base;
}

export const STORAGE_KEYS = {
  accessToken: "gs_access_token",
  refreshToken: "gs_refresh_token"
};
