import Homey from "homey";
import type TeslemetryApp from "../app.js";

export default class TeslemetryDevice extends Homey.Device {
  declare homey: Homey.Device["homey"] & {
    app: TeslemetryApp;
  };
}
