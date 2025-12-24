import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";
import { getCapabilities } from "./capabilities.js";

const icon: Record<string, string> = {
  powerwall: "asset/powerwall.svg",
  solar: "asset/solar.svg",
};

export default class PowerwallDriver extends TeslemetryDriver {
  async onPairListDevices() {
    const products = await this.homey.app.getProducts();
    if (!products) {
      throw new Error(
        "Failed to load products. Please restart the pairing process",
      );
    }

    return (
      await Promise.all(
        Object.values(products.energySites)
          .filter(({ metadata }) => !!metadata.access)
          .map(async (site) => {
            const siteInfo = await site.api.getSiteInfo();
            if (!siteInfo) return null;

            const { deviceClass, capabilities } = getCapabilities(
              siteInfo.response,
            );
            if (!deviceClass) return null;

            return {
              name: site.name,
              data: {
                id: site.id,
              },
              capabilities: Array.from(capabilities),
              class: deviceClass,
              energy: {
                homeBattery: siteInfo.response.components.battery,
              },
              icon: icon[deviceClass],
            };
          }),
      )
    ).filter((device): device is NonNullable<typeof device> => device !== null);
  }
}

export type PowerwallDriverType = PowerwallDriver;
