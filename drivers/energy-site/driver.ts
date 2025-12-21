import type TeslemetryApp from "../../app.js";
import TeslemetryDriver from "../../lib/TeslemetryDriver.js";

const batteryCapabilities = [
  "measure_battery",
  "backup_reserve",
  "measure_energy_left",
  "measure_vpp_backup_reserve",
  "storm_watch",
  "storm_watch_active",
  "charge_from_grid",
  "measure_power",
  "allow_export",
  "operation_mode",
];
const solarCapabilities = [
  "measure_solar_generated",
  "measure_power_solar",
  "measure_generator_exported",
  "allow_export",
  "measure_power",
];
const gridCapabilities = [
  "grid_status",
  "measure_grid_exported",
  "measure_power_grid",
  "measure_grid_services_power",
  "measure_island_status",
];
const loadMeterCapabilities = ["measure_home_usage", "measure_load_power"];

export default class PowerwallDriver extends TeslemetryDriver {
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

    return await Promise.all(
      Object.values(products.energySites)
        .filter(({ metadata }) => !!metadata.access)
        .map(async (site) => {
          const { response: siteInfo } = await site.api.getSiteInfo();
          const capabilities = new Set();
          let deviceClass = "other";

          if (siteInfo.components.solar) {
            deviceClass = "solar";
            capabilities.add(solarCapabilities);
          }
          if (siteInfo.components.battery) {
            deviceClass = "battery";
            capabilities.add(batteryCapabilities);
          }
          if (siteInfo.components.grid) {
            capabilities.add(gridCapabilities);
          }
          if (siteInfo.components.load_meter) {
            capabilities.add(loadMeterCapabilities);
          }

          return {
            name: site.name,
            data: {
              id: site.id,
            },
            capabilities: Array.from(capabilities),
            class: deviceClass,
            energy: {
              homeBattery: siteInfo.components.battery,
            },
          };
        }),
    );
  }
}

export type PowerwallDriverType = PowerwallDriver;
