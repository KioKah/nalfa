import {
	handleEmbeddedActionItemDrop,
	refreshAlwaysRefreshEmbeddedActions,
} from "./item/actions/embedded.mjs";
import { bindItemSheetInteractions, restoreItemSheetTabs } from "./item/bindings.mjs";
import { PRIMARY_TAB_GROUP } from "./item/constants.mjs";
import { buildItemSheetContext } from "./item/context/index.mjs";
import { applyReadonlyItemSections, canManageItemSheetRules } from "./item/permissions.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class NalfaItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	static TABS = {
		[PRIMARY_TAB_GROUP]: {
			tabs: [
				{ id: "specific", label: "Spécifique" },
				{ id: "actionable", label: "Action" },
				{ id: "modifiers", label: "Modificateurs" },
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

	static PARTS = {
		header: {
			template: "systems/nalfa/templates/sheets/item/header.hbs",
			classes: ["nalfa-sheet"],
		},
		tabs: {
			template: "systems/nalfa/templates/sheets/item/tabs.hbs",
			classes: ["nalfa-sheet"],
		},
		sheet: {
			template: "systems/nalfa/templates/sheets/item/body.hbs",
			classes: ["nalfa-sheet", "sheet-body"],
		},
	};

	constructor(options = {}) {
		super(options);
		this._didAutoRefreshEmbeddedActions = false;
	}

	get title() {
		return `Feuille de ${this.document.type} - ${this.item.name}`;
	}

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
		restoreItemSheetTabs(this);
		applyReadonlyItemSections(this.element);

		if (!this._didAutoRefreshEmbeddedActions && canManageItemSheetRules(this)) {
			this._didAutoRefreshEmbeddedActions = true;
			const refreshed = await refreshAlwaysRefreshEmbeddedActions(this);
			if (refreshed) return;
		}

		bindItemSheetInteractions(this);
	}

	async _onDrop(event, data) {
		const dropData =
			data ?? foundry.applications.ux.TextEditor.getDragEventData(event);
		const handled = await handleEmbeddedActionItemDrop(this, event, dropData);
		if (handled) return;

		return super._onDrop?.(event, data);
	}

	async _onDropItem(event, data) {
		const handled = await handleEmbeddedActionItemDrop(this, event, data);
		if (handled) return;

		return super._onDropItem?.(event, data);
	}
}
