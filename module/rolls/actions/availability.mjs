import { getDefaultEmbeddedActionName } from "../../actions/embedded.mjs";
import { ITEM_TYPES_WITH_PHYSICAL } from "../../sheets/item/constants.mjs";
import {
	getEquippedSlotValue,
	isEquippedSlotLocked,
} from "../../sheets/item/equipment.mjs";
import { getActorStateProfile } from "../../rules/states.mjs";
import { getActionCooldownRemaining } from "../../actions/turnResources.mjs";

const ITEM_TYPE_PRIORITY = Object.freeze({
	Weapon: 0,
	Trinket: 1,
	Tool: 2,
	Backpack: 3,
	Consumable: 4,
	Book: 5,
	Loot: 6,
	Currency: 7,
});

const ACTION_EQUIPMENT_SLOTS = new Set(["main_hand", "off_hand", "body"]);

const normalizeActionName = (value) => {
	return String(value ?? "")
		.trim()
		.toLocaleLowerCase(game.i18n?.lang ?? undefined);
};

const compareLabels = (left = "", right = "") => {
	return String(left).localeCompare(String(right), game.i18n?.lang ?? undefined, {
		sensitivity: "base",
		numeric: true,
	});
};

const getMacroActor = () => {
	return game.user?.character ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
};

const hasInventoryEquipOptions = (item) => {
	if (item?.type === "Currency") return false;
	const equippable = item?.system?.equippable ?? {};
	return [...ACTION_EQUIPMENT_SLOTS].some((slot) => equippable[slot] === true);
};

const buildEquipmentRows = (actor) => {
	return [...(actor?.items ?? [])]
		.filter((item) => ITEM_TYPES_WITH_PHYSICAL.has(item.type))
		.map((item) => ({
			item,
			equippedSlot: getEquippedSlotValue(
				item.system?.equipped ?? {},
				item.system?.equippable ?? {},
			),
			isEquipLocked: isEquippedSlotLocked(item.system),
		}));
};

const compareEquipmentPriority = (left, right, slotKey) => {
	const leftTwoHanded =
		["main_hand", "off_hand"].includes(slotKey) && left.equippedSlot === "two_handed";
	const rightTwoHanded =
		["main_hand", "off_hand"].includes(slotKey) && right.equippedSlot === "two_handed";
	if (leftTwoHanded !== rightTwoHanded) return leftTwoHanded ? -1 : 1;

	if (left.isEquipLocked !== right.isEquipLocked) return left.isEquipLocked ? -1 : 1;

	const leftPriority = ITEM_TYPE_PRIORITY[left.item.type] ?? 99;
	const rightPriority = ITEM_TYPE_PRIORITY[right.item.type] ?? 99;
	if (leftPriority !== rightPriority) return leftPriority - rightPriority;

	const leftSort = Number(left.item.sort ?? 0);
	const rightSort = Number(right.item.sort ?? 0);
	if (Number.isFinite(leftSort) && Number.isFinite(rightSort) && leftSort !== rightSort) {
		return leftSort - rightSort;
	}

	return compareLabels(left.item.name, right.item.name);
};

const getEffectivelyEquippedItemUuids = (actor) => {
	const rows = buildEquipmentRows(actor);
	const effective = new Set();

	for (const slotKey of ["main_hand", "off_hand"]) {
		const occupants = rows
			.filter(
				(row) => row.equippedSlot === slotKey || row.equippedSlot === "two_handed",
			)
			.sort((left, right) => compareEquipmentPriority(left, right, slotKey));
		if (occupants[0]) effective.add(occupants[0].item.uuid);
	}

	for (const row of rows) {
		if (row.equippedSlot === "body") effective.add(row.item.uuid);
	}

	return effective;
};

const getAvailableActions = (actor) => {
	const effectiveEquipment = getEffectivelyEquippedItemUuids(actor);
	const availableActions = [];

	for (const item of actor?.items ?? []) {
		if (item.type === "Action") {
			availableActions.push({
				name: normalizeActionName(item.name),
				actionData: item.system,
			});
			continue;
		}

		const embeddedActions = Array.isArray(item.system?.actions)
			? item.system.actions
			: [];
		if (!embeddedActions.length) continue;
		if (hasInventoryEquipOptions(item) && !effectiveEquipment.has(item.uuid)) continue;

		for (let index = 0; index < embeddedActions.length; index += 1) {
			const actionName =
				String(embeddedActions[index]?.name ?? "").trim() ||
				getDefaultEmbeddedActionName(item.name, index);
			availableActions.push({
				name: normalizeActionName(actionName),
				actionData: embeddedActions[index],
			});
		}
	}

	return availableActions;
};

const toCostAmount = (value) => {
	const amount = Number(value);
	return Number.isFinite(amount) ? Math.max(0, amount) : 0;
};

export const getActionResourceAvailability = (actor, actionData = {}) => {
	const resources = actor?.system?.actions ?? {};
	const stateProfile = getActorStateProfile(actor);
	const resourceKeys = new Set();
	const reasons = [];
	const rawOptions = Array.isArray(actionData?.cost?.actions?.options)
		? actionData.cost.actions.options
		: [];
	const options = rawOptions.length ? rawOptions : [{}];
	const actionKeys = ["main", "secondary", "reaction", "interaction"];
	const usesReaction = options.some((option) => toCostAmount(option?.reaction) > 0);
	if (stateProfile.blocksAction) reasons.push("Un état empêche d'agir.");
	if (stateProfile.blocksAttack && actionData?.jdt?.enabled) {
		reasons.push("Un état empêche d'attaquer.");
	}

	for (const option of options) {
		for (const key of actionKeys) {
			if (toCostAmount(option?.[key]) > 0) resourceKeys.add(key);
		}
	}

	const payableOption = options.some((option) => {
		if (stateProfile.blocksReaction && toCostAmount(option?.reaction) > 0) {
			return false;
		}
		return actionKeys.every((key) => {
			const cost = toCostAmount(option?.[key]);
			return cost <= toCostAmount(resources?.[key]?.value);
		});
	});
	if (!payableOption) {
		const onlyReactionOptions = options.every(
			(option) => toCostAmount(option?.reaction) > 0,
		);
		if (stateProfile.blocksReaction && usesReaction && onlyReactionOptions) {
			reasons.push("Un état empêche les réactions.");
		} else {
			reasons.push("Actions du tour insuffisantes.");
		}
	}

	if (actionData?.concentration?.enabled) {
		if (stateProfile.blocksConcentration) {
			reasons.push("Un état empêche la concentration.");
		}
	}

	const movement = actionData?.cost?.movement ?? {};
	const movementMode = String(movement.mode ?? "none");
	if (movementMode !== "none") resourceKeys.add("movement");
	if (movementMode !== "none" && stateProfile.blocksMovement) {
		reasons.push("Un état empêche le déplacement.");
	}
	if (
		movementMode === "fixed" &&
		toCostAmount(resources?.movement?.value) < toCostAmount(movement.amount)
	) {
		reasons.push("Déplacement insuffisant.");
	}

	const nalfaCost = toCostAmount(actionData?.cost?.nalfa?.amount);
	if (nalfaCost > 0) {
		resourceKeys.add("nalfa");
		if (toCostAmount(actor?.system?.nalfa?.value) < nalfaCost) {
			reasons.push("Nalfa insuffisant.");
		}
	}

	const uses = actionData?.cost?.uses ?? {};
	const usesMax = toCostAmount(uses.max);
	if (usesMax > 0 && toCostAmount(uses.value) < 1) {
		reasons.push("Aucune utilisation restante.");
	}
	if (getActionCooldownRemaining(actionData) > 0) {
		reasons.push("Action en recharge.");
	}

	return {
		available: reasons.length === 0,
		reason: reasons.join(" "),
		resourceKeys: [...resourceKeys],
	};
};

const getSourceActionName = ({ sourceItem, actionRef, fallbackName = "" } = {}) => {
	if (sourceItem?.type === "Action") return String(sourceItem.name ?? "").trim();

	const actionIndex = Number(actionRef?.actionIndex ?? -1);
	const actionData = sourceItem?.system?.actions?.[actionIndex];
	if (actionData) {
		return (
			String(actionData.name ?? "").trim() ||
			getDefaultEmbeddedActionName(sourceItem.name, actionIndex)
		);
	}

	return String(fallbackName ?? "").trim();
};

const getSourceItem = (actionRef) => {
	const itemUuid = String(actionRef?.itemUuid ?? "").trim();
	if (!itemUuid || typeof fromUuidSync !== "function") return null;

	try {
		return fromUuidSync(itemUuid);
	} catch {
		return null;
	}
};

export const getActionAvailability = ({
	actor = getMacroActor(),
	actionRef,
	actionName,
} = {}) => {
	if (!(actor instanceof Actor)) {
		return {
			available: false,
			reason: "Aucun personnage attribué ni token sélectionné.",
		};
	}

	const sourceItem = getSourceItem(actionRef);
	const resolvedName = getSourceActionName({
		sourceItem,
		actionRef,
		fallbackName: actionName,
	});
	const normalizedName = normalizeActionName(resolvedName);
	if (!normalizedName) {
		return {
			available: false,
			reason: "Le nom de l'action est introuvable.",
		};
	}
	if (sourceItem?.parent === actor) {
		if (hasInventoryEquipOptions(sourceItem)) {
			const effectiveEquipment = getEffectivelyEquippedItemUuids(actor);
			if (!effectiveEquipment.has(sourceItem.uuid)) {
				return {
					available: false,
					reason: `L'objet source « ${sourceItem.name} » n'est pas équipé.`,
				};
			}
		}

		const actionIndex = Number(actionRef?.actionIndex ?? -1);
		const exactActionData =
			sourceItem.type === "Action"
				? sourceItem.system
				: sourceItem.system?.actions?.[actionIndex];
		if (exactActionData) {
			return getActionResourceAvailability(actor, exactActionData);
		}
	}

	const availableAction = getAvailableActions(actor).find(
		(action) => action.name === normalizedName,
	);
	if (availableAction) {
		return getActionResourceAvailability(actor, availableAction.actionData);
	}

	const effectiveEquipment = getEffectivelyEquippedItemUuids(actor);
	const unavailableItem = [...(actor.items ?? [])].find((item) => {
		if (!hasInventoryEquipOptions(item) || effectiveEquipment.has(item.uuid))
			return false;
		return (item.system?.actions ?? []).some((actionData, index) => {
			const name =
				String(actionData?.name ?? "").trim() ||
				getDefaultEmbeddedActionName(item.name, index);
			return normalizeActionName(name) === normalizedName;
		});
	});
	if (unavailableItem) {
		return {
			available: false,
			reason: `L'objet « ${unavailableItem.name} » qui porte cette action n'est pas équipé.`,
		};
	}

	return {
		available: false,
		reason: `L'action « ${resolvedName} » ne figure pas dans les actions disponibles de ${actor.name}.`,
	};
};

export { getMacroActor };
