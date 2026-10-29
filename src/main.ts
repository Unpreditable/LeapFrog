import { MarkdownView, Plugin } from "obsidian";
import { addButtons, removeButtons } from "./button";
import { Edge } from "./edge";
import { t } from "./i18n/i18n";
import { jump } from "./jump";

export default class LeapFrogPlugin extends Plugin {
  async onload(): Promise<void> {
    for (const edge of ["top", "bottom"] as const) this.addJumpCommand(edge);

    this.app.workspace.onLayoutReady(() => this.addButtonsEverywhere());
    this.registerEvent(this.app.workspace.on("layout-change", () => this.addButtonsEverywhere()));
  }

  private addJumpCommand(edge: Edge): void {
    this.addCommand({
      id: `jump-to-${edge}`,
      name: t(`commands.${edge}`),
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return false;
        if (!checking) jump(view, edge);
        return true;
      },
    });
  }

  /** Every open note, in the main window and in any popout, gets its buttons. */
  private addButtonsEverywhere(): void {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) addButtons(leaf.view);
    });
  }

  onunload(): void {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) removeButtons(leaf.view.contentEl.doc);
    });
  }
}
