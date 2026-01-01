import { EnergyDetails } from "@teslemetry/api";
import TeslemetryDevice from "../../lib/TeslemetryDevice.js";

const gridStatusMap = new Map<any, boolean>([
  ["Active", false],
  ["Inactive", true],
]);

const islandStatusMap = new Map<any, boolean>([
  ["off_grid_intentional", true],
  ["off_grid_unintentional", true],
  ["on_grid", false],
]);

export default class GatewayDevice extends TeslemetryDevice {
  site!: EnergyDetails;
  pollingCleanup!: Array<() => void>;

  async onInit() {
    try {
      const site = this.homey.app.products?.energySites?.[this.getData().id];
      if (!site) throw new Error("No site found");
      this.site = site;
    } catch (e) {
      this.log("Failed to initialize Gateway device");
      this.error(e);
      return;
    }

    this.pollingCleanup = [this.site.api.requestPolling("liveStatus")];

    this.site.api.on("liveStatus", (liveStatus) => {
      const data = liveStatus?.response;
      if (!data) return;

      this.update("measure_power", data.grid_power);
      this.update("measure_power_load", data.load_power);
      this.update("alarm_off_grid", gridStatusMap.get(data.grid_status));
      this.update(
        "alarm_island_status",
        islandStatusMap.get(data.island_status),
      );
    });
  }

  async onUninit(): Promise<void> {
    this.pollingCleanup?.forEach((stop) => stop());
  }
}
