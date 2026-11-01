import { Setting, SettingPage } from "obsidian";
import { drawArrow } from "../arrows";
import { ButtonHost, isTouch } from "../buttons";
import { t } from "../i18n/i18n";
import { ARROW_STYLES, ArrowStyle, ButtonStyle, HEIGHT_RANGE, HoverShows, Look, ROUNDNESS_RANGE, Visibility, WIDTH_RANGE, withChange } from "../settings";
import { SettingsHost } from "./host";
import { renderPills } from "./pills";

/**
 * How the buttons look, whatever their placement: a preview of each Buttons choice, then the rows
 * that shape them.
 */
export class LookPage extends SettingPage {
  private previews: ButtonHost[] = [];

  constructor(
    private readonly host: SettingsHost,
    private readonly onChanged: () => void,
  ) {
    super();
    this.title = t("settings.pages.look");
  }

  hide(): void {
    this.dropPreviews();
    super.hide();
    this.onChanged();
  }

  display(): void {
    this.dropPreviews();
    this.containerEl.empty();
    this.containerEl.addClass("leapfrog-page");
    const s = this.host.settings;

    // Every Buttons choice side by side, whatever the Placement page says: this page is the look only.
    this.containerEl.createDiv({ cls: "leapfrog-look-heading", text: t("settings.look.preview") });
    const previews = this.containerEl.createDiv({ cls: "leapfrog-look-previews" });
    for (const look of ["stacked", "row", "up", "down"] as const) {
      const tile = previews.createDiv({ cls: "leapfrog-look-preview" });
      tile.createDiv({ cls: "leapfrog-look-preview-name", text: t(`settings.buttons.${look}`) });
      const el = tile.createDiv({ cls: "leapfrog-look-preview-buttons" });
      this.previews.push(new ButtonHost(el, () => this.host.settings, () => {}, { placed: false, look }));
    }
    this.containerEl.createDiv({ cls: "leapfrog-look-note", text: t("settings.look.scale") });

    this.slider(t("settings.width.name"), "width", WIDTH_RANGE);
    this.slider(t("settings.height.name"), "height", HEIGHT_RANGE, t("settings.height.desc"), (n) => (n === 0 ? t("settings.height.auto") : `${n}%`));
    this.slider(t("settings.roundness.name"), "roundness", ROUNDNESS_RANGE);

    const style = new Setting(this.containerEl).setName(t("settings.style.name"));
    renderPills<ButtonStyle>(
      style.controlEl,
      (["outline", "background", "both", "none"] as const).map((value) => ({ value, name: t(`settings.style.${value}`) })),
      s.style,
      (value) => void this.change("style", value),
    );

    const arrow = new Setting(this.containerEl).setName(t("settings.arrow.name"));
    renderPills<ArrowStyle>(
      arrow.controlEl,
      ARROW_STYLES.map((value) => ({
        value,
        name: t(`settings.arrow.${value}`),
        draw: (el) => drawArrow(el.createSpan({ cls: "leapfrog-pill-arrows" }).createSpan(), value, "top"),
      })),
      s.arrow,
      (value) => void this.change("arrow", value),
    );

    const visibility = new Setting(this.containerEl).setName(t("settings.visibility.name"));
    // Only where there is hover to try: on touch the previews draw as Arrow + Shape.
    if (s.visibility !== "always" && !isTouch(this.containerEl)) visibility.setDesc(t("settings.visibility.desc"));
    renderPills<Visibility>(
      visibility.controlEl,
      (["always", "shape", "hover"] as const).map((value) => ({ value, name: t(`settings.visibility.${value}`) })),
      s.visibility,
      (value) => void this.change("visibility", value),
    );

    if (s.visibility !== "always") {
      const hover = new Setting(this.containerEl).setName(t("settings.hoverShows.name"));
      renderPills<HoverShows>(
        hover.controlEl,
        (["one", "both"] as const).map((value) => ({ value, name: t(`settings.hoverShows.${value}`) })),
        s.hoverShows,
        (value) => void this.change("hoverShows", value),
      );
    }
  }

  /**
   * A slider whose moves redraw the previews while it is still held, without drawing the page again
   * under the pointer. The value is saved once it is let go.
   */
  private slider(
    name: string,
    key: "width" | "height" | "roundness",
    range: { min: number; max: number; step: number },
    desc?: string,
    format?: (value: number) => string,
  ): void {
    const row = new Setting(this.containerEl).setName(name).setClass("leapfrog-wide-slider");
    if (desc) row.setDesc(desc);
    row.addSlider((slider) => {
      slider
        .setLimits(range.min, range.max, range.step)
        .setValue(this.host.settings[key])
        .onChange((value) => void this.change(key, value, false));
      if (format) slider.setDisplayFormat(format);
      slider.sliderEl.addEventListener("input", () => {
        this.host.settings = withChange(this.host.settings, key, Number(slider.sliderEl.value));
        for (const preview of this.previews) preview.redraw();
      });
    });
  }

  private async change<K extends keyof Look>(key: K, value: Look[K], redraw = true): Promise<void> {
    this.host.settings = withChange(this.host.settings, key, value);
    await this.host.saveSettings();
    if (redraw) this.display();
    else for (const preview of this.previews) preview.redraw();
  }

  private dropPreviews(): void {
    for (const preview of this.previews) preview.destroy();
    this.previews = [];
  }
}
