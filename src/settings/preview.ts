import { Setting, SettingGroup } from "obsidian";
import { ButtonHost } from "../buttons";
import { Edge, scrollForEnd } from "../edge";
import { t } from "../i18n/i18n";
import { JumpBack } from "../jump-back";
import { isAlreadyAt, moveScroller } from "../scroll";
import { Behaviour, LeapFrogSettings } from "../settings";
import frogImage from "./frog.webp";

/** The article's sections, in order, each with a heading and two paragraphs in the locale files. */
const SECTIONS = ["jump", "landing", "contest", "game"] as const;

/** The note's height in px. The most is less than the article, so its buttons always have somewhere to jump. */
const HEIGHT = { min: 500, max: 800 } as const;

/**
 * The sample note under the main page's rows, with the buttons in their real places. It is a row of
 * the tab, so picking a chip draws it again with the new settings. It takes the room the tab has
 * left, so the tab itself does not scroll as well.
 */
export class SampleNote {
  private drawn: { host: ButtonHost; back: JumpBack; observer: ResizeObserver } | null = null;

  constructor(
    private readonly tabEl: HTMLElement,
    private readonly settings: () => LeapFrogSettings,
    private readonly behaviour: () => Behaviour,
    private readonly rightToLeft: () => boolean,
  ) {}

  /** Draws the row; the returned function takes down what it drew. */
  render(setting: Setting, group: SettingGroup): () => void {
    this.destroy();
    group.setHeading(
      createFragment((el) => {
        el.appendText(`${t("settings.preview.heading")} `);
        el.createSpan({ cls: "leapfrog-sample-intro", text: t("settings.preview.intro") });
      }),
    );
    setting.settingEl.addClass("leapfrog-wide-row");
    const frame = setting.controlEl.createDiv({ cls: "leapfrog-sample" });
    const text = frame.createDiv({ cls: "leapfrog-sample-text markdown-rendered" });
    text.createEl("h1", { text: t("settings.preview.title") });
    const figure = text.createEl("figure", { cls: "leapfrog-sample-figure" });
    figure.createEl("img", { attr: { src: frogImage, alt: "" } });
    figure.createEl("figcaption", { text: t("settings.preview.caption") });
    for (const section of SECTIONS) {
      text.createEl("h2", { text: t(`settings.preview.sections.${section}.heading`) });
      text.createEl("p", { text: t(`settings.preview.sections.${section}.first`) });
      text.createEl("p", { text: t(`settings.preview.sections.${section}.second`) });
    }
    const end = (): number => text.scrollHeight - (parseFloat(frame.win.getComputedStyle(text).paddingBottom) || 0);
    const onJump = (edge: Edge): void => {
      const target = (): number => (edge === "top" ? 0 : scrollForEnd(end(), text.clientHeight));
      back.click(edge, {
        watched: text,
        enabled: this.behaviour().jumpBack,
        canGo: () => !isAlreadyAt(text, target, edge),
        go: () => moveScroller(text, target, this.behaviour().scroll, edge),
        place: () => {
          const top = text.scrollTop;
          return () => moveScroller(text, () => top, this.behaviour().scroll, edge === "top" ? "bottom" : "top");
        },
        stillHere: () => true,
      });
    };
    const host = new ButtonHost(frame, this.settings, onJump, {
      measureStatusBar: false,
      rightToLeft: this.rightToLeft,
    });
    const back = new JumpBack((edge) => host.setBack(edge));
    // The tab's own window's observer, as for the buttons.
    const Observer = (this.tabEl.win as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver;
    const observer = new Observer(() => this.fit(frame));
    observer.observe(this.tabEl);
    const drawn = { host, back, observer };
    this.drawn = drawn;
    return () => {
      if (this.drawn === drawn) this.destroy();
    };
  }

  /** For the tab closing, which may not take the row down itself. */
  destroy(): void {
    this.drawn?.observer.disconnect();
    this.drawn?.back.clear();
    this.drawn?.host.destroy();
    this.drawn = null;
  }

  /**
   * At its smallest, whatever the tab still has spare below its last row is what the note can grow
   * by. Measured from that row: a tab's scrollHeight is never less than its clientHeight, so comparing
   * the two would never find any room.
   */
  private fit(frame: HTMLElement): void {
    frame.setCssProps({ "--leapfrog-sample-height": `${HEIGHT.min}px` });
    const bottom = frame.getBoundingClientRect().bottom - this.tabEl.getBoundingClientRect().top + this.tabEl.scrollTop;
    const padding = parseFloat(this.tabEl.win.getComputedStyle(this.tabEl).paddingBottom) || 0;
    const spare = Math.max(0, Math.floor(this.tabEl.clientHeight - padding - bottom));
    frame.setCssProps({ "--leapfrog-sample-height": `${Math.min(HEIGHT.max, HEIGHT.min + spare)}px` });
  }
}
