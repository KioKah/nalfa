import {
	createEmbeddedActionFromSourceItem,
	getDefaultEmbeddedActionName,
	hasEmbeddedActionSource,
} from "../../actions/embedded.mjs";
import { ACTION_REF_TYPES } from "../../actions/refs.mjs";
import {
	rollAttack,
	rollDamageSet,
	rollInitiative,
	rollSkill,
} from "../index.mjs";
import { executeActionPrompt } from "./execution.mjs";

const getMacroActor = () => {
	return canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
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
