import Homey from "homey";
import type TeslemetryApp from "../app.js";

export default class TeslemetryDevice extends Homey.Device {
  declare homey: Homey.Device["homey"] & {
    app: TeslemetryApp;
  };

  /**
   * Safely updates a capability value if its supported.
   * @param capability The capability to update.
   * @param value The value from the API
   */
  public async update(capability: string, value: any): Promise<void> {
    // Check if capability is supported
    if (!this.getCapabilities().includes(capability)) {
      this.log(`Capability ${capability} is not supported`);
      return;
    }
    // Evaluate value if required
    if (typeof value === "function") value = value();
    // Check if value is undefined
    if (value === undefined) {
      this.log(`Capability ${capability} value is undefined`);
      return;
    }
    // Set the capability value
    //this.log(`Setting capability ${capability} to ${value}`);
    return this.setCapabilityValue(capability, value).catch(this.error);
  }

  protected handleApiError = (error: any): never => {
    console.warn(error);
    if (error.status === 401 || error.status === "401") {
      const msg = this.homey.__("error.401");
      this.setUnavailable(msg).catch(this.error);
      throw new Error(msg);
    } else if (error.status === 402 || error.status === "402") {
      const msg = this.homey.__("error.402");
      this.setUnavailable(msg).catch(this.error);
      throw new Error(msg);
    }

    if (error.error && typeof error.error === "string") {
      const key = `error.${error.error}`;
      const translated = this.homey.__(key);
      if (translated && translated !== key) {
        throw new Error(translated);
      }
    }

    throw error;
  };
}
