import Homey from "homey";
import type TeslemetryApp from "../../app.js";
import { Signals, Teslemetry, VehicleDetails } from "@teslemetry/api";

export default class VehicleDevice extends Homey.Device {
  private vehicle!: VehicleDetails;

  async onInit() {
    try {
      const app = this.homey.app as TeslemetryApp;
      const vehicle = app.products?.vehicles?.[this.getData().vin];
      if (!vehicle) throw new Error("No vehicle found");
      this.vehicle = vehicle;
    } catch (e) {
      this.log("Failed to initialize Vehicle device");
      this.error(e);
      return;
    }

    // --- Signals (Incoming Data) ---

    // Battery & Range
    this.vehicle.sse.onSignal("BatteryLevel", (value) =>
      this.setCapabilityValue("measure_battery", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("BatteryRange", (value) =>
      this.setCapabilityValue("measure_range", value).catch(this.error),
    );

    // Charging
    this.vehicle.sse.onSignal("ChargeState", (value) =>
      // Map 'Charging', 'Stopped', 'Disconnected' etc if needed, or if boolean
      // Assuming boolean or string. If string, we might need a map.
      // For now, mapping 'Charging' to true for onoff.charge
      this.setCapabilityValue("onoff.charge", value === "Charging").catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("ChargeEnergyAdded", (value) =>
      this.setCapabilityValue("meter_power", value).catch(this.error),
    );
    this.vehicle.sse.onSignal(
      "ChargerPower",
      (value) =>
        this.setCapabilityValue("measure_power", value * 1000).catch(
          this.error,
        ), // kW to W?
    );
    this.vehicle.sse.onSignal("ChargerVoltage", (value) =>
      this.setCapabilityValue("measure_voltage", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("ChargerActualCurrent", (value) =>
      this.setCapabilityValue("measure_current", value).catch(this.error),
    );

    // Lock & Sentry & Security
    this.vehicle.sse.onSignal("Locked", (value) =>
      this.setCapabilityValue("locked", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("SentryMode", (value) =>
      this.setCapabilityValue("sentry_mode", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("ValetMode", (value) =>
      this.setCapabilityValue("valet_mode", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("ChargePortLatch", (value) =>
      // 'Engaged' -> Locked?
      this.setCapabilityValue("locked.charge_cable", value === "Engaged").catch(
        this.error,
      ),
    );

    // Climate
    this.vehicle.sse.onSignal("HvacACEnabled", (value) =>
      this.setCapabilityValue("thermostat_mode", value ? "auto" : "off").catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("InsideTemp", (value) =>
      this.setCapabilityValue("measure_temperature", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("OutsideTemp", (value) =>
      this.setCapabilityValue("measure_temperature.outside", value).catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("DefrostMode", (value) =>
      this.setCapabilityValue("defrost_mode", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("SteeringWheelHeater", (value) =>
      this.setCapabilityValue("steering_wheel_heater", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("SeatHeaterLeft", (value) =>
      this.setCapabilityValue("seat_heater_front_left", value > 0).catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("SeatHeaterRight", (value) =>
      this.setCapabilityValue("seat_heater_front_right", value > 0).catch(
        this.error,
      ),
    );

    // Doors & Windows (Assuming Signal names)
    this.vehicle.sse.onSignal("DoorFrontLeft", (value) =>
      this.setCapabilityValue("alarm_contact.door_front_left", value).catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("DoorFrontRight", (value) =>
      this.setCapabilityValue("alarm_contact.door_front_right", value).catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("DoorRearLeft", (value) =>
      this.setCapabilityValue("alarm_contact.door_rear_left", value).catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("DoorRearRight", (value) =>
      this.setCapabilityValue("alarm_contact.door_rear_right", value).catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("ChargePortDoorOpen", (value) =>
      this.setCapabilityValue("charge_port_door", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("FrontTrunk", (value) =>
      this.setCapabilityValue("frunk", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("RearTrunk", (value) =>
      this.setCapabilityValue("trunk", value).catch(this.error),
    );

    // --- Capability Listeners (Actions) ---

    // Locked
    this.registerCapabilityListener("locked", async (value) => {
      value
        ? await this.vehicle.api.lockDoors()
        : await this.vehicle.api.unlockDoors();
    });

    // Climate
    this.registerCapabilityListener("thermostat_mode", async (value) => {
      value === "auto"
        ? await this.vehicle.api.startAutoConditioning()
        : await this.vehicle.api.stopAutoConditioning();
    });
    this.registerCapabilityListener("defrost_mode", async (value) => {
      await this.vehicle.api.setPreconditioningMax(value, true);
    });
    this.registerCapabilityListener("steering_wheel_heater", async (value) => {
      await this.vehicle.api.setSteeringWheelHeater(value);
    });
    this.registerCapabilityListener("seat_heater_front_left", async (value) => {
      await this.vehicle.api.remoteSeatHeaterRequest(0, value ? 3 : 0);
    });
    this.registerCapabilityListener(
      "seat_heater_front_right",
      async (value) => {
        await this.vehicle.api.remoteSeatHeaterRequest(1, value ? 3 : 0);
      },
    );
    // Add rear heaters if API supports and IDs are known

    // Charge
    this.registerCapabilityListener("onoff.charge", async (value) => {
      value
        ? await this.vehicle.api.startCharging()
        : await this.vehicle.api.stopCharging();
    });
    this.registerCapabilityListener("charge_port_door", async (value) => {
      value
        ? await this.vehicle.api.chargePortDoorOpen()
        : await this.vehicle.api.chargePortDoorClose();
    });
    this.registerCapabilityListener("locked.charge_cable", async (value) => {
      // Only unlock is usually supported directly via simple toggle if locked
      if (!value) await this.vehicle.api.chargePortDoorOpen(); // Often unlocks port
    });

    // Sentry & Valet
    this.registerCapabilityListener("sentry_mode", async (value) => {
      await this.vehicle.api.setSentryMode(value);
    });
    this.registerCapabilityListener("valet_mode", async (value) => {
      await this.vehicle.api.setValetMode(value);
    });

    // Doors/Frunk/Trunk
    this.registerCapabilityListener("frunk", async (value) => {
      if (value) await this.vehicle.api.actuateTrunk("front");
      // Reset toggle as it's an action
      setTimeout(
        () => this.setCapabilityValue("frunk", false).catch(this.error),
        2000,
      );
    });
    this.registerCapabilityListener("trunk", async (value) => {
      await this.vehicle.api.actuateTrunk("rear");
    });
    this.registerCapabilityListener("windowcoverings_state", async (value) => {
      // value is 'up', 'down', 'idle'
      const lat = 0; // Replace with actual location if available
      const lon = 0;
      if (value === "up")
        await this.vehicle.api.windowControl("close", lat, lon);
      if (value === "down")
        await this.vehicle.api.windowControl("vent", lat, lon);
    });

    // Buttons
    this.registerCapabilityListener("button.flash_lights", async () => {
      await this.vehicle.api.flashLights();
    });
    this.registerCapabilityListener("button.honk_horn", async () => {
      await this.vehicle.api.honkHorn();
    });
    this.registerCapabilityListener("button.keyless_driving", async () => {
      await this.vehicle.api.remoteStart();
    });
    this.registerCapabilityListener("button.homelink", async () => {
      // Needs lat/lon usually
      const lat = 0;
      const lon = 0;
      await this.vehicle.api.triggerHomelink(lat, lon);
    });
    this.registerCapabilityListener("button.wake_up", async () => {
      await this.vehicle.api.wakeUp();
    });
  }

  async onUninit() {
    this.vehicle.sse.data.removeAllListeners();
  }
}
