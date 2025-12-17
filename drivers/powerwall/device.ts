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
      return;
    }

    this.pollingCleanup = this.site.api.requestPolling();

    this.site.api.on("liveStatus", ({ response }) => {
      if (!response) return;
      const data = response as any;

      // Map Live Status fields
      this.setCapabilityValue("measure_battery", data.percentage_charged).catch(this.error);
      this.setCapabilityValue("measure_energy_left", data.energy_left).catch(this.error);
      this.setCapabilityValue("measure_power", data.battery_power).catch(this.error);
      this.setCapabilityValue("measure_power_solar", data.solar_power).catch(this.error);
      this.setCapabilityValue("measure_load_power", data.load_power).catch(this.error);
      this.setCapabilityValue("measure_home_usage", data.load_power).catch(this.error);
      this.setCapabilityValue("measure_power_grid", data.grid_power).catch(this.error);
      this.setCapabilityValue("measure_grid_services_power", data.grid_services_power).catch(this.error);
      this.setCapabilityValue("measure_generator_exported", data.generator_power).catch(this.error);
      this.setCapabilityValue("measure_island_status", String(data.island_status)).catch(this.error);
      this.setCapabilityValue("storm_watch_active", data.storm_mode_active).catch(this.error);
      
      // Grid Status: "Active" -> true, otherwise false? Or just check field presence/value
      this.setCapabilityValue("grid_status", data.grid_status === "Active").catch(this.error);
      this.setCapabilityValue("grid_services_active", data.grid_services_active).catch(this.error);

      // Calculated values
      if (typeof data.grid_power === 'number') {
        const exported = data.grid_power < 0 ? Math.abs(data.grid_power) : 0;
        this.setCapabilityValue("measure_grid_exported", exported).catch(this.error);
      }
    });

    this.site.api.on("siteInfo", ({ response }) => {
      if (!response) return;
      const data = response as any;

      this.setCapabilityValue("backup_reserve", data.backup_reserve_percent).catch(this.error);
      this.setCapabilityValue("measure_version", data.version).catch(this.error);
      this.setCapabilityValue("operation_mode", data.default_real_mode).catch(this.error);
      
      // Complex/Nested fields
      if (data.components) {
        this.setCapabilityValue("allow_export", data.components.customer_preferred_export_rule).catch(this.error);
        this.setCapabilityValue("allow_charging_from_grid", !data.components.disallow_charge_from_grid_with_solar_installed).catch(this.error);
      }

      if (data.user_settings) {
        this.setCapabilityValue("storm_watch", data.user_settings.storm_mode_enabled).catch(this.error);
      }

      this.setCapabilityValue("off_grid_reserve", data.off_grid_vehicle_charging_reserve_percent).catch(this.error);
      this.setCapabilityValue("backup_capable", data.backup_capable).catch(this.error);
      this.setCapabilityValue("grid_services_enabled", data.grid_services_enabled).catch(this.error);
      this.setCapabilityValue("measure_vpp_backup_reserve", data.vpp_backup_reserve_percent).catch(this.error);
    });

    // Register capability listeners
    this.registerCapabilityListener("backup_reserve", async (value) => {
      await this.site.api.setBackupReserve(value);
    });

    this.registerCapabilityListener("off_grid_reserve", async (value) => {
      await this.site.api.setOffGridVehicleChargingReserve(value);
    });

    this.registerCapabilityListener("allow_export", async (value) => {
      const disallowCharge = !this.getCapabilityValue("allow_charging_from_grid");
      await this.site.api.gridImportExport(value, disallowCharge);
    });

    this.registerCapabilityListener("allow_charging_from_grid", async (value) => {
      const exportRule = this.getCapabilityValue("allow_export");
      await this.site.api.gridImportExport(exportRule, !value);
    });

    this.registerCapabilityListener("operation_mode", async (value) => {
      await this.site.api.setOperationMode(value);
    });

    this.registerCapabilityListener("storm_watch", async (value) => {
      await this.site.api.setStormMode(value);
    });
  }

  async onAdded() {
    this.log("Device added");
  }

  async onUninit(): Promise<void> {
    if (this.pollingCleanup) this.pollingCleanup();
  }
}