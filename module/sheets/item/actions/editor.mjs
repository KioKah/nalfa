import { createDefaultDamageFormula } from "../../../actions/core.mjs";
import {
	formatEmbeddedActionShorthand,
	getDefaultEmbeddedActionName,
	getDefaultEmbeddedActionShorthand,
	renderEmbeddedActionShorthand,
	resolveEmbeddedActionShorthand,
} from "../../../actions/embedded.mjs";
import { buildDefaultArrayEntry } from "../arrays.mjs";
import { openRichTextEditorDialog } from "../dialogs/richTextDialog.mjs";
import {
	applyReadonlyItemSections,
	canManageItemSheetRules,
	canRollItemSheet,
} from "../permissions.mjs";
import { getItemImage, htmlToPlainText } from "../utils.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class NalfaEmbeddedActionEditor extends HandlebarsApplicationMixin(ItemSheetV2) {
	static DEFAULT_OPTIONS = {
		classes: ["nalfa", "sheet", "embedded-action-editor"],
		position: {
			width: 760,
		},
		form: {
			submitOnChange: false,
		},
	};

	static PARTS = {
		header: {
			template: `systems/nalfa/templates/sheets/item/action-editor-header.hbs`,
			classes: ["nalfa-sheet"],
		},
		separator: {
			template: `systems/nalfa/templates/sheets/item/action-editor-separator.hbs`,
			classes: ["nalfa-sheet"],
		},
		sheet: {
			template: `systems/nalfa/templates/sheets/item/action-editor.hbs`,
			classes: ["nalfa-sheet", "sheet-body"],
		},
	};

	constructor(options = {}) {
		super(options);
		this._draftAction = this.#getInitialDraftAction();
	}

	get title() {
		const index = this._getActionIndex();
		const actionData = this._draftAction;
		const actionName = String(actionData?.name ?? "").trim();
		const resolvedName = actionName || getDefaultEmbeddedActionName(this.item.name, index);
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
		const noteTextSource = actionData?.cost?.actions?.note ?? "";
		const noteHasContent = htmlToPlainText(noteTextSource).length > 0;
		const defaultActionName = getDefaultEmbeddedActionName(item.name, actionIndex);
		const actionName = String(actionData?.name ?? "").trim() || defaultActionName;
		const defaultActionShorthand = getDefaultEmbeddedActionShorthand(actionName);
		const actionDisplayName = String(actionData?.name ?? "").trim() || defaultActionName;
		const alwaysRefresh = actionData?.always_refresh === true;
		const actionDisplayShorthand = formatEmbeddedActionShorthand(
			resolveEmbeddedActionShorthand({
				shorthand: actionData?.shorthand,
				actionName,
				preferGenerated: alwaysRefresh,
			}),
		);
		const actionDisplayShorthandHtml = renderEmbeddedActionShorthand(
			resolveEmbeddedActionShorthand({
				shorthand: actionData?.shorthand,
				actionName,
				preferGenerated: alwaysRefresh,
			}),
		);
		const { TextEditor } = foundry.applications.ux;
		const readonly = !canManageItemSheetRules(this);
		const rollable = canRollItemSheet(this.item);

		return {
			isOwner: this.item.isOwner,
			isEditable: this.isEditable,
			readonly,
			rollable,
			item,
			itemImage: getItemImage(item),
			hasActionable,
			actionData,
			actionPath: `actions.${actionIndex}.`,
			defaultActionName,
			defaultActionShorthand,
			actionDisplayName,
			actionDisplayShorthand,
			actionDisplayShorthandHtml,
			isActionModeIncant: actionMode === "incant",
			isActionModePhysical: actionMode === "physical",
			effectNamePath: `system.actions.${actionIndex}.effect.text`,
			noteNamePath: `system.actions.${actionIndex}.cost.actions.note`,
			config: CONFIG.nalfa,
			noteHasContent,
			enrichedHTML: {
				effect: {
					text: await TextEditor.enrichHTML(effectTextSource, {
						async: true,
					}),
				},
				note: await TextEditor.enrichHTML(noteTextSource, {
					async: true,
				}),
			},
		};
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		applyReadonlyItemSections(this.element);
		if (!canManageItemSheetRules(this)) return;
		this.element?.querySelector("form")?.addEventListener("submit", (event) => {
			event.preventDefault();
		});

		this._bindFieldChangeAction(
			"input[name], select[name]",
			this._onDraftFieldChange,
		);
		this._bindClickAction("[data-action='add-array-entry']", this._onAddArrayEntryDraft);
		this._bindClickAction(
			"[data-action='remove-array-entry']",
			this._onRemoveArrayEntryDraft,
		);
		this._bindClickAction(
			"[data-action='open-richtext-editor']",
			this._onOpenRichTextEditor,
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
		void this.#saveDraftAction();
		if (this.#shouldRerenderAfterChange(path)) {
			this.render({ force: true });
		}
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
		void this.#saveDraftAction();
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
		void this.#saveDraftAction();
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
				await this.#saveDraftAction();
				this.render({ force: true });
			},
		});
	}

	async close(options = {}) {
		this.#syncDraftFromRenderedForm();
		await this.#saveDraftAction();
		return super.close(options);
	}

	_getActionIndex() {
		const index = Number(this.options.actionIndex ?? 0);
		if (!Number.isInteger(index) || index < 0) return 0;
		return index;
	}

	#buildDefaultArrayEntry(entryType) {
		if (entryType === "damage-formula") {
			return createDefaultDamageFormula();
		}

		return buildDefaultArrayEntry(entryType);
	}

	#getInitialDraftAction() {
		const index = this._getActionIndex();
		const embeddedActions = this.item.system?.actions;
		if (!Array.isArray(embeddedActions) || !embeddedActions[index]) return null;
		return foundry.utils.deepClone(embeddedActions[index]);
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
			"name",
			"shorthand",
			"range_type",
			"selection.target.unit",
			"selection.zone.shape",
			"selection.zone.has_long_range",
			"cost.movement.mode",
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

		const nextActions = foundry.utils.deepClone(currentActions);
		nextActions[index] = foundry.utils.deepClone(this._draftAction);
		await this.item.update({ "system.actions": nextActions });
	}
}
