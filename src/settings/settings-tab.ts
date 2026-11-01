import { App, PluginSettingTab, Setting, SettingDefinitionItem, SettingGroup } from "obsidian";
import { t } from "../i18n/i18n";
import { BehaviourPage } from "./behaviour-page";
import { renderChips } from "./chips";
import { SettingsHost } from "./host";
import { LookPage } from "./look-page";
import { PlacementPage } from "./placement-page";
import { SampleNote } from "./preview";

/**
 * The main page: the preset chips, a row for each page, then the sample note. Every row here is
 * drawn by hand, so it follows every change: Obsidian does not redraw a declarative row while its own
 * control has focus.
 */
export class LeapFrogSettingTab extends PluginSettingTab {
  private readonly sample: SampleNote;

  constructor(
    app: App,
    private readonly host: SettingsHost,
  ) {
    super(app, host);
    this.containerEl.addClass("leapfrog-tab");
    this.sample = new SampleNote(this.containerEl, () => this.host.settings, () => this.host.behaviour, () => this.host.rightToLeft());
  }

  hide(): void {
    this.sample.destroy();
    super.hide();
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        cls: "leapfrog-presets",
        heading: t("settings.presets.heading"),
        items: [
          {
            name: t("settings.presets.heading"),
            render: (setting: Setting) => {
              setting.settingEl.addClass("leapfrog-wide-row");
              renderChips(setting.controlEl, this.host, () => this.update());
            },
          },
        ],
      },
      {
        type: "group",
        cls: "leapfrog-sections",
        items: [
          {
            type: "page",
            name: t("settings.pages.placement"),
            displayValue: () => `${t(`settings.buttons.${this.host.settings.buttons}`)} · ${t(`settings.side.${this.host.settings.side}`)}`,
            page: () => new PlacementPage(this.host, () => this.update()),
          },
          {
            type: "page",
            name: t("settings.pages.look"),
            displayValue: () => `${t(`settings.style.${this.host.settings.style}`)} · ${t(`settings.visibility.${this.host.settings.visibility}`)}`,
            page: () => new LookPage(this.host, () => this.update()),
          },
          {
            type: "page",
            name: t("settings.pages.behaviour"),
            displayValue: () => t(`settings.scroll.${this.host.behaviour.scroll}`),
            page: () => new BehaviourPage(this.host, () => this.update()),
          },
        ],
      },
      {
        type: "group",
        cls: "leapfrog-sample-group",
        items: [
          {
            name: t("settings.preview.name"),
            render: (setting: Setting, group: SettingGroup) => this.sample.render(setting, group),
          },
        ],
      },
    ];
  }
}
