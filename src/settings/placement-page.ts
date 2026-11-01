import { Setting, SettingPage } from "obsidian";
import { drawArrow } from "../arrows";
import { t } from "../i18n/i18n";
import { ArrowStyle, Buttons, Look, Side, withChange } from "../settings";
import { SettingsHost } from "./host";
import { renderPills } from "./pills";
import { Handle, keyOf, PositionChange, renderPositionSlider } from "./position-slider";

/** The Buttons pills are pictures of the buttons: no words to translate on them. */
function drawButtons(choice: Buttons, arrow: ArrowStyle): (el: HTMLElement) => void {
  return (el) => {
    const face = el.createSpan({ cls: `leapfrog-pill-arrows is-${choice}` });
    if (choice !== "down") drawArrow(face.createSpan(), arrow, "top");
    if (choice !== "up") drawArrow(face.createSpan(), arrow, "bottom");
  };
}

/** Where the buttons sit: which ones, at which stops, on which side. */
export class PlacementPage extends SettingPage {
  /** The handle to focus once the page is drawn again, so ← and → can be pressed in a row. */
  private focus: Handle | null = null;

  constructor(
    private readonly host: SettingsHost,
    private readonly onChanged: () => void,
  ) {
    super();
    this.title = t("settings.pages.placement");
  }

  /** The main page's summary of this page is read again once the user leaves it. */
  hide(): void {
    super.hide();
    this.onChanged();
  }

  display(): void {
    this.containerEl.empty();
    this.containerEl.addClass("leapfrog-page");
    const s = this.host.settings;

    const buttons = new Setting(this.containerEl).setName(t("settings.buttons.name"));
    renderPills<Buttons>(
      buttons.controlEl,
      (["stacked", "row", "up", "down"] as const).map((value) => ({ value, name: t(`settings.buttons.${value}`), draw: drawButtons(value, s.arrow) })),
      s.buttons,
      (value) => void this.change("buttons", value),
    );

    // Always a line, whatever the choice, so switching Buttons does not shift the page.
    const position = new Setting(this.containerEl)
      .setName(t("settings.position.name"))
      .setDesc(t(s.buttons === "row" ? "settings.position.descRow" : "settings.position.desc"));
    const focus = this.focus;
    this.focus = null;
    renderPositionSlider(position.controlEl, s, (change) => void this.moveHandle(change), focus);

    const side = new Setting(this.containerEl).setName(t("settings.side.name")).setDesc(this.sideDescription(s.side));
    renderPills<Side>(
      side.controlEl,
      (["auto", "left", "right"] as const).map((value) => ({ value, name: t(`settings.side.${value}`) })),
      s.side,
      (value) => void this.change("side", value),
    );
  }

  /** Auto's names the setting it follows, as a link to its tab. Opening a tab has no public API, so without it the words stay plain. */
  private sideDescription(side: Side): string | DocumentFragment {
    const text = t(`settings.side.desc.${side}`);
    const [before, label, after] = text.split(/<\/?link>/);
    const settings = (this.host.app as unknown as { setting?: { openTabById?(id: string): unknown } }).setting;
    if (label === undefined || !settings?.openTabById) return text.replace(/<\/?link>/g, "");
    return createFragment((el) => {
      el.appendText(before);
      el.createEl("a", { text: label, href: "#" }).addEventListener("click", (event) => {
        event.preventDefault();
        settings.openTabById?.("editor");
      });
      el.appendText(after ?? "");
    });
  }

  private async change<K extends keyof Look>(key: K, value: Look[K], redraw = true): Promise<void> {
    this.host.settings = withChange(this.host.settings, key, value);
    await this.host.saveSettings();
    if (redraw) this.display();
  }

  /** Mid-drag the page is not drawn again, which would drop the handle from under the pointer. */
  private async moveHandle({ handle, stop, done }: PositionChange): Promise<void> {
    this.host.settings = withChange(this.host.settings, keyOf(handle, this.host.settings.buttons), stop);
    await this.host.saveSettings();
    if (!done) return;
    this.focus = handle;
    this.display();
  }
}
