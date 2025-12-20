import { EnergyDetails } from "@teslemetry/api";
import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

export default class WallConnectorDriver extends TeslemetryDriver {
  async onPairListDevices() {
    const app = this.homey.app as TeslemetryApp;

    if (!app.isConfigured()) {
      throw new Error(
        "App not configured - please set up your Teslemetry access token in app settings",
      );
    }

    const products = await app.getProducts();
    if (!products) {
      throw new Error(
        "Failed to load energy sites - check your access token in app settings",
      );
    }

    const { response: productDetails } =
      await app.teslemetry!.api.getProducts();

    type EnergyProduct = Extract<
      (typeof productDetails)[number],
      { device_type: "energy" }
    >;

    const accessibleSites = Object.values(products.energySites).filter(
      ({ metadata }) => metadata.access,
    );

    return accessibleSites.flatMap((site) => {
      const siteDetails = productDetails.find(
        (product): product is EnergyProduct =>
          product.device_type === "energy" &&
          product.energy_site_id === site.id,
      );

      const wallConnectors = siteDetails?.components?.wall_connectors ?? [];

      return wallConnectors.map((connector) => ({
        name: `${site.name} - ${connector.device_id}`,
        data: {
          site: site.id,
          device: connector.device_id,
        },
      }));
    });
  }
}
