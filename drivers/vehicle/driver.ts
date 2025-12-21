import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

const graphics: Record<
  string,
  { icon: string; images: { small: string; large: string; xlarge: string } }
> = {
  "3": {
    icon: "model3.svg",
    images: {
      small: "{{driverAssetsPath}}/images/model3/small.png",
      large: "{{driverAssetsPath}}/images/model3/large.png",
      xlarge: "{{driverAssetsPath}}/images/model3/xlarge.png",
    },
  },
  Y: {
    icon: "modelY.svg",
    images: {
      small: "{{driverAssetsPath}}/images/modelY/small.png",
      large: "{{driverAssetsPath}}/images/modelY/large.png",
      xlarge: "{{driverAssetsPath}}/images/modelY/xlarge.png",
    },
  },
  S: {
    icon: "modelS.svg",
    images: {
      small: "{{driverAssetsPath}}/images/modelS/small.png",
      large: "{{driverAssetsPath}}/images/modelS/large.png",
      xlarge: "{{driverAssetsPath}}/images/modelS/xlarge.png",
    },
  },
  X: {
    icon: "modelX.svg",
    images: {
      small: "{{driverAssetsPath}}/images/modelX/small.png",
      large: "{{driverAssetsPath}}/images/modelX/large.png",
      xlarge: "{{driverAssetsPath}}/images/modelX/xlarge.png",
    },
  },
  C: {
    icon: "cybertruck.svg",
    images: {
      small: "{{driverAssetsPath}}/images/cybertruck/small.png",
      large: "{{driverAssetsPath}}/images/cybertruck/large.png",
      xlarge: "{{driverAssetsPath}}/images/cybertruck/xlarge.png",
    },
  },
};

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
          ...graphics?.[data.vin[3]],
        }));
    } catch (error) {
      this.homey.error("Failed to list vehicles:", error);
      throw new Error(
        "Failed to load vehicles from Teslemetry. Please check your connection and try again.",
      );
    }
  }
}
