import {
	createDefaultDamageFormula,
	getDefaultItemActionName,
} from "../../itemActions.mjs";
import { openRichTextEditorDialog } from "./richTextDialog.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class NalfaItemActionEditor extends HandlebarsApplicationMixin(ItemSheetV2) {
	static DEFAULT_OPTIONS = {
		classes: ["nalfa", "sheet", "item-action-editor"],
		position: {
			width: 760,
		},
		form: {
			submitOnChange: false,
		},
	};

	static PARTS = {
		sheet: {
			template: `systems/nalfa/templates/sheets/item/action-editor.hbs`,
			classes: ["nalfa-sheet", "sheet-body"],
		},
	};

	constructor(options = {}) {
		super(options);
		this._skipAutoSave = false;
		this._draftAction = this.#getInitialDraftAction();
	}

	get title() {
		const index = this._getActionIndex();
		const actionData = this._draftAction;
		const actionName = String(actionData?.name ?? "").trim();
		const resolvedName = actionName || getDefaultItemActionName(this.item.name, index);
		return `Action - ${resolvedName}`;
	}

	async _prepareContext(options) {
		const baseData = await super._prepareContext(options);
		const item = baseData.document;
		const actionIndex = this._getActionIndex();
		const actionData = this._draftAction;
		const hasActionable = actionData !== null;
		const actionMode = actionData?.mode ?? "physical";
		const effectTextSource = actionData?.effect?.text ?? "";
		const { TextEditor } = foundry.applications.ux;

		return {
			isOwner: this.item.isOwner,
			isEditable: this.isEditable,
			item,
			hasActionable,
			actionData,
			actionPath: `actions.${actionIndex}.`,
			isActionModeIncant: actionMode === "incant",
			isActionModePhysical: actionMode === "physical",
			config: CONFIG.nalfa,
			enrichedHTML: {
				effect: {
					text: await TextEditor.enrichHTML(effectTextSource, {
						async: true,
					}),
				},
			},
		};
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		if (!this.isEditable) return;
		this.element?.querySelector("form")?.addEventListener("submit", (event) => {
			event.preventDefault();
		});

		this._bindFieldChangeAction("input[name], select[name]", this._onDraftFieldChange);
		this._bindClickAction("[data-action='add-array-entry']", this._onAddArrayEntryDraft);
		this._bindClickAction(
			"[data-action='remove-array-entry']",
			this._onRemoveArrayEntryDraft,
		);
		this._bindClickAction(
			"[data-action='open-richtext-editor']",
			this._onOpenRichTextEditor,
		);
		this._bindClickAction(
			"[data-action='save-action-editor']",
			this._onSaveActionEditor,
		);
		this._bindClickAction(
			"[data-action='cancel-action-editor']",
			this._onCancelActionEditor,
		);
	}

	_bindClickAction(selector, handler) {
		this.element?.querySelectorAll(selector).forEach((element) => {
			element.addEventListener("click", handler.bind(this));
		});
	}

	_bindFieldChangeAction(selector, handler) {
		this.element?.querySelectorAll(selector).forEach((element) => {
			element.addEventListener("change", handler.bind(this));
		});
	}

	_onDraftFieldChange(event) {
		if (!this._draftAction) return;

		const element = event.currentTarget;
		const path = this.#getDraftPathFromSystemPath(element.name);
		if (!path) return;

		foundry.utils.setProperty(this._draftAction, path, this.#readFieldValue(element));
		if (this.#shouldRerenderAfterChange(path)) {
			this.render({ force: true });
		}
	}

	_onSaveActionEditor(event) {
		event.preventDefault();
		event.stopPropagation();
		this.#syncDraftFromRenderedForm();
		this._skipAutoSave = true;
		void this.#saveDraftAction().then(() => this.close());
	}

	_onCancelActionEditor(event) {
		event.preventDefault();
		event.stopPropagation();
		this._skipAutoSave = true;
		void this.close();
	}

	_onAddArrayEntryDraft(event) {
		event.preventDefault();
		if (!this._draftAction) return;
		this.#syncDraftFromRenderedForm();

		const button = event.currentTarget;
		const path = this.#getDraftPathFromArrayDataPath(button.dataset.path);
		if (!path) return;

		const entryType = button.dataset.entryType ?? "string";
		const source = foundry.utils.getProperty(this._draftAction, path) ?? [];
		const array = Array.isArray(source) ? foundry.utils.deepClone(source) : [];
		array.push(this.#buildDefaultArrayEntry(entryType));
		foundry.utils.setProperty(this._draftAction, path, array);
		this.render({ force: true });
	}

	_onRemoveArrayEntryDraft(event) {
		event.preventDefault();
		if (!this._draftAction) return;
		this.#syncDraftFromRenderedForm();

		const button = event.currentTarget;
		const path = this.#getDraftPathFromArrayDataPath(button.dataset.path);
		const index = Number(button.dataset.index ?? -1);
		const minimum = Number(button.dataset.minimum ?? 0);

		if (!path || !Number.isInteger(index) || index < 0) return;

		const source = foundry.utils.getProperty(this._draftAction, path) ?? [];
		const array = Array.isArray(source) ? foundry.utils.deepClone(source) : [];
		if (array.length <= minimum) return;

		array.splice(index, 1);
		foundry.utils.setProperty(this._draftAction, path, array);
		this.render({ force: true });
	}

	_onOpenRichTextEditor(event) {
		event.preventDefault();
		event.stopPropagation();
		if (!this._draftAction) return;

		const button = event.currentTarget;
		const path = this.#getDraftPathFromSystemPath(button.dataset.path);
		if (!path) return;

		const title = button.dataset.title || "Editeur";
		openRichTextEditorDialog(null, "", title, {
			getValue: () => String(foundry.utils.getProperty(this._draftAction, path) ?? ""),
			onSave: async (content) => {
				foundry.utils.setProperty(this._draftAction, path, String(content ?? ""));
				this.render({ force: true });
			},
		});
	}

	async close(options = {}) {
		if (!this._skipAutoSave) {
			this.#syncDraftFromRenderedForm();
			await this.#saveDraftAction();
		}
		return super.close(options);
	}

	_getActionIndex() {
		const index = Number(this.options.actionIndex ?? 0);
		if (!Number.isInteger(index) || index < 0) return 0;
		return index;
	}

	#buildDefaultArrayEntry(entryType) {
		switch (entryType) {
			case "damage-formula":
				return createDefaultDamageFormula();
			default:
				return "";
		}
	}

	#getInitialDraftAction() {
		const index = this._getActionIndex();
		const itemActions = this.item.system?.actions;
		if (!Array.isArray(itemActions) || !itemActions[index]) return null;
		return foundry.utils.deepClone(itemActions[index]);
	}

	#getDraftPathFromSystemPath(systemPath) {
		if (!systemPath || !this._draftAction) return null;
		const prefix = `system.actions.${this._getActionIndex()}.`;
		if (!systemPath.startsWith(prefix)) return null;
		return systemPath.slice(prefix.length);
	}

	#getDraftPathFromArrayDataPath(dataPath) {
		if (!dataPath || !this._draftAction) return null;
		const prefix = `actions.${this._getActionIndex()}.`;
		if (!dataPath.startsWith(prefix)) return null;
		return dataPath.slice(prefix.length);
	}

	#readFieldValue(element) {
		if (element instanceof HTMLInputElement && element.type === "checkbox") {
			return element.checked;
		}

		const isNumberField =
			element.dataset?.dtype === "Number" ||
			(element instanceof HTMLInputElement && element.type === "number");
		if (isNumberField) {
			const rawValue = String(element.value ?? "").trim();
			if (rawValue === "") return null;

			const parsedValue = Number(rawValue);
			return Number.isFinite(parsedValue) ? parsedValue : 0;
		}

		return String(element.value ?? "");
	}

	#shouldRerenderAfterChange(path) {
		const rerenderPaths = [
			"range_type",
			"selection.target.unit",
			"selection.zone.shape",
			"selection.zone.has_long_range",
			"cost.action.unit",
			"cost.ester.unit",
			"cost.uses.unit",
			"cost.cooldown.unit",
			"jds.jdd_saved",
		];

		if (path.endsWith(".enabled")) return true;
		return rerenderPaths.includes(path);
	}

	#syncDraftFromRenderedForm() {
		if (!this._draftAction) return;

		this.element?.querySelectorAll("input[name], select[name]").forEach((element) => {
			const path = this.#getDraftPathFromSystemPath(element.name);
			if (!path) return;
			foundry.utils.setProperty(this._draftAction, path, this.#readFieldValue(element));
		});
	}

	async #saveDraftAction() {
		if (!this._draftAction) return;

		const index = this._getActionIndex();
		const currentActions = this.item.system?.actions;
		if (!Array.isArray(currentActions) || !currentActions[index]) return;

		await this.item.update({ [`system.actions.${index}`]: this._draftAction });
	}
}
