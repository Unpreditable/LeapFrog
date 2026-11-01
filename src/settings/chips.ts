import { App, Modal, setIcon } from "obsidian";
import { t } from "../i18n/i18n";
import { applyPreset, BUILT_IN_IDS, deletePreset, nameError, NAME_MAX, savePreset } from "../settings";
import { SettingsHost } from "./host";

/**
 * The presets as chips: the built-in ones, then the user's own in the order they were saved, then
 * Save. The chip the settings match is marked; only the user's own can be deleted.
 */
export function renderChips(parent: HTMLElement, host: SettingsHost, onChanged: () => void): void {
  const chips = parent.createDiv({ cls: "leapfrog-chips" });
  const commit = async (): Promise<void> => {
    await host.saveSettings();
    onChanged();
  };

  const add = (key: string, name: string, onDelete?: () => void): void => {
    const chip = chips.createDiv({ cls: "leapfrog-chip", attr: { "data-preset": key } });
    chip.toggleClass("is-active", host.settings.preset === key);
    const apply = chip.createEl("button", { cls: "leapfrog-chip-name", text: name, attr: { "aria-pressed": String(host.settings.preset === key) } });
    apply.addEventListener("click", () => {
      host.settings = applyPreset(key, host.presets);
      void commit();
    });
    if (!onDelete) return;
    const remove = chip.createEl("button", { cls: "leapfrog-chip-delete clickable-icon", attr: { "aria-label": t("settings.presets.delete") } });
    setIcon(remove, "trash-2");
    remove.addEventListener("click", onDelete);
  };

  for (const id of BUILT_IN_IDS) add(id, t(`settings.presets.names.${id}`));
  for (const preset of host.presets) {
    add(`user:${preset.id}`, preset.name, () => {
      ({ settings: host.settings, presets: host.presets } = deletePreset(host.settings, preset.id, host.presets));
      void commit();
    });
  }

  const save = chips.createEl("button", { cls: "leapfrog-chip leapfrog-chip-save" });
  setIcon(save.createSpan({ cls: "leapfrog-chip-icon" }), "plus");
  save.createSpan({ text: t("settings.presets.save") });
  save.addEventListener("click", () => {
    new SavePresetModal(host.app, (name) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      ({ settings: host.settings, presets: host.presets } = savePreset(host.settings, name, host.presets, id));
      void commit();
    }).open();
  });
}

/** Asks for a preset's name: not empty, at most 20 characters; anything else is the user's call. */
export class SavePresetModal extends Modal {
  constructor(
    app: App,
    private readonly onSave: (name: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("leapfrog-save-modal");
    this.setTitle(t("settings.save.title"));
    const input = this.contentEl.createEl("input", { type: "text", attr: { placeholder: t("settings.save.placeholder") } });
    const error = this.contentEl.createDiv({ cls: "leapfrog-save-error" });
    const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
    const confirm = buttons.createEl("button", { cls: "mod-cta leapfrog-save-confirm", text: t("settings.save.confirm") });
    const cancel = buttons.createEl("button", { text: t("settings.save.cancel") });

    // The reason shows only once something has been typed: an empty field is where everyone starts.
    let typed = false;
    const check = (): boolean => {
      const problem = nameError(input.value);
      confirm.disabled = problem !== null;
      error.setText(typed && problem ? t(`settings.save.${problem}`, { max: NAME_MAX }) : "");
      return problem === null;
    };
    const submit = (): void => {
      if (!check()) return;
      this.onSave(input.value);
      this.close();
    };
    input.addEventListener("input", () => {
      typed = true;
      check();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      // Closing hands focus back to the Save chip; left alone, the same key press would click it
      // and open the dialog again.
      event.preventDefault();
      submit();
    });
    confirm.addEventListener("click", submit);
    cancel.addEventListener("click", () => this.close());
    check();
    input.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
