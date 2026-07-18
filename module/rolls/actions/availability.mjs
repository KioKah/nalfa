import { getDefaultEmbeddedActionName } from "../../actions/embedded.mjs";
import {
	ITEM_TYPES_WITH_PHYSICAL,
} from "../../sheets/item/constants.mjs";
import { getEquippedSlotValue, isEquippedSlotLocked } from "../../sheets/item/equipment.mjs";

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
				(row) =>
					row.equippedSlot === slotKey || row.equippedSlot === "two_handed",
			)
			.sort((left, right) => compareEquipmentPriority(left, right, slotKey));
		if (occupants[0]) effective.add(occupants[0].item.uuid);
	}

	for (const row of rows) {
		if (row.equippedSlot === "body") effective.add(row.item.uuid);
	}

	return effective;
};

const getAvailableActionNames = (actor) => {
	const effectiveEquipment = getEffectivelyEquippedItemUuids(actor);
	const names = new Set();

	for (const item of actor?.items ?? []) {
		if (item.type === "Action") {
			names.add(normalizeActionName(item.name));
			continue;
		}

		const actions = Array.isArray(item.system?.actions) ? item.system.actions : [];
		if (!actions.length) continue;
		if (hasInventoryEquipOptions(item) && !effectiveEquipment.has(item.uuid)) continue;

		for (let index = 0; index < actions.length; index += 1) {
			const actionName =
				String(actions[index]?.name ?? "").trim() ||
				getDefaultEmbeddedActionName(item.name, index);
			names.add(normalizeActionName(actionName));
		}
	}

	return names;
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

export const getActionAvailability = ({ actor = getMacroActor(), actionRef, actionName } = {}) => {
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

	const availableNames = getAvailableActionNames(actor);
	if (availableNames.has(normalizedName)) {
		return { available: true, reason: "" };
	}

	if (sourceItem?.parent === actor && hasInventoryEquipOptions(sourceItem)) {
		const effectiveEquipment = getEffectivelyEquippedItemUuids(actor);
		if (!effectiveEquipment.has(sourceItem.uuid)) {
			return {
				available: false,
				reason: `L'objet source « ${sourceItem.name} » n'est pas équipé.`,
			};
		}
	}

	const effectiveEquipment = getEffectivelyEquippedItemUuids(actor);
	const unavailableItem = [...(actor.items ?? [])].find((item) => {
		if (!hasInventoryEquipOptions(item) || effectiveEquipment.has(item.uuid)) return false;
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
