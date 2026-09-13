export const SOLO_ENTRY_URL = "https://solo.snaplinkmedia.com" as const;

export const SOLO_ACTIVATION_ROUTE = "/activation" as const;

export const SOLO_HARDWARE_ROUTE = "/hardware" as const;

export const ROUTES = {
  entry: SOLO_ENTRY_URL,
  activation: SOLO_ACTIVATION_ROUTE,
  hardware: SOLO_HARDWARE_ROUTE,
} as const;
