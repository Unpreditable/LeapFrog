import { EditorView, PluginValue, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { ButtonHost } from "./buttons";

/**
 * Fades a button that covers the text cursor. It runs on every keystroke, so it does as little as it
 * can: nothing unless the host's look can hide text, and otherwise only inside the editor's own
 * measuring, once a frame, when the layout has just been worked out anyway.
 */
export function caretWatcher(hostFor: (dom: HTMLElement) => ButtonHost | null): ViewPlugin<PluginValue> {
  return ViewPlugin.fromClass(
    class implements PluginValue {
      private readonly onScroll = (): void => this.check();
      /** Found once: it lasts as long as this editor does, and this runs on every keystroke. */
      private host: ButtonHost | null = null;

      constructor(private readonly view: EditorView) {
        view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true });
      }

      update(update: ViewUpdate): void {
        if (update.selectionSet || update.docChanged || update.geometryChanged || update.focusChanged) this.check();
      }

      destroy(): void {
        this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
      }

      private check(): void {
        this.host ??= hostFor(this.view.dom);
        const host = this.host;
        if (!host?.canHideText()) return;
        this.view.requestMeasure({
          key: this,
          read: (view) => {
            // Not `hasFocus`: that goes false with the window in the background, and the fade would flicker.
            const caret = view.contentDOM.ownerDocument.activeElement === view.contentDOM ? view.coordsAtPos(view.state.selection.main.head) : null;
            return caret ? host.buttonsOver(caret) : [];
          },
          write: (covering) => host.setFaded(covering),
        });
      }
    },
  );
}
