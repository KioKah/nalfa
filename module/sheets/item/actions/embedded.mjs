import {
	MAX_EMBEDDED_ACTIONS,
	clearEmbeddedActionSource,
	createEmbeddedActionFromSourceItem,
	createDefaultEmbeddedAction,
	getDefaultEmbeddedActionName,
	getDefaultEmbeddedActionShorthand,
	hasEmbeddedActionSource,
	isEmbeddedActionSourceChanged,
} from "../../../actions/embedded.mjs";
import {
	ACTION_REF_TYPES,
	HOTBAR_DROP_TYPE_EMBEDDED_ACTION,
} from "../../../actions/refs.mjs";
import { executeActionPrompt } from "../../../rolls/actions/execution.mjs";
import { PRIMARY_TAB_GROUP } from "../constants.mjs";
import NalfaEmbeddedActionEditor from "./editor.mjs";

const getEmbeddedActions = (item) => {
	return Array.isArray(item.system?.actions) ? item.system.actions : [];
};

const getEmbeddedActionsClone = (item) => {
	return foundry.utils.deepClone(getEmbeddedActions(item));
};

const getEventIndex = (event) => {
	const index = Number(event.currentTarget?.dataset?.index ?? -1);
	if (!Number.isInteger(index) || index < 0) return null;
	return index;
};

const getEmbeddedActionDropData = (event) => {
	return foundry.applications.ux.TextEditor.getDragEventData(event);
};

const confirmActionDialog = ({ title, content, confirmLabel = "Confirmer" } = {}) => {
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
};

const isEmbeddedActionDropTarget = (sheet, event) => {
	if (event?.target instanceof Element) {
		if (event.target.closest("[data-drop-zone='embedded-actions']")) return true;
	}

	return sheet.tabGroups?.[PRIMARY_TAB_GROUP] === "actionable";
};

const resolveActorForEmbeddedAction = (sheet) => {
	return (
		(sheet.item.parent instanceof Actor ? sheet.item.parent : null) ??
		canvas?.tokens?.controlled?.[0]?.actor ??
		game.user?.character ??
		null
	);
};

const notifyMissingEmbeddedActionSource = () => {
	ui.notifications.warn("La source de cette action intégrée est introuvable.");
};

export const getEmbeddedActionDisplayName = (sheet, actionData, index) => {
	const storedName = String(actionData?.name ?? "").trim();
	if (storedName) return storedName;

	return getDefaultEmbeddedActionName(sheet.item.name, index);
};

export const refreshAlwaysRefreshEmbeddedActions = async (sheet) => {
	const embeddedActions = getEmbeddedActionsClone(sheet.item);
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

	await sheet.item.update({ "system.actions": embeddedActions });
	return true;
};

export const refreshEmbeddedActionAtIndex = async (
	sheet,
	index,
	{
		forceRefresh = false,
		onlyIfAlwaysRefresh = false,
		notifyOnMissingSource = false,
		notifyWhenUpdated = false,
		notifyWhenUnchanged = false,
	} = {},
) => {
	const currentActions = getEmbeddedActionsClone(sheet.item);
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
		if (notifyOnMissingSource) notifyMissingEmbeddedActionSource();
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
	await sheet.item.update({ "system.actions": currentActions });

	if (notifyWhenUpdated) {
		ui.notifications.info("Action intégrée synchronisée avec la source.");
	}

	return {
		actionData: currentActions[index],
		sourceItem,
		updated: true,
	};
};

export const setEmbeddedActionAlwaysRefresh = async (
	sheet,
	index,
	enabled,
	{ notify = false } = {},
) => {
	if (!Number.isInteger(index) || index < 0) return false;
	const embeddedActions = getEmbeddedActionsClone(sheet.item);
	if (!embeddedActions[index]) return false;

	if (!hasEmbeddedActionSource(embeddedActions[index]) && enabled) {
		ui.notifications.warn("Cette action intégrée n'a pas de source liée.");
		return false;
	}

	const nextValue = enabled === true;
	if (embeddedActions[index].always_refresh === nextValue) return true;

	embeddedActions[index].always_refresh = nextValue;
	await sheet.item.update({ "system.actions": embeddedActions });

	if (notify) {
		ui.notifications.info(
			nextValue
				? "Auto-sync activé pour cette action intégrée."
				: "Auto-sync désactivé pour cette action intégrée.",
		);
	}

	return true;
};

export const handleEmbeddedActionDragOver = (sheet, event) => {
	if (!sheet.isEditable) return;
	if (!Array.isArray(sheet.item.system?.actions)) return;

	event.preventDefault();
	if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
};

export const handleEmbeddedActionDrop = async (sheet, event) => {
	event.preventDefault();
	const dropData = getEmbeddedActionDropData(event);
	return handleEmbeddedActionItemDrop(sheet, event, dropData);
};

export const handleEmbeddedActionItemDrop = async (sheet, event, dropData) => {
	if (!sheet.isEditable) return false;
	if (!isEmbeddedActionDropTarget(sheet, event)) return false;

	const canStoreEmbeddedActions = Array.isArray(sheet.item.system?.actions);
	if (!canStoreEmbeddedActions) return false;

	if (dropData?.type !== "Item") return false;

	const sourceActionItem = await Item.implementation.fromDropData(dropData);
	if (!(sourceActionItem instanceof Item) || sourceActionItem.type !== "Action") {
		return false;
	}

	const embeddedActions = getEmbeddedActionsClone(sheet.item);
	if (embeddedActions.length >= MAX_EMBEDDED_ACTIONS) {
		ui.notifications.warn("Nombre maximum d'actions intégrées atteint.");
		return true;
	}

	embeddedActions.push(createEmbeddedActionFromSourceItem(sourceActionItem));
	await sheet.item.update({ "system.actions": embeddedActions });
	ui.notifications.info(`Action intégrée liée à ${sourceActionItem.name}.`);
	return true;
};

export const handleAddEmbeddedAction = async (sheet, event) => {
	event.preventDefault();

	const embeddedActions = getEmbeddedActionsClone(sheet.item);
	if (embeddedActions.length >= MAX_EMBEDDED_ACTIONS) return;

	const actionIndex = embeddedActions.length;
	const actionName = getDefaultEmbeddedActionName(sheet.item.name, actionIndex);
	const actionShorthand = getDefaultEmbeddedActionShorthand(actionIndex);
	embeddedActions.push(
		createDefaultEmbeddedAction({ name: actionName, shorthand: actionShorthand }),
	);
	await sheet.item.update({ "system.actions": embeddedActions });
};

export const handleEditEmbeddedAction = (sheet, event) => {
	event.preventDefault();

	const index = getEventIndex(event);
	if (index === null) return;

	const embeddedActions = sheet.item.system?.actions;
	if (!Array.isArray(embeddedActions) || !embeddedActions[index]) return;

	const fallbackWidth = sheet.constructor.DEFAULT_OPTIONS.position?.width ?? 760;
	const width = Number(sheet.position?.width ?? fallbackWidth) || fallbackWidth;
	const editor = new NalfaEmbeddedActionEditor({
		document: sheet.item,
		actionIndex: index,
		position: { width },
	});
	editor.render({ force: true });
};

export const handleRemoveEmbeddedAction = async (sheet, event) => {
	event.preventDefault();

	const index = getEventIndex(event);
	if (index === null) return;

	const embeddedActions = getEmbeddedActionsClone(sheet.item);
	if (!embeddedActions[index]) return;
	const actionName = getEmbeddedActionDisplayName(sheet, embeddedActions[index], index);

	const confirmed = await confirmActionDialog({
		title: "Supprimer l'action intégrée",
		content: `<p>Supprimer <strong>${foundry.utils.escapeHTML(actionName)}</strong> ?</p><p>Cette action sera retirée de l'objet.</p>`,
		confirmLabel: "Supprimer",
	});
	if (!confirmed) return;

	embeddedActions.splice(index, 1);
	await sheet.item.update({ "system.actions": embeddedActions });
};

export const handleEmbeddedActionDragStart = (sheet, event) => {
	const row = event.currentTarget;
	const index = Number(row.dataset.index ?? -1);
	if (!Number.isInteger(index) || index < 0) return;
	if (!event.dataTransfer) return;

	const embeddedActions = sheet.item.system?.actions;
	if (!Array.isArray(embeddedActions) || !embeddedActions[index]) return;

	const actionData = embeddedActions[index];
	const actionName = getEmbeddedActionDisplayName(sheet, actionData, index);
	const actorUuid = sheet.item.parent instanceof Actor ? sheet.item.parent.uuid : "";
	const payload = {
		type: HOTBAR_DROP_TYPE_EMBEDDED_ACTION,
		refType: ACTION_REF_TYPES.EMBEDDED_ACTION,
		itemUuid: sheet.item.uuid,
		actionIndex: index,
		actorUuid,
		actionName,
	};

	event.dataTransfer.setData("text/plain", JSON.stringify(payload));
	event.dataTransfer.effectAllowed = "copy";
};

export const handleUseEmbeddedAction = async (sheet, event) => {
	event.preventDefault();

	const index = getEventIndex(event);
	if (index === null) return;

	let actionData = sheet.item.system?.actions?.[index] ?? null;
	if (!actionData) return;

	if (actionData.always_refresh === true && hasEmbeddedActionSource(actionData)) {
		const refreshResult = await refreshEmbeddedActionAtIndex(sheet, index, {
			onlyIfAlwaysRefresh: true,
			notifyOnMissingSource: true,
			notifyWhenUpdated: false,
		});
		actionData = refreshResult.actionData ?? actionData;
	}

	const actor = resolveActorForEmbeddedAction(sheet);
	if (!actor) {
		ui.notifications.warn("Aucun acteur sélectionné.");
		return;
	}

	return executeActionPrompt({
		actor,
		actionData,
		sourceItem: sheet.item,
		titleName: getEmbeddedActionDisplayName(sheet, actionData, index),
		actionIndex: index,
	});
};

export const handleRefreshEmbeddedActionSource = async (sheet, event) => {
	event.preventDefault();

	const index = getEventIndex(event);
	if (index === null) return;

	const actionData = sheet.item.system?.actions?.[index] ?? null;
	if (!actionData || !hasEmbeddedActionSource(actionData)) {
		ui.notifications.warn("Cette action intégrée n'a pas de source liée.");
		return;
	}

	const isAutoEnabled = actionData.always_refresh === true;
	const dialogButtons = {
		syncNow: {
			label: "Synchroniser maintenant",
			callback: () => {
				void refreshEmbeddedActionAtIndex(sheet, index, {
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
				void setEmbeddedActionAlwaysRefresh(sheet, index, !isAutoEnabled, {
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
};

export const handleOpenEmbeddedActionSource = async (sheet, event) => {
	event.preventDefault();

	const index = getEventIndex(event);
	if (index === null) return;

	const actionData = sheet.item.system?.actions?.[index] ?? null;
	if (!actionData || !hasEmbeddedActionSource(actionData)) return;

	const sourceUuid = String(actionData.source_uuid ?? "").trim();
	const sourceItem = await fromUuid(sourceUuid);
	if (!(sourceItem instanceof Item) || sourceItem.type !== "Action") {
		notifyMissingEmbeddedActionSource();
		return;
	}

	sourceItem.sheet?.render({ force: true });
};

export const handleDetachEmbeddedActionSource = async (sheet, event) => {
	event.preventDefault();

	const index = getEventIndex(event);
	if (index === null) return;

	const embeddedActions = getEmbeddedActionsClone(sheet.item);
	if (!embeddedActions[index]) return;
	if (!hasEmbeddedActionSource(embeddedActions[index])) return;

	const actionName = getEmbeddedActionDisplayName(sheet, embeddedActions[index], index);
	const confirmed = await confirmActionDialog({
		title: "Détacher la source",
		content: `<p>Détacher la source de <strong>${foundry.utils.escapeHTML(actionName)}</strong> ?</p><p>L'action restera sur l'objet mais ne sera plus synchronisée.</p>`,
		confirmLabel: "Détacher",
	});
	if (!confirmed) return;

	embeddedActions[index] = clearEmbeddedActionSource(embeddedActions[index]);
	await sheet.item.update({ "system.actions": embeddedActions });
};
