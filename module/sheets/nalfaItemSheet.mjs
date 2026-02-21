import { addArrayEntry, removeArrayEntry } from "./item/arrays.mjs";
import {
	EQUIP_SLOT_KEYS,
	EQUIP_SLOT_NONE,
	PRIMARY_TAB_GROUP,
} from "./item/constants.mjs";
import { buildItemSheetContext } from "./item/context.mjs";
import {
	buildEquippedSlotUpdate,
	getEquippedSlotValue,
	isEquippedSlotLocked,
} from "./item/equipment.mjs";
import {
	buildIdentifiedUpdate,
	buildNeedsIdentificationUpdate,
} from "./item/identification.mjs";
import { openRichTextEditorDialog } from "./item/richTextDialog.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class NalfaItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	static TABS = {
		[PRIMARY_TAB_GROUP]: {
			tabs: [
				{ id: "specific", label: "Spécifique" },
				{ id: "actionable", label: "Action" },
				{ id: "description", label: "Description" },
			],
			initial: "specific",
		},
	};

	static DEFAULT_OPTIONS = {
		classes: ["nalfa", "sheet", "item-sheet"],
		position: {
			width: 760,
		},
		form: {
			submitOnChange: true,
		},
	};

	get title() {
		return `Feuille de ${this.document.type} - ${this.item.name}`;
	}

	static PARTS = {
		header: {
			template: `systems/nalfa/templates/sheets/item/header.hbs`,
			classes: ["nalfa-sheet"],
		},
		tabs: {
			template: `systems/nalfa/templates/sheets/item/tabs.hbs`,
			classes: ["nalfa-sheet"],
		},
		sheet: {
			template: `systems/nalfa/templates/sheets/item/body.hbs`,
			classes: ["nalfa-sheet", "sheet-body"],
		},
	};

	async _prepareContext(options) {
		const baseData = await super._prepareContext(options);
		const { TextEditor } = foundry.applications.ux;
		const { activeTab, sheetData } = await buildItemSheetContext({
			baseData,
			config: CONFIG.nalfa,
			sheet: this,
			textEditor: TextEditor,
		});

		this._nextPrimaryTab = activeTab;
		return sheetData;
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		if (this._nextPrimaryTab && this.tabGroups) {
			this.tabGroups[PRIMARY_TAB_GROUP] = this._nextPrimaryTab;
		}
		this._nextPrimaryTab = null;

		if (this.tabGroups) {
			for (const [group, active] of Object.entries(this.tabGroups)) {
				if (active) this.changeTab(active, group);
			}
		}

		if (this.isEditable) {
			this._bindClickAction("[data-action='add-array-entry']", this._onAddArrayEntry);
			this._bindClickAction(
				"[data-action='remove-array-entry']",
				this._onRemoveArrayEntry,
			);
			this._bindChangeAction(
				"[data-action='change-equipped-slot']",
				this._onChangeEquippedSlot,
			);
			this._bindChangeAction(
				"input[name='system.identification.needs_identification']",
				this._onToggleNeedsIdentification,
			);
			this._bindChangeAction(
				"input[name='system.identification.identified']",
				this._onToggleIdentified,
			);
			this._bindClickAction(
				"[data-action='open-richtext-editor']",
				this._onOpenRichTextEditor,
			);
		}
	}

	_bindClickAction(selector, handler) {
		this.element?.querySelectorAll(selector).forEach((element) => {
			element.addEventListener("click", handler.bind(this));
		});
	}

	_bindChangeAction(selector, handler) {
		this.element?.querySelectorAll(selector).forEach((element) => {
			element.addEventListener("change", handler.bind(this));
		});
	}

	async _onAddArrayEntry(event) {
		event.preventDefault();
		const button = event.currentTarget;
		const path = button.dataset.path;
		if (!path) return;

		const entryType = button.dataset.entryType ?? "string";
		await addArrayEntry(this.item, path, entryType);
	}

	async _onRemoveArrayEntry(event) {
		event.preventDefault();
		const button = event.currentTarget;
		const path = button.dataset.path;
		const index = Number(button.dataset.index ?? -1);
		const minimum = Number(button.dataset.minimum ?? 0);

		if (!path || !Number.isInteger(index) || index < 0) return;
		await removeArrayEntry(this.item, path, index, minimum);
	}

	_onOpenRichTextEditor(event) {
		event.preventDefault();
		event.stopPropagation();

		const button = event.currentTarget;
		const path = button.dataset.path;
		if (!path) return;

		const title = button.dataset.title || "Éditeur";
		openRichTextEditorDialog(this.item, path, title);
	}

	async _onChangeEquippedSlot(event) {
		event.preventDefault();
		event.stopPropagation();

		if (isEquippedSlotLocked(this.item.system)) {
			ui.notifications.warn("Cet objet maudit est verrouillé tant qu'il est équipé.");
			event.currentTarget.value = getEquippedSlotValue(
				this.item.system?.equipped ?? {},
				this.item.system?.equippable ?? {},
			);
			return;
		}

		const selectedSlot = event.currentTarget.value;
		if (selectedSlot !== EQUIP_SLOT_NONE && !EQUIP_SLOT_KEYS.has(selectedSlot)) return;

		if (selectedSlot !== EQUIP_SLOT_NONE && !this.item.system?.equippable?.[selectedSlot]) {
			ui.notifications.warn("Cet emplacement n'est pas autorisé.");
			event.currentTarget.value = EQUIP_SLOT_NONE;
			await this.item.update(buildEquippedSlotUpdate(EQUIP_SLOT_NONE));
			return;
		}

		await this.item.update(buildEquippedSlotUpdate(selectedSlot));
	}

	async _onToggleNeedsIdentification(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		event.stopPropagation();

		const isEnabled = Boolean(event.currentTarget.checked);
		await this.item.update(buildNeedsIdentificationUpdate(this.item, isEnabled));
	}

	async _onToggleIdentified(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		event.stopPropagation();

		const isIdentified = Boolean(event.currentTarget.checked);
		await this.item.update(buildIdentifiedUpdate(this.item, isIdentified));
	}

}
