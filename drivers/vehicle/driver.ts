import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

export default class VehicleDriver extends TeslemetryDriver {
  async onInit() {
    this.homey.log("Vehicle driver initialized");
  }

  async onPairListDevices() {
    this.homey.log("Listing vehicles for pairing...");
    const app = this.homey.app as TeslemetryApp;

    try {
      const products = await app.getProducts();

      if (!products || !products.vehicles) {
        this.homey.log("No vehicles found or products not loaded");
        return [];
      }

      // Only includes vehicles that support fleet telemetry
      return Object.values(products.vehicles)
        .filter(({ metadata }) => !!metadata.fleet_telemetry)
        .map((data) => ({
          name: data.name,
          data: {
            vin: data.vin,
          },
        }));
    } catch (error) {
      this.homey.error("Failed to list vehicles:", error);
      throw new Error(
        "Failed to load vehicles from Teslemetry. Please check your connection and try again.",
      );
    }
  }
}
