import { Setting, SettingPage } from "obsidian";
import { t } from "../i18n/i18n";
import { Behaviour, ScrollStyle } from "../settings";
import { SettingsHost } from "./host";
import { renderPills } from "./pills";

/** What a jump does: how the note moves. */
export class BehaviourPage extends SettingPage {
  constructor(
    private readonly host: SettingsHost,
    private readonly onChanged: () => void,
  ) {
    super();
    this.title = t("settings.pages.behaviour");
  }

  /** The main page's summary of this page is read again once the user leaves it. */
  hide(): void {
    super.hide();
    this.onChanged();
  }

  display(): void {
    this.containerEl.empty();
    this.containerEl.addClass("leapfrog-page");
    const scroll = new Setting(this.containerEl).setName(t("settings.scroll.name"));
    renderPills<ScrollStyle>(
      scroll.controlEl,
      (["instant", "quick", "smooth"] as const).map((value) => ({ value, name: t(`settings.scroll.${value}`) })),
      this.host.behaviour.scroll,
      (value) => void this.change("scroll", value),
    );

    new Setting(this.containerEl)
      .setName(t("settings.jumpBack.name"))
      .setDesc(t("settings.jumpBack.desc"))
      .addToggle((toggle) => toggle.setValue(this.host.behaviour.jumpBack).onChange((value) => void this.change("jumpBack", value)));
  }

  private async change<K extends keyof Behaviour>(key: K, value: Behaviour[K]): Promise<void> {
    this.host.behaviour = { ...this.host.behaviour, [key]: value };
    await this.host.saveSettings();
    this.display();
  }
}
