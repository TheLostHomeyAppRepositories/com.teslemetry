import Homey from "homey";
import { EnergyDetails, TeslemetryEnergyApi } from "@teslemetry/api";
import TeslemetryApp from "../../app.js";

export default class PowerwallDevice extends Homey.Device {
  site!: EnergyDetails;
  pollingCleanup!: () => void;

  async onInit() {
    try {
      const app = this.homey.app as TeslemetryApp;
      const site = app.products?.energySites?.[this.getData().id];
      if (!site) throw new Error("No site found");
      this.site = site;
    } catch (e) {
      this.log("Failed to initialize Powerwall device");
      this.error(e);
    }

    this.pollingCleanup = this.site.api.requestPolling();

    this.site.api.on("liveStatus", ({ response }) => {
      if (response?.percentage_charged !== undefined) {
        this.setCapabilityValue("measure_battery", response.percentage_charged);
      }
    });

    this.site.api.on("siteInfo", ({ response }) => {
      if (response?.backup_reserve_percent !== undefined) {
        this.setCapabilityValue("measure_power", response.site_name);
      }
    });
  }

  async onAdded() {
    this.log("Device added");
  }

  async onUninit(): Promise<void> {
    this.pollingCleanup();
  }
}
