import type { CurrencyValue, FuelValue, TransmissionValue } from "@/lib/validators/vehicle";

export interface PublicVehicle {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  mileage: number;
  price: number;
  currency: CurrencyValue;
  transmission: TransmissionValue;
  fuelType: FuelValue;
  status: "AVAILABLE" | "RESERVED";
  isFeatured: boolean;
  coverUrl: string | null;
}

export interface PublicVehicleDetail {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  mileage: number;
  price: number;
  currency: CurrencyValue;
  transmission: TransmissionValue;
  fuelType: FuelValue;
  color: string | null;
  description: string | null;
  features: string[];
  status: "AVAILABLE" | "RESERVED";
  images: { id: string; url: string }[];
}
