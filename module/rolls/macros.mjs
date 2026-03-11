import {
	rollAttack,
	rollDamageSet,
	rollInitiative,
	rollSkill,
} from "./rolls.mjs";
import { executeActionPrompt } from "./actionExecution.mjs";
import {
	createEmbeddedActionFromSourceItem,
	getDefaultEmbeddedActionName,
	hasEmbeddedActionSource,
} from "../embeddedActions.mjs";
import {
	ACTION_REF_TYPES,
	HOTBAR_DROP_TYPE_EMBEDDED_ACTION,
} from "../actionRefs.mjs";

const getMacroActor = () => {
	return (
		canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null
	);
};

const ensureActor = () => {
	const actor = getMacroActor();
	if (!actor) {
		ui.notifications.warn("Aucun acteur sélectionné.");
	}
	return actor;
};

const resolveActorFromUuid = async (actorUuid) => {
	const uuid = String(actorUuid ?? "").trim();
	if (!uuid) return null;

	const actor = await fromUuid(uuid);
	return actor instanceof Actor ? actor : null;
};

const resolveActionActor = async (actorUuid) => {
	const linkedActor = await resolveActorFromUuid(actorUuid);
	if (linkedActor) return linkedActor;

	const fallbackActor = getMacroActor();
	if (!fallbackActor) {
		ui.notifications.warn("Aucun acteur sélectionné.");
		return null;
	}

	return fallbackActor;
};

const buildActionMacroCommand = (actionRef) => {
	return `game.nalfa.macros.runActionRef(${JSON.stringify(actionRef)});`;
};

const createOrAssignMacro = async ({ slot, name, command, img }) => {
	let macro = game.macros.find((entry) => entry.name === name && entry.command === command);

	if (!macro) {
		macro = await Macro.create({
			name,
			type: "script",
			img: img || "icons/svg/dice-target.svg",
			command,
		});
	}

	await game.user.assignHotbarMacro(macro, Number(slot));
	return macro;
};

const getActionItemFromDropData = async (dropData) => {
	if (dropData?.type !== "Item") return null;

	const item = await Item.implementation.fromDropData(dropData);
	if (!(item instanceof Item) || item.type !== "Action") return null;
	return item;
};

const parseJsonLike = (value) => {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;

	try {
		const parsed = JSON.parse(trimmed);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
};

const normalizeDropData = (dropData) => {
	if (!dropData) return {};
	if (typeof dropData === "string") return parseJsonLike(dropData) ?? {};

	const objectData =
		typeof dropData === "object" && dropData !== null ? foundry.utils.deepClone(dropData) : {};

	if (objectData.type || objectData.refType) return objectData;

	const candidates = [objectData.data, objectData.payload, objectData.text, objectData.value];
	for (const candidate of candidates) {
		const parsed = parseJsonLike(candidate);
		if (parsed) return parsed;
	}

	return objectData;
};

const parseEmbeddedActionDropRef = (dropData) => {
	const normalized = normalizeDropData(dropData);
	if (normalized?.type !== HOTBAR_DROP_TYPE_EMBEDDED_ACTION) return null;

	const itemUuid = String(normalized.itemUuid ?? "").trim();
	const actionIndex = Number(normalized.actionIndex ?? -1);
	const actorUuid = String(normalized.actorUuid ?? "").trim();
	const actionName = String(normalized.actionName ?? "").trim();

	if (!itemUuid || !Number.isInteger(actionIndex) || actionIndex < 0) return null;

	return {
		actionRef: {
			refType: ACTION_REF_TYPES.EMBEDDED_ACTION,
			itemUuid,
			actionIndex,
			actorUuid,
		},
		actionName,
	};
};

const getEmbeddedActionAt = (item, actionIndex) => {
	const actions = item?.system?.actions;
	if (!Array.isArray(actions) || !actions[actionIndex]) return null;
	return actions[actionIndex];
};

const refreshEmbeddedActionFromLinkedSource = async ({
	item,
	actionIndex,
	actionData,
	forceRefresh = false,
} = {}) => {
	if (!item || !actionData) {
		return {
			actionData,
			sourceItem: null,
			refreshed: false,
		};
	}

	const hasSource = hasEmbeddedActionSource(actionData);
	const shouldRefresh = forceRefresh || actionData.always_refresh === true;
	if (!hasSource || !shouldRefresh) {
		return {
			actionData,
			sourceItem: null,
			refreshed: false,
		};
	}

	const sourceUuid = String(actionData.source_uuid ?? "").trim();
	const sourceItem = await fromUuid(sourceUuid);
	if (!(sourceItem instanceof Item) || sourceItem.type !== "Action") {
		ui.notifications.warn("La source de cette action intégrée est introuvable.");
		return {
			actionData,
			sourceItem: null,
			refreshed: false,
		};
	}

	const alwaysRefresh = actionData.always_refresh === true;
	const nextAction = createEmbeddedActionFromSourceItem(sourceItem, {
		alwaysRefresh,
	});
	const hasChanged = JSON.stringify(nextAction) !== JSON.stringify(actionData);
	if (!hasChanged) {
		return {
			actionData,
			sourceItem,
			refreshed: false,
		};
	}

	const currentActions = Array.isArray(item.system?.actions)
		? foundry.utils.deepClone(item.system.actions)
		: [];
	if (!currentActions[actionIndex]) {
		return {
			actionData,
			sourceItem,
			refreshed: false,
		};
	}

	currentActions[actionIndex] = nextAction;
	await item.update({ "system.actions": currentActions });

	return {
		actionData: currentActions[actionIndex],
		sourceItem,
		refreshed: true,
	};
};

const buildEmbeddedActionTitle = ({ item, actionData, actionIndex }) => {
	const storedName = String(actionData?.name ?? "").trim();
	if (storedName) return storedName;

	return getDefaultEmbeddedActionName(item?.name ?? "", actionIndex);
};

export const createHotbarMacro = async (dropData, slot) => {
	const normalizedDropData = normalizeDropData(dropData);
	const embeddedActionDrop = parseEmbeddedActionDropRef(normalizedDropData);
	if (embeddedActionDrop) {
		const macroName =
			embeddedActionDrop.actionName ||
			`Action ${Number(embeddedActionDrop.actionRef.actionIndex) + 1}`;
		const command = buildActionMacroCommand(embeddedActionDrop.actionRef);
		await createOrAssignMacro({
			slot,
			name: `Action: ${macroName}`,
			command,
		});
		return false;
	}

	const actionItem = await getActionItemFromDropData(normalizedDropData);
	if (!actionItem) return true;

	const actorUuid = actionItem.parent instanceof Actor ? actionItem.parent.uuid : "";
	const actionRef = {
		refType: ACTION_REF_TYPES.ACTION_ITEM,
		itemUuid: actionItem.uuid,
		actorUuid,
	};
	const command = buildActionMacroCommand(actionRef);
	await createOrAssignMacro({
		slot,
		name: `Action: ${actionItem.name}`,
		command,
		img: actionItem.img,
	});

	return false;
};

export const runActionRef = async (actionRef = {}) => {
	const refType = String(actionRef?.refType ?? "").trim();

	if (refType === ACTION_REF_TYPES.ACTION_ITEM) {
		const item = await fromUuid(String(actionRef.itemUuid ?? ""));
		if (!(item instanceof Item) || item.type !== "Action") {
			ui.notifications.warn("Action introuvable.");
			return null;
		}

		const actor = await resolveActionActor(actionRef.actorUuid);
		if (!actor) return null;

		return executeActionPrompt({
			actor,
			actionData: item.system,
			sourceItem: item,
			titleName: item.name,
		});
	}

	if (refType === ACTION_REF_TYPES.EMBEDDED_ACTION) {
		const item = await fromUuid(String(actionRef.itemUuid ?? ""));
		if (!(item instanceof Item)) {
			ui.notifications.warn("Objet porteur introuvable.");
			return null;
		}

		const actionIndex = Number(actionRef.actionIndex ?? -1);
		if (!Number.isInteger(actionIndex) || actionIndex < 0) {
			ui.notifications.warn("Index d'action intégrée invalide.");
			return null;
		}

		let actionData = getEmbeddedActionAt(item, actionIndex);
		if (!actionData) {
			ui.notifications.warn("Action intégrée introuvable.");
			return null;
		}

		const linkedActor = await resolveActorFromUuid(actionRef.actorUuid);
		const parentActor = item.parent instanceof Actor ? item.parent : null;
		const actor = linkedActor ?? parentActor ?? getMacroActor();
		if (!actor) {
			ui.notifications.warn("Aucun acteur sélectionné.");
			return null;
		}

		const refreshResult = await refreshEmbeddedActionFromLinkedSource({
			item,
			actionIndex,
			actionData,
		});
		actionData = refreshResult.actionData ?? actionData;

		return executeActionPrompt({
			actor,
			actionData,
			sourceItem: item,
			titleName: buildEmbeddedActionTitle({ item, actionData, actionIndex }),
			actionIndex,
		});
	}

	ui.notifications.warn("Reference d'action non prise en charge.");
	return null;
};

export const rollSkillMacro = async (skillKey) => {
	const actor = ensureActor();
	if (!actor) return null;
	if (!skillKey) {
		ui.notifications.warn("Choisis une compétence (ex: 'athlet').");
		return null;
	}
	return rollSkill(actor, skillKey);
};

export const rollInitiativeMacro = async () => {
	const actor = ensureActor();
	if (!actor) return null;
	return rollInitiative(actor);
};

export const rollBasicAttackMacro = async () => {
	const actor = ensureActor();
	if (!actor) return null;
	return rollAttack(actor, "physical");
};

export const rollBasicDamageMacro = async () => {
	const actor = ensureActor();
	if (!actor) return null;
	return rollDamageSet(actor);
};
