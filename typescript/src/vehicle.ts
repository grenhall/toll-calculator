export type VehicleType =
  | "Car"
  | "Motorbike"
  | "Tractor"
  | "Emergency"
  | "Diplomat"
  | "Foreign"
  | "Military";

export interface Vehicle {
  readonly type: VehicleType;
}

export function createVehicle(type: string): Vehicle {
  switch (type.trim().toLowerCase()) {
    case "car":       return { type: "Car" };
    case "motorbike": return { type: "Motorbike" };
    case "tractor":   return { type: "Tractor" };
    case "emergency": return { type: "Emergency" };
    case "diplomat":  return { type: "Diplomat" };
    case "foreign":   return { type: "Foreign" };
    case "military":  return { type: "Military" };
    default:          throw new Error(`Unknown vehicle type: "${type}"`);
  }
}
