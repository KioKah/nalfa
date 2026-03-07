import { addArrayEntry, removeArrayEntry } from "./item/arrays.mjs";
import {
	EQUIP_SLOT_KEYS,
	EQUIP_SLOT_NONE,
	PRIMARY_TAB_GROUP,
} from "./item/constants.mjs";
import NalfaEmbeddedActionEditor from "./item/actionEditor.mjs";
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
import {
	MAX_EMBEDDED_ACTIONS,
	clearEmbeddedActionSource,
	createEmbeddedActionFromSourceItem,
	createDefaultEmbeddedAction,
	getDefaultEmbeddedActionName,
	getDefaultEmbeddedActionShorthand,
	hasEmbeddedActionSource,
	isEmbeddedActionSourceChanged,
} from "../embeddedActions.mjs";
import { ACTION_REF_TYPES, HOTBAR_DROP_TYPE_EMBEDDED_ACTION } from "../actionRefs.mjs";
import { executeActionPrompt } from "../rolls/actionExecution.mjs";

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

	constructor(options = {}) {
		super(options);
		this._didAutoRefreshEmbeddedActions = false;
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
		if (this._nextPrimaryTab && this.tabGroups) {
			this.tabGroups[PRIMARY_TAB_GROUP] = this._nextPrimaryTab;
		}
		this._nextPrimaryTab = null;

		if (this.tabGroups) {
			for (const [group, active] of Object.entries(this.tabGroups)) {
				if (active) this.changeTab(active, group);
			}
		}

		if (!this._didAutoRefreshEmbeddedActions) {
			this._didAutoRefreshEmbeddedActions = true;
			const refreshed = await this._refreshAlwaysRefreshEmbeddedActions();
			if (refreshed) return;
		}

		this._bindClickAction("[data-action='use-embedded-action']", this._onUseEmbeddedAction);
		this._bindDragStartAction(
			"[data-draggable='embedded-action']",
			this._onEmbeddedActionDragStart,
		);
		this._bindEmbeddedActionDropZone();

		if (this.isEditable) {
			this._bindClickAction("[data-action='add-array-entry']", this._onAddArrayEntry);
			this._bindClickAction(
				"[data-action='remove-array-entry']",
				this._onRemoveArrayEntry,
			);
			this._bindClickAction(
				"[data-action='add-embedded-action']",
				this._onAddEmbeddedAction,
			);
			this._bindClickAction(
				"[data-action='edit-embedded-action']",
				this._onEditEmbeddedAction,
			);
			this._bindClickAction(
				"[data-action='remove-embedded-action']",
				this._onRemoveEmbeddedAction,
			);
			this._bindClickAction(
				"[data-action='refresh-embedded-action-source']",
				this._onRefreshEmbeddedActionSource,
			);
			this._bindClickAction(
				"[data-action='open-embedded-action-source']",
				this._onOpenEmbeddedActionSource,
			);
			this._bindClickAction(
				"[data-action='detach-embedded-action-source']",
				this._onDetachEmbeddedActionSource,
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
			this._bindChangeAction(
				"[data-action='change-modifier-category']",
				this._onChangeModifierCategory,
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

	_bindDragStartAction(selector, handler) {
		this.element?.querySelectorAll(selector).forEach((element) => {
			element.addEventListener("dragstart", handler.bind(this));
		});
	}

	_bindEmbeddedActionDropZone() {
		const zone = this.element?.querySelector("[data-drop-zone='embedded-actions']");
		if (!zone) return;

		zone.addEventListener("dragover", this._onEmbeddedActionDragOver.bind(this));
		zone.addEventListener("drop", this._onEmbeddedActionDrop.bind(this));
	}

	_onEmbeddedActionDragOver(event) {
		if (!this.isEditable) return;
		if (!Array.isArray(this.item.system?.actions)) return;

		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
	}

	_onEmbeddedActionDrop(event) {
		event.preventDefault();
		const dropData = foundry.applications.ux.TextEditor.getDragEventData(event);
		void this._handleEmbeddedActionItemDrop(event, dropData);
	}

	_confirmActionDialog({ title, content, confirmLabel = "Confirmer" } = {}) {
		return new Promise((resolve) => {
			new Dialog({
				title,
				content,
				buttons: {
					confirm: {
						label: confirmLabel,
						callback: () => resolve(true),
					},
					cancel: {
						label: "Annuler",
						callback: () => resolve(false),
					},
				},
				default: "cancel",
				close: () => resolve(false),
			}).render(true);
		});
	}

	async _onDrop(event, data) {
		const dropData =
			data ?? foundry.applications.ux.TextEditor.getDragEventData(event);
		const handled = await this._handleEmbeddedActionItemDrop(event, dropData);
		if (handled) return;

		return super._onDrop?.(event, data);
	}

	async _onDropItem(event, data) {
		const handled = await this._handleEmbeddedActionItemDrop(event, data);
		if (handled) return;

		return super._onDropItem?.(event, data);
	}

	_isEmbeddedActionDropTarget(event) {
		if (event?.target instanceof Element) {
			if (event.target.closest("[data-drop-zone='embedded-actions']")) return true;
		}

		return this.tabGroups?.[PRIMARY_TAB_GROUP] === "actionable";
	}

	async _handleEmbeddedActionItemDrop(event, dropData) {
		if (!this.isEditable) return false;
		if (!this._isEmbeddedActionDropTarget(event)) return false;

		const canStoreEmbeddedActions = Array.isArray(this.item.system?.actions);
		if (!canStoreEmbeddedActions) return false;

		if (dropData?.type !== "Item") return false;

		const sourceActionItem = await Item.implementation.fromDropData(dropData);
		if (!(sourceActionItem instanceof Item) || sourceActionItem.type !== "Action") {
			return false;
		}

		const embeddedActions = Array.isArray(this.item.system?.actions)
			? foundry.utils.deepClone(this.item.system.actions)
			: [];
		if (embeddedActions.length >= MAX_EMBEDDED_ACTIONS) {
			ui.notifications.warn("Nombre maximum d'actions intégrées atteint.");
			return true;
		}

		embeddedActions.push(createEmbeddedActionFromSourceItem(sourceActionItem));
		await this.item.update({ "system.actions": embeddedActions });
		ui.notifications.info(`Action intégrée liée à ${sourceActionItem.name}.`);
		return true;
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

	async _onAddEmbeddedAction(event) {
		event.preventDefault();

		const embeddedActions = Array.isArray(this.item.system?.actions)
			? foundry.utils.deepClone(this.item.system.actions)
			: [];
		if (embeddedActions.length >= MAX_EMBEDDED_ACTIONS) return;

		const actionIndex = embeddedActions.length;
		const actionName = getDefaultEmbeddedActionName(this.item.name, actionIndex);
		const actionShorthand = getDefaultEmbeddedActionShorthand(actionIndex);
		embeddedActions.push(
			createDefaultEmbeddedAction({ name: actionName, shorthand: actionShorthand }),
		);
		await this.item.update({ "system.actions": embeddedActions });
	}

	_onEditEmbeddedAction(event) {
		event.preventDefault();

		const button = event.currentTarget;
		const index = Number(button.dataset.index ?? -1);
		if (!Number.isInteger(index) || index < 0) return;

		const embeddedActions = this.item.system?.actions;
		if (!Array.isArray(embeddedActions) || !embeddedActions[index]) return;

		const fallbackWidth = this.constructor.DEFAULT_OPTIONS.position?.width ?? 760;
		const width = Number(this.position?.width ?? fallbackWidth) || fallbackWidth;
		const editor = new NalfaEmbeddedActionEditor({
			document: this.item,
			actionIndex: index,
			position: { width },
		});
		editor.render({ force: true });
	}

	async _onRemoveEmbeddedAction(event) {
		event.preventDefault();

		const button = event.currentTarget;
		const index = Number(button.dataset.index ?? -1);
		if (!Number.isInteger(index) || index < 0) return;

		const embeddedActions = Array.isArray(this.item.system?.actions)
			? foundry.utils.deepClone(this.item.system.actions)
			: [];
		if (!embeddedActions[index]) return;
		const actionName = this._getEmbeddedActionDisplayName(embeddedActions[index], index);

		const confirmed = await this._confirmActionDialog({
			title: "Supprimer l'action intégrée",
			content: `<p>Supprimer <strong>${foundry.utils.escapeHTML(actionName)}</strong> ?</p><p>Cette action sera retirée de l'objet.</p>`,
			confirmLabel: "Supprimer",
		});
		if (!confirmed) return;

		embeddedActions.splice(index, 1);
		await this.item.update({ "system.actions": embeddedActions });
	}

	_onEmbeddedActionDragStart(event) {
		const row = event.currentTarget;
		const index = Number(row.dataset.index ?? -1);
		if (!Number.isInteger(index) || index < 0) return;
		if (!event.dataTransfer) return;

		const embeddedActions = this.item.system?.actions;
		if (!Array.isArray(embeddedActions) || !embeddedActions[index]) return;

		const actionData = embeddedActions[index];
		const actionName = this._getEmbeddedActionDisplayName(actionData, index);
		const actorUuid = this.item.parent instanceof Actor ? this.item.parent.uuid : "";
		const payload = {
			type: HOTBAR_DROP_TYPE_EMBEDDED_ACTION,
			refType: ACTION_REF_TYPES.EMBEDDED_ACTION,
			itemUuid: this.item.uuid,
			actionIndex: index,
			actorUuid,
			actionName,
		};

		event.dataTransfer.setData("text/plain", JSON.stringify(payload));
		event.dataTransfer.effectAllowed = "copy";
	}

	async _onUseEmbeddedAction(event) {
		event.preventDefault();

		const button = event.currentTarget;
		const index = Number(button.dataset.index ?? -1);
		if (!Number.isInteger(index) || index < 0) return;

		let actionData = this.item.system?.actions?.[index] ?? null;
		if (!actionData) return;

		if (actionData.always_refresh === true && hasEmbeddedActionSource(actionData)) {
			const refreshResult = await this._refreshEmbeddedActionAtIndex(index, {
				onlyIfAlwaysRefresh: true,
				notifyOnMissingSource: true,
				notifyWhenUpdated: false,
			});
			actionData = refreshResult.actionData ?? actionData;
		}

		const actor =
			(this.item.parent instanceof Actor ? this.item.parent : null) ??
			canvas?.tokens?.controlled?.[0]?.actor ??
			game.user?.character ??
			null;
		if (!actor) {
			ui.notifications.warn("Aucun acteur sélectionné.");
			return;
		}

		return executeActionPrompt({
			actor,
			actionData,
			sourceItem: this.item,
			titleName: this._getEmbeddedActionDisplayName(actionData, index),
		});
	}

	async _onRefreshEmbeddedActionSource(event) {
		event.preventDefault();

		const button = event.currentTarget;
		const index = Number(button.dataset.index ?? -1);
		if (!Number.isInteger(index) || index < 0) return;

		const actionData = this.item.system?.actions?.[index] ?? null;
		if (!actionData || !hasEmbeddedActionSource(actionData)) {
			ui.notifications.warn("Cette action intégrée n'a pas de source liée.");
			return;
		}

		const isAutoEnabled = actionData.always_refresh === true;
		const dialogButtons = {
			syncNow: {
				label: "Synchroniser maintenant",
				callback: () => {
					void this._refreshEmbeddedActionAtIndex(index, {
						forceRefresh: true,
						notifyOnMissingSource: true,
						notifyWhenUpdated: true,
						notifyWhenUnchanged: true,
					});
				},
			},
			toggleAuto: {
				label: isAutoEnabled ? "Désactiver l'auto-sync" : "Activer l'auto-sync",
				callback: () => {
					void this._setEmbeddedActionAlwaysRefresh(index, !isAutoEnabled, {
						notify: true,
					});
				},
			},
			cancel: {
				label: "Annuler",
			},
		};

		new Dialog({
			title: "Synchronisation de l'action intégrée",
			content: `<p>Que veux-tu faire pour cette action liée ?</p>`,
			buttons: dialogButtons,
			default: "syncNow",
		}).render(true);
	}

	async _onOpenEmbeddedActionSource(event) {
		event.preventDefault();

		const button = event.currentTarget;
		const index = Number(button.dataset.index ?? -1);
		if (!Number.isInteger(index) || index < 0) return;

		const actionData = this.item.system?.actions?.[index] ?? null;
		if (!actionData || !hasEmbeddedActionSource(actionData)) return;

		const sourceUuid = String(actionData.source_uuid ?? "").trim();
		const sourceItem = await fromUuid(sourceUuid);
		if (!(sourceItem instanceof Item) || sourceItem.type !== "Action") {
			ui.notifications.warn("La source de cette action intégrée est introuvable.");
			return;
		}

		sourceItem.sheet?.render({ force: true });
	}

	async _onDetachEmbeddedActionSource(event) {
		event.preventDefault();

		const button = event.currentTarget;
		const index = Number(button.dataset.index ?? -1);
		if (!Number.isInteger(index) || index < 0) return;

		const embeddedActions = Array.isArray(this.item.system?.actions)
			? foundry.utils.deepClone(this.item.system.actions)
			: [];
		if (!embeddedActions[index]) return;
		if (!hasEmbeddedActionSource(embeddedActions[index])) return;

		const actionName = this._getEmbeddedActionDisplayName(embeddedActions[index], index);
		const confirmed = await this._confirmActionDialog({
			title: "Détacher la source",
			content: `<p>Détacher la source de <strong>${foundry.utils.escapeHTML(actionName)}</strong> ?</p><p>L'action restera sur l'objet mais ne sera plus synchronisée.</p>`,
			confirmLabel: "Détacher",
		});
		if (!confirmed) return;

		embeddedActions[index] = clearEmbeddedActionSource(embeddedActions[index]);
		await this.item.update({ "system.actions": embeddedActions });
	}

	async _setEmbeddedActionAlwaysRefresh(index, enabled, { notify = false } = {}) {
		if (!Number.isInteger(index) || index < 0) return false;
		const embeddedActions = Array.isArray(this.item.system?.actions)
			? foundry.utils.deepClone(this.item.system.actions)
			: [];
		if (!embeddedActions[index]) return false;

		if (!hasEmbeddedActionSource(embeddedActions[index]) && enabled) {
			ui.notifications.warn("Cette action intégrée n'a pas de source liée.");
			return false;
		}

		const nextValue = enabled === true;
		if (embeddedActions[index].always_refresh === nextValue) return true;

		embeddedActions[index].always_refresh = nextValue;
		await this.item.update({ "system.actions": embeddedActions });

		if (notify) {
			ui.notifications.info(
				nextValue
					? "Auto-sync activé pour cette action intégrée."
					: "Auto-sync désactivé pour cette action intégrée.",
			);
		}

		return true;
	}

	async _refreshAlwaysRefreshEmbeddedActions() {
		const embeddedActions = Array.isArray(this.item.system?.actions)
			? foundry.utils.deepClone(this.item.system.actions)
			: [];
		if (!embeddedActions.length) return false;

		let updated = false;

		for (let index = 0; index < embeddedActions.length; index += 1) {
			const embeddedAction = embeddedActions[index];
			if (!embeddedAction || embeddedAction.always_refresh !== true) continue;
			if (!hasEmbeddedActionSource(embeddedAction)) continue;

			const sourceUuid = String(embeddedAction.source_uuid ?? "").trim();
			const sourceItem = await fromUuid(sourceUuid);
			if (!(sourceItem instanceof Item) || sourceItem.type !== "Action") continue;
			if (!isEmbeddedActionSourceChanged(embeddedAction, sourceItem)) continue;

			embeddedActions[index] = createEmbeddedActionFromSourceItem(sourceItem, {
				alwaysRefresh: true,
			});
			updated = true;
		}

		if (!updated) return false;

		await this.item.update({ "system.actions": embeddedActions });
		return true;
	}

	async _refreshEmbeddedActionAtIndex(
		index,
		{
			forceRefresh = false,
			onlyIfAlwaysRefresh = false,
			notifyOnMissingSource = false,
			notifyWhenUpdated = false,
			notifyWhenUnchanged = false,
		} = {},
	) {
		const currentActions = Array.isArray(this.item.system?.actions)
			? foundry.utils.deepClone(this.item.system.actions)
			: [];
		if (!currentActions[index]) {
			return { actionData: null, sourceItem: null, updated: false };
		}

		const currentAction = currentActions[index];
		const sourceUuid = String(currentAction?.source_uuid ?? "").trim();
		if (!sourceUuid) {
			return { actionData: currentAction, sourceItem: null, updated: false };
		}
		if (onlyIfAlwaysRefresh && currentAction.always_refresh !== true) {
			return { actionData: currentAction, sourceItem: null, updated: false };
		}

		const sourceItem = await fromUuid(sourceUuid);
		if (!(sourceItem instanceof Item) || sourceItem.type !== "Action") {
			if (notifyOnMissingSource) {
				ui.notifications.warn("La source de cette action intégrée est introuvable.");
			}
			return { actionData: currentAction, sourceItem: null, updated: false };
		}

		if (!forceRefresh && !isEmbeddedActionSourceChanged(currentAction, sourceItem)) {
			if (notifyWhenUnchanged) {
				ui.notifications.info("Action intégrée déjà à jour.");
			}
			return { actionData: currentAction, sourceItem, updated: false };
		}

		const alwaysRefresh = currentAction.always_refresh === true;
		currentActions[index] = createEmbeddedActionFromSourceItem(sourceItem, {
			alwaysRefresh,
		});
		await this.item.update({ "system.actions": currentActions });

		if (notifyWhenUpdated) {
			ui.notifications.info("Action intégrée synchronisée avec la source.");
		}

		return {
			actionData: currentActions[index],
			sourceItem,
			updated: true,
		};
	}

	_getEmbeddedActionDisplayName(actionData, index) {
		const storedName = String(actionData?.name ?? "").trim();
		if (storedName) return storedName;

		return getDefaultEmbeddedActionName(this.item.name, index);
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

	async _onChangeModifierCategory(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		event.stopPropagation();

		const select = event.currentTarget;
		const index = Number(select.dataset.index ?? -1);
		if (!Number.isInteger(index) || index < 0) return;

		const category = String(select.value ?? "");
		const pathsByCategory = CONFIG.nalfa?.modifier_base_paths_by_category ?? {};
		const availablePaths = Object.keys(pathsByCategory[category] ?? {});
		const modifiers = foundry.utils.deepClone(this.item.system?.modifiers ?? []);
		if (!modifiers[index]) return;

		const currentPath = String(modifiers[index].path ?? "");
		const nextPath = availablePaths.includes(currentPath)
			? currentPath
			: (availablePaths[0] ?? "");

		modifiers[index].category = category;
		modifiers[index].path = nextPath;

		await this.item.update({ "system.modifiers": modifiers });
	}

}
