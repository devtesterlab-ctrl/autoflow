import type {
  CurrencyValue,
  FuelValue,
  StatusValue,
  TransmissionValue,
} from "@/lib/validators/vehicle";

export const STATUS_LABELS: Record<StatusValue, string> = {
  PREPARATION: "En preparación",
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
};

export const STATUS_BADGE_CLASSES: Record<StatusValue, string> = {
  PREPARATION: "bg-sky-600 text-white",
  AVAILABLE: "bg-emerald-600 text-white",
  RESERVED: "bg-amber-500 text-black",
  SOLD: "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-black",
};

export const STATUS_ACTIVE_CLASSES: Record<StatusValue, string> = {
  PREPARATION: "border-sky-600 bg-sky-600 text-white",
  AVAILABLE: "border-emerald-600 bg-emerald-600 text-white",
  RESERVED: "border-amber-500 bg-amber-500 text-black",
  SOLD: "border-neutral-800 bg-neutral-800 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-black",
};

export const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: "AVAILABLE", label: STATUS_LABELS.AVAILABLE },
  { value: "RESERVED", label: STATUS_LABELS.RESERVED },
  { value: "PREPARATION", label: STATUS_LABELS.PREPARATION },
  { value: "SOLD", label: STATUS_LABELS.SOLD },
];

export const TRANSMISSION_OPTIONS: { value: TransmissionValue; label: string }[] = [
  { value: "MANUAL", label: "Manual" },
  { value: "AUTOMATIC", label: "Automática" },
];

export const FUEL_OPTIONS: { value: FuelValue; label: string }[] = [
  { value: "NAFTA", label: "Nafta" },
  { value: "DIESEL", label: "Diésel" },
  { value: "GNC", label: "GNC" },
  { value: "HYBRID", label: "Híbrido" },
  { value: "ELECTRIC", label: "Eléctrico" },
];

export const CURRENCY_OPTIONS: { value: CurrencyValue; label: string }[] = [
  { value: "ARS", label: "Pesos ($)" },
  { value: "USD", label: "Dólares (USD)" },
];

export const TRANSMISSION_LABELS: Record<TransmissionValue, string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automática",
};

export const FUEL_LABELS: Record<FuelValue, string> = {
  NAFTA: "Nafta",
  DIESEL: "Diésel",
  GNC: "GNC",
  HYBRID: "Híbrido",
  ELECTRIC: "Eléctrico",
};

export const COMMON_BRANDS = [
  "Audi", "BMW", "Chery", "Chevrolet", "Citroën", "Fiat", "Ford", "Honda", "Hyundai",
  "Jeep", "Kia", "Mercedes-Benz", "Mitsubishi", "Nissan", "Peugeot", "Ram", "Renault",
  "Suzuki", "Toyota", "Volkswagen",
];

export const FEATURE_SUGGESTIONS = [
  "Aire acondicionado",
  "Climatizador",
  "Cámara de retroceso",
  "Sensores traseros",
  "Control de crucero",
  "Bluetooth",
  "Apple CarPlay / Android Auto",
  "Techo solar",
  "Asientos de cuero",
  "Llantas de aleación",
];

export function formatPrice(price: number, currency: CurrencyValue): string {
  const amount = price.toLocaleString("es-AR");
  return currency === "USD" ? `USD ${amount}` : `$ ${amount}`;
}

export function formatKm(km: number): string {
  return `${km.toLocaleString("es-AR")} km`;
}
