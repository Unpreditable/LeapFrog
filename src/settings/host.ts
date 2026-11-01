import { Plugin } from "obsidian";
import { Behaviour, LeapFrogSettings, UserPreset } from "../settings";

/** What the settings need of the plugin. */
export interface SettingsHost extends Plugin {
  settings: LeapFrogSettings;
  presets: UserPreset[];
  behaviour: Behaviour;
  saveSettings(): Promise<void>;
  rightToLeft(): boolean;
}
