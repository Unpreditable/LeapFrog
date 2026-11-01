import { EventRef, MarkdownView, Plugin } from "obsidian";
import { ButtonHost } from "./buttons";
import { caretWatcher } from "./caret-watch";
import { Edge } from "./edge";
import { t } from "./i18n/i18n";
import { canJump, jump, noteScroller, placeIn } from "./jump";
import { JumpBack } from "./jump-back";
import { Behaviour, DEFAULT_BEHAVIOUR, DEFAULT_SETTINGS, LeapFrogSettings, loadBehaviour, loadData, UserPreset } from "./settings";
import { LeapFrogSettingTab } from "./settings/settings-tab";

export default class LeapFrogPlugin extends Plugin {
  settings: LeapFrogSettings = DEFAULT_SETTINGS;
  presets: UserPreset[] = [];
  behaviour: Behaviour = DEFAULT_BEHAVIOUR;
  private readonly hosts = new Map<MarkdownView, ButtonHost>();
  private readonly backs = new Map<MarkdownView, JumpBack>();

  async onload(): Promise<void> {
    const raw: unknown = await this.loadData();
    ({ settings: this.settings, presets: this.presets } = loadData(raw));
    this.behaviour = loadBehaviour(raw);
    for (const edge of ["top", "bottom"] as const) this.addJumpCommand(edge);
    this.addSettingTab(new LeapFrogSettingTab(this.app, this));
    this.registerEditorExtension(caretWatcher((dom) => this.hostToFade(dom)));

    this.app.workspace.onLayoutReady(() => this.syncHosts());
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.syncHosts();
      this.checkBacks();
    }));
    this.registerEvent(this.app.workspace.on("file-open", () => this.checkBacks()));
    // Side Auto follows Right-to-left, which Obsidian reports as a change to the vault's config.
    const vault = this.app.vault as unknown as { on(name: "config-changed", callback: (key: string) => void): EventRef };
    this.registerEvent(vault.on("config-changed", (key) => {
      if (key === "rightToLeft") this.redrawAll();
    }));
  }

  async saveSettings(): Promise<void> {
    await this.saveData({ ...this.settings, presets: this.presets, behaviour: this.behaviour });
    this.redrawAll();
    if (!this.behaviour.jumpBack) for (const back of this.backs.values()) back.clear();
  }

  /** Obsidian's Right-to-left editor setting, one switch for the whole vault. */
  rightToLeft(): boolean {
    return (this.app.vault as unknown as { getConfig(key: string): unknown }).getConfig("rightToLeft") === true;
  }

  redrawAll(): void {
    for (const host of this.hosts.values()) host.redraw();
  }

  private addJumpCommand(edge: Edge): void {
    this.addCommand({
      id: `jump-to-${edge}`,
      name: t(`commands.${edge}`),
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return false;
        if (checking) return true;
        // A hotkey always goes to the end, so what it does never depends on what was clicked before.
        this.backs.get(view)?.clear();
        jump(view, edge, this.behaviour.scroll);
        return true;
      },
    });
  }

  /** The buttons over the editor with this element. */
  private hostToFade(dom: HTMLElement): ButtonHost | null {
    for (const [view, host] of this.hosts) if (view.contentEl.contains(dom)) return host;
    return null;
  }

  /** A click with nowhere to go does nothing at all. A hotkey still moves the cursor. */
  private clicked(view: MarkdownView, edge: Edge): void {
    const scroller = noteScroller(view);
    if (!scroller) return;
    const file = view.file?.path;
    const mode = view.getMode();
    this.backs.get(view)?.click(edge, {
      watched: scroller,
      enabled: this.behaviour.jumpBack,
      canGo: () => canJump(view, edge),
      go: () => jump(view, edge, this.behaviour.scroll),
      place: () => placeIn(view, () => this.behaviour.scroll, edge === "top" ? "bottom" : "top"),
      stillHere: () => view.file?.path === file && view.getMode() === mode,
    });
  }

  private checkBacks(): void {
    for (const back of this.backs.values()) back.check();
  }

  /** Every open note, in the main window and in any popout, has its buttons; closed ones do not. */
  private syncHosts(): void {
    const open = new Set<MarkdownView>();
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!(leaf.view instanceof MarkdownView)) return;
      const view = leaf.view;
      open.add(view);
      if (!this.hosts.has(view)) {
        const host = new ButtonHost(view.contentEl, () => this.settings, (edge) => this.clicked(view, edge), {
          rightToLeft: () => this.rightToLeft(),
        });
        this.hosts.set(view, host);
        this.backs.set(view, new JumpBack((edge) => host.setBack(edge)));
      }
    });
    for (const [view, host] of this.hosts) {
      if (open.has(view)) continue;
      this.backs.get(view)?.clear();
      this.backs.delete(view);
      host.destroy();
      this.hosts.delete(view);
    }
  }

  onunload(): void {
    for (const back of this.backs.values()) back.clear();
    this.backs.clear();
    for (const host of this.hosts.values()) host.destroy();
    this.hosts.clear();
  }
}
