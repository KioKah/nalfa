import {
	rollAttack,
	rollDamageSet,
	rollConcentration,
	rollSavePrompt,
	rollSkill,
	rollStatSave,
} from "../rolls/index.mjs";
import { ACTION_REF_TYPES, HOTBAR_DROP_TYPE_EMBEDDED_ACTION } from "../actions/refs.mjs";
import { getDefaultEmbeddedActionName } from "../actions/embedded.mjs";
import {
	executeActionConcentrationPrompt,
	executeActionPrompt,
} from "../rolls/actions/execution.mjs";
import {
	getActionAvailability,
	getActionResourceAvailability,
} from "../rolls/actions/availability.mjs";
import {
	createHotbarMacro,
	getActionMacroPresentation,
	isNalfaHotbarDrop,
} from "../rolls/actions/hotbar.mjs";
import { buildEmbeddedActionRow } from "./item/context/actions.mjs";
import {
	EQUIP_SLOT_COIN_POUCH,
	EQUIP_SLOT_KEYS,
	EQUIP_SLOT_NONE,
	EQUIP_SLOT_OPTIONS,
	ITEM_TYPES_WITH_PHYSICAL,
} from "./item/constants.mjs";
import {
	buildEquippedSlotUpdate,
	getEquippedOptions,
	getEquippedSlotValue,
	isEquippedSlotLocked,
} from "./item/equipment.mjs";
import { bindImageEditContextMenu } from "./imageEdit.mjs";
import { openRichTextEditorDialog } from "./item/dialogs/richTextDialog.mjs";
import {
	getFatigueEffects,
	getFatigueHealthMax,
	getFatigueSummary,
	getRestRecoveryAmount,
	getRestResult,
} from "../rules/fatigue.mjs";
import {
	buildActorStateRows,
	buildNalfaStateEffect,
	getActorStateProfile,
	getNalfaStateOptions,
} from "../rules/states.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const { DialogV2 } = foundry.applications.api;

const ACTION_BROWSER_DEFAULTS = Object.freeze({
	query: "",
	sort: "name",
	group: "none",
});

const ACTION_BROWSER_SORT_OPTIONS = Object.freeze([
	{ value: "name", label: "Nom" },
	{ value: "source", label: "Source" },
	{ value: "cost", label: "Coût" },
	{ value: "kind", label: "Type" },
	{ value: "spell", label: "Type de sort" },
]);

const ACTION_BROWSER_GROUP_OPTIONS = Object.freeze([
	{ value: "none", label: "Aucun" },
	{ value: "source", label: "Source" },
	{ value: "spell", label: "Type de sort" },
	{ value: "cost", label: "Coût" },
	{ value: "kind", label: "Type" },
]);

const COMBAT_RESOURCE_META = Object.freeze([
	{
		key: "main",
		shortLabel: "Principale",
		iconClass: "fa-light fa-sword",
	},
	{
		key: "secondary",
		shortLabel: "Secondaire",
		iconClass: "fa-light fa-plus",
	},
	{
		key: "reaction",
		shortLabel: "Réaction",
		iconClass: "fa-light fa-rotate-left",
	},
	{
		key: "concentration",
		shortLabel: "Concentration",
		iconClass: "fa-light fa-bullseye",
	},
	{
		key: "movement",
		shortLabel: "Déplacement",
		iconClass: "fa-light fa-person-running",
	},
	{
		key: "interaction",
		shortLabel: "Interaction simple",
		iconClass: "fa-light fa-hand",
	},
]);

const INVENTORY_BROWSER_DEFAULTS = Object.freeze({
	query: "",
	sort: "type",
	group: "type",
});

const INVENTORY_BROWSER_SORT_OPTIONS = Object.freeze([
	{ value: "name", label: "Nom" },
	{ value: "type", label: "Type" },
	{ value: "equipped", label: "Équipement" },
	{ value: "weight", label: "Poids" },
	{ value: "quantity", label: "Quantité" },
]);

const INVENTORY_BROWSER_GROUP_OPTIONS = Object.freeze([
	{ value: "none", label: "Aucun" },
	{ value: "type", label: "Type" },
	{ value: "equipped", label: "Équipement" },
]);

const INVENTORY_TYPE_LABELS = Object.freeze({
	Weapon: "Arme",
	Trinket: "Bibelot",
	Tool: "Outil",
	Backpack: "Sac",
	Consumable: "Consommable",
	Loot: "Butin",
	Book: "Livre",
	Currency: "Monnaie",
});

const INVENTORY_EQUIPMENT_SLOT_OPTIONS = Object.freeze(
	EQUIP_SLOT_OPTIONS.filter(({ key }) => ["main_hand", "off_hand", "body"].includes(key)),
);

const INVENTORY_EQUIPPED_SLOT_KEYS = new Set([
	"main_hand",
	"off_hand",
	"two_handed",
	"body",
]);

const INVENTORY_HAND_SLOT_KEYS = new Set(["main_hand", "off_hand"]);

const INVENTORY_ITEM_TYPE_PRIORITY = Object.freeze({
	Weapon: 0,
	Trinket: 1,
	Tool: 2,
	Backpack: 3,
	Consumable: 4,
	Book: 5,
	Loot: 6,
	Currency: 7,
});

const normalizeActionSearch = (value = "") => {
	return String(value ?? "")
		.trim()
		.toLocaleLowerCase(game.i18n?.lang ?? undefined);
};

const makeSelectedOptions = (options, selectedValue) => {
	return options.map((option) => ({
		...option,
		selected: option.value === selectedValue,
	}));
};

const getActionSpellTypeLabel = (actionData = {}) => {
	const nalfaCategory =
		String(actionData?.cost?.nalfa?.category ?? "minor").trim() || "minor";
	const nalfaAmount = Number(actionData?.cost?.nalfa?.amount ?? 0);
	if (!(nalfaAmount > 0)) return "Non-sort";
	return (
		String(
			CONFIG.nalfa.nalfa_cost_categories?.[nalfaCategory] ?? nalfaCategory,
		).trim() || "Mineur"
	);
};

const getActionCostLabel = (actionData = {}) => {
	const options = Array.isArray(actionData?.cost?.actions?.options)
		? actionData.cost.actions.options
		: [];
	const option = options.find((entry) => {
		return [entry?.main, entry?.secondary, entry?.reaction, entry?.interaction].some(
			(value) => Number(value) > 0,
		);
	});
	if (!option) return "Principale";

	const parts = [];
	if (Number(option.main) > 0) parts.push("Principale");
	if (Number(option.secondary) > 0) parts.push("Secondaire");
	if (Number(option.reaction) > 0) parts.push("Réaction");
	if (Number(option.interaction) > 0) parts.push("Interaction simple");
	return parts.join(" + ") || "Principale";
};

const pluralizeActionCount = (count) => `${count} action${count > 1 ? "s" : ""}`;

const pluralizeInventoryCount = (count) => `${count} objet${count > 1 ? "s" : ""}`;

const formatFormulaNumber = (value) => {
	const number = Number(value);
	if (!Number.isFinite(number) || number === 0) return "";
	return number >= 0 ? `+${number}` : String(number);
};

const formatProfileFormula = (profileLabel, valueObj = {}) => {
	const profileValue = Number(valueObj.profile ?? 0);
	const baseValue = Number(valueObj.used_base ?? valueObj.base ?? 0);
	const altValue = Number(valueObj.alt ?? 0);
	const parts = [];
	if (Number.isFinite(profileValue) && profileValue !== 0) {
		parts.push(profileLabel);
	}

	if (Number.isFinite(baseValue) && baseValue !== 0) {
		parts.push(parts.length === 0 ? String(baseValue) : formatFormulaNumber(baseValue));
	}

	if (Number.isFinite(altValue) && altValue !== 0) {
		parts.push(parts.length === 0 ? String(altValue) : formatFormulaNumber(altValue));
	}

	return parts.join("") || profileLabel;
};

const buildCombatResources = (sysData) => {
	return COMBAT_RESOURCE_META.map((meta) => {
		const resource = sysData.actions?.[meta.key] ?? {};
		const value = Number(resource.value ?? 0);
		const max = Number(resource.max ?? 0);
		const safeValue = Number.isFinite(value) ? value : 0;
		const safeMax = Number.isFinite(max) ? Math.max(0, max) : 0;
		const percent =
			safeMax > 0 ? Math.min(100, Math.max(0, (safeValue / safeMax) * 100)) : 0;

		return {
			...meta,
			label: CONFIG.nalfa.actions?.[meta.key] ?? meta.shortLabel,
			value: safeValue,
			max: safeMax,
			percent: Math.round(percent * 100) / 100,
			rangeValue: Math.min(safeMax, Math.max(0, safeValue)),
			hasCapacity: safeMax > 0,
			step: meta.key === "movement" ? "any" : 1,
			unit: meta.key === "movement" ? "m" : "",
			isMovement: meta.key === "movement",
			valueLabel:
				meta.key === "movement"
					? formatCombatDecimal(safeValue)
					: String(safeValue),
			maxLabel:
				meta.key === "movement" ? formatCombatDecimal(safeMax) : String(safeMax),
			base: Number(resource.base ?? 0),
			alt: Number(resource.alt ?? 0),
			altMult: Number(resource.alt_mult ?? 1),
		};
	});
};

const formatCombatDecimal = (value) => {
	const number = Number(value);
	if (!Number.isFinite(number)) return "0";
	return new Intl.NumberFormat("fr-FR", {
		maximumFractionDigits: 2,
		useGrouping: false,
	}).format(number);
};

const getActionRefKey = (actionRef = {}) => {
	const refType = String(actionRef.refType ?? "");
	const itemUuid = String(actionRef.itemUuid ?? "");
	if (!refType || !itemUuid) return "";
	const actionIndex = Number(actionRef.actionIndex ?? -1);
	return `${refType}:${itemUuid}:${Number.isInteger(actionIndex) ? actionIndex : -1}`;
};

const getActorActionRef = (action) => ({
	refType: action.embeddedAction?.refType,
	itemUuid: action.embeddedAction?.itemUuid,
	actionIndex: action.embeddedAction?.actionIndex,
});

const buildReserveAction = (actor, action) => {
	const actionRef = getActorActionRef(action);
	const actionKey = getActionRefKey(actionRef);
	const resourceAvailability = getActionResourceAvailability(actor, action.actionData);
	const availability = getActionAvailability({
		actor,
		actionRef,
		actionName: action.embeddedAction?.displayName,
	});
	const unavailableReason = availability.available ? "" : availability.reason;

	return {
		actionKey,
		name: action.embeddedAction?.displayName ?? action.item?.name ?? "Action",
		img: action.itemImage,
		shorthandHtml: action.embeddedAction?.displayShorthandHtml ?? "",
		available: availability.available,
		tooltip: unavailableReason
			? `${action.embeddedAction?.displayName}\n${unavailableReason}`
			: action.embeddedAction?.displayName,
		resourceKeys: resourceAvailability.resourceKeys.join(" "),
		refType: actionRef.refType,
		itemUuid: actionRef.itemUuid,
		actionIndex: actionRef.actionIndex,
		actionName: action.embeddedAction?.displayName,
		actionShorthand: action.embeddedAction?.actionShorthand,
		sourceUuid: action.embeddedAction?.sourceUuid,
	};
};

const buildCombatHotbar = (actor, actorActions) => {
	const reserveActions = actorActions.map((action) => buildReserveAction(actor, action));
	const actorActionByKey = new Map(
		reserveActions.map((action) => [action.actionKey, action]),
	);
	const assignedActorActionKeys = new Set();
	const hotbar = game.user?.hotbar ?? {};
	const slots = Array.from({ length: 50 }, (_, index) => {
		const slot = index + 1;
		const occupied = Object.hasOwn(hotbar, slot);
		const macroId = occupied ? String(hotbar[slot] ?? "") : "";
		const macro = macroId ? (game.macros?.get(macroId) ?? null) : null;
		const presentation = getActionMacroPresentation(macro, { actor });
		const actionKey = getActionRefKey(presentation?.actionRef);
		const actorAction = actorActionByKey.get(actionKey) ?? null;
		if (actorAction) assignedActorActionKeys.add(actionKey);
		const available = presentation?.availability?.available ?? true;
		const unavailableReason = available
			? ""
			: (presentation?.availability?.reason ?? "Action indisponible.");

		return {
			slot,
			page: Math.ceil(slot / 10),
			occupied,
			missing: occupied && !macro,
			macroId,
			macroUuid: macro?.uuid ?? "",
			isAction: Boolean(presentation),
			actionKey: actionKey || `macro:${macroId}`,
			name: macro?.name ?? (occupied ? "Macro introuvable" : ""),
			img: macro?.img ?? "icons/svg/hazard.svg",
			shorthand: presentation?.displayShorthand ?? "",
			available,
			tooltip:
				occupied && !macro
					? "Macro introuvable"
					: unavailableReason
						? `${macro?.name ?? "Action"}\n${unavailableReason}`
						: (macro?.name ?? ""),
			resourceKeys:
				actorAction?.resourceKeys ??
				presentation?.availability?.resourceKeys?.join(" ") ??
				"",
		};
	});
	const reserve = reserveActions.filter(
		(action) => !assignedActorActionKeys.has(action.actionKey),
	);

	return {
		slots,
		reserve,
		hasReserve: reserve.length > 0,
	};
};

const buildActionBrowserCountLabel = ({ query, visibleCount, totalCount }) => {
	if (!String(query ?? "").trim()) return pluralizeActionCount(totalCount);

	const resultLabel = `${visibleCount} résultat${visibleCount > 1 ? "s" : ""}`;
	return `${resultLabel} (/${totalCount})`;
};

const compareActionLabels = (left = "", right = "") => {
	return String(left).localeCompare(String(right), game.i18n?.lang ?? undefined, {
		sensitivity: "base",
		numeric: true,
	});
};

const compareInventoryLabels = compareActionLabels;

const getInventoryTypeLabel = (item) => {
	const type = String(item?.type ?? "").trim();
	return CONFIG.nalfa.item_types?.[type] ?? INVENTORY_TYPE_LABELS[type] ?? type;
};

const getEquipSlotLabel = (slot) => {
	return EQUIP_SLOT_OPTIONS.find((option) => option.key === slot)?.label ?? "Non équipé";
};

const getInventoryEquippedGroupLabel = (row) => {
	if (!row.canEquip) return "Non équipable";
	if (row.isEffectivelyEquipped) return `Équipé - ${row.equippedSlotLabel}`;
	if (row.isEquipped) return `Conflit - ${row.equippedSlotLabel}`;
	return "Non équipé";
};

const hasInventoryEquipOptions = (item) => {
	const equippable = item.system?.equippable ?? {};
	return [...INVENTORY_EQUIPPED_SLOT_KEYS].some((slot) => equippable[slot] === true);
};

const toInventoryNumber = (value, fallback = 0) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

const buildInventoryRow = (item, { isEditable = false } = {}) => {
	const equippableState = item.system?.equippable ?? {};
	const equippedState = item.system?.equipped ?? {};
	const rawEquippedSlot = getEquippedSlotValue(equippedState, equippableState);
	const equippedSlot = INVENTORY_EQUIPPED_SLOT_KEYS.has(rawEquippedSlot)
		? rawEquippedSlot
		: EQUIP_SLOT_NONE;
	const equippedOptions = getEquippedOptions(equippableState).filter(
		(option) => option.key !== EQUIP_SLOT_COIN_POUCH,
	);
	const canEquip =
		item.type !== "Currency" &&
		equippedOptions.some((option) => option.key !== EQUIP_SLOT_NONE);
	const isEquipped = equippedSlot !== EQUIP_SLOT_NONE;
	const isEquipLocked = isEquippedSlotLocked(item.system);
	const typeLabel = getInventoryTypeLabel(item);
	const quantity = toInventoryNumber(item.system?.quantity, 1);
	const weight = toInventoryNumber(item.system?.weight, 0);
	const totalWeight = toInventoryNumber(item.system?.total_weight, weight * quantity);
	const equippedSlotLabel = isEquipped ? getEquipSlotLabel(equippedSlot) : "Non équipé";
	const canChangeEquippedSlot =
		isEditable && item.type !== "Currency" && canEquip && !isEquipLocked;
	const searchableText = [
		item.name,
		typeLabel,
		equippedSlotLabel,
		canEquip ? "equipable" : "non equipable",
		String(quantity),
		String(weight),
		String(totalWeight),
	]
		.filter(Boolean)
		.join(" ");

	return {
		item,
		itemUuid: item.uuid,
		itemImage: item.img,
		name: item.name,
		type: item.type,
		typeLabel,
		quantity,
		weight,
		totalWeight,
		equippedSlot,
		equippedSlotLabel,
		equippedOptions,
		canEquip,
		isEquipped,
		isEffectivelyEquipped: false,
		isEquipmentLoser: false,
		isEquipLocked,
		canChangeEquippedSlot,
		effectiveSlots: [],
		lostSlots: [],
		cssClass: "",
		searchText: normalizeActionSearch(searchableText),
	};
};

const compareEquipmentPriority = (left, right, slotKey) => {
	const leftTwoHanded =
		INVENTORY_HAND_SLOT_KEYS.has(slotKey) && left.equippedSlot === "two_handed";
	const rightTwoHanded =
		INVENTORY_HAND_SLOT_KEYS.has(slotKey) && right.equippedSlot === "two_handed";
	if (leftTwoHanded !== rightTwoHanded) return leftTwoHanded ? -1 : 1;

	if (left.isEquipLocked !== right.isEquipLocked) return left.isEquipLocked ? -1 : 1;

	const leftTypePriority = INVENTORY_ITEM_TYPE_PRIORITY[left.type] ?? 99;
	const rightTypePriority = INVENTORY_ITEM_TYPE_PRIORITY[right.type] ?? 99;
	if (leftTypePriority !== rightTypePriority) return leftTypePriority - rightTypePriority;

	const leftSort = Number(left.item?.sort ?? 0);
	const rightSort = Number(right.item?.sort ?? 0);
	if (Number.isFinite(leftSort) && Number.isFinite(rightSort) && leftSort !== rightSort) {
		return leftSort - rightSort;
	}

	return compareInventoryLabels(left.name, right.name);
};

const resolveInventoryEquipment = (rows) => {
	const rowState = new Map(
		rows.map((row) => [
			row.itemUuid,
			{
				effectiveSlots: new Set(),
				lostSlots: new Set(),
			},
		]),
	);

	for (const slotKey of ["main_hand", "off_hand"]) {
		const occupants = rows
			.filter(
				(row) => row.equippedSlot === slotKey || row.equippedSlot === "two_handed",
			)
			.sort((left, right) => compareEquipmentPriority(left, right, slotKey));
		if (!occupants.length) continue;

		const winner = occupants[0];
		rowState.get(winner.itemUuid)?.effectiveSlots.add(slotKey);
		for (const loser of occupants.slice(1)) {
			rowState.get(loser.itemUuid)?.lostSlots.add(slotKey);
		}
	}

	for (const row of rows.filter((entry) => entry.equippedSlot === "body")) {
		rowState.get(row.itemUuid)?.effectiveSlots.add("body");
	}

	return rows.map((row) => {
		const state = rowState.get(row.itemUuid) ?? {
			effectiveSlots: new Set(),
			lostSlots: new Set(),
		};
		const effectiveSlots = [...state.effectiveSlots];
		const lostSlots = [...state.lostSlots];
		const isEffectivelyEquipped = effectiveSlots.length > 0;
		const isEquipmentLoser = lostSlots.length > 0;

		return {
			...row,
			effectiveSlots,
			lostSlots,
			isEffectivelyEquipped,
			isEquipmentLoser,
			cssClass: [
				isEffectivelyEquipped ? "actor-inventory__row--equipped" : "",
				isEquipmentLoser ? "actor-inventory__row--conflict" : "",
			]
				.filter(Boolean)
				.join(" "),
		};
	});
};

const buildInventoryEquipmentSlots = (rows) => {
	return INVENTORY_EQUIPMENT_SLOT_OPTIONS.map((option) => {
		const occupants = rows.filter((row) => {
			if (["main_hand", "off_hand"].includes(option.key)) {
				return row.equippedSlot === option.key || row.equippedSlot === "two_handed";
			}

			return row.equippedSlot === option.key;
		});
		const winners = occupants.filter((row) => row.effectiveSlots.includes(option.key));
		const losers = occupants.filter((row) => row.lostSlots.includes(option.key));
		const hasConflict = losers.length > 0;

		return {
			...option,
			occupants,
			winners,
			losers,
			winnerNames: winners.map((row) => row.name).join(", "),
			loserNames: losers.map((row) => row.name).join(", "),
			count: occupants.length,
			hasOccupants: winners.length > 0 || losers.length > 0,
			hasWinners: winners.length > 0,
			hasLosers: losers.length > 0,
			hasConflict,
			cssClass: hasConflict ? "actor-inventory__slot--conflict" : "",
		};
	});
};

const compareInventoryRows = (sortMode) => (left, right) => {
	if (sortMode === "type") {
		return (
			compareInventoryLabels(left.typeLabel, right.typeLabel) ||
			compareInventoryLabels(left.name, right.name)
		);
	}
	if (sortMode === "equipped") {
		return (
			Number(right.isEffectivelyEquipped) - Number(left.isEffectivelyEquipped) ||
			Number(right.isEquipmentLoser) - Number(left.isEquipmentLoser) ||
			compareInventoryLabels(left.equippedSlotLabel, right.equippedSlotLabel) ||
			compareInventoryLabels(left.name, right.name)
		);
	}
	if (sortMode === "weight") {
		return (
			right.totalWeight - left.totalWeight ||
			compareInventoryLabels(left.name, right.name)
		);
	}
	if (sortMode === "quantity") {
		return (
			right.quantity - left.quantity || compareInventoryLabels(left.name, right.name)
		);
	}
	return compareInventoryLabels(left.name, right.name);
};

const getInventoryGroupLabel = (row, groupMode) => {
	if (groupMode === "type") return row.typeLabel;
	if (groupMode === "equipped") return getInventoryEquippedGroupLabel(row);
	return "Inventaire";
};

const buildInventoryCountLabel = ({ query, visibleCount, totalCount }) => {
	if (!String(query ?? "").trim()) return pluralizeInventoryCount(totalCount);

	const resultLabel = `${visibleCount} résultat${visibleCount > 1 ? "s" : ""}`;
	return `${resultLabel} (/${totalCount})`;
};

const buildActorInventoryRows = (actor, { isEditable = false } = {}) => {
	const rows = [...(actor?.items ?? [])]
		.filter((item) => ITEM_TYPES_WITH_PHYSICAL.has(item.type))
		.map((item) => buildInventoryRow(item, { isEditable }))
		.sort(compareInventoryRows("type"));

	return resolveInventoryEquipment(rows);
};

const canShowEmbeddedActionsForItem = (item, inventoryRows) => {
	if (!hasInventoryEquipOptions(item)) return true;

	const inventoryRow = inventoryRows.find((row) => row.itemUuid === item.uuid);
	return inventoryRow?.isEffectivelyEquipped === true;
};

const buildActorInventoryBrowser = (inventoryRows, state) => {
	const query = normalizeActionSearch(state.query);
	const sort = INVENTORY_BROWSER_SORT_OPTIONS.some(
		(option) => option.value === state.sort,
	)
		? state.sort
		: INVENTORY_BROWSER_DEFAULTS.sort;
	const group = INVENTORY_BROWSER_GROUP_OPTIONS.some(
		(option) => option.value === state.group,
	)
		? state.group
		: INVENTORY_BROWSER_DEFAULTS.group;
	const filteredRows = inventoryRows
		.filter((row) => !query || row.searchText.includes(query))
		.sort(compareInventoryRows(sort));
	const groupMap = new Map();

	for (const row of filteredRows) {
		const label = getInventoryGroupLabel(row, group);
		if (!groupMap.has(label)) groupMap.set(label, []);
		groupMap.get(label).push(row);
	}

	const groups = [...groupMap.entries()].map(([label, rows]) => ({
		label,
		rows,
		count: rows.length,
	}));

	if (group !== "none") {
		groups.sort((left, right) => compareInventoryLabels(left.label, right.label));
	}

	const totalWeight = inventoryRows.reduce((sum, row) => sum + row.totalWeight, 0);
	const equippedCount = inventoryRows.filter((row) => row.isEffectivelyEquipped).length;
	const equipmentSlots = buildInventoryEquipmentSlots(inventoryRows);

	return {
		query: state.query,
		sort,
		group,
		sortOptions: makeSelectedOptions(INVENTORY_BROWSER_SORT_OPTIONS, sort),
		groupOptions: makeSelectedOptions(INVENTORY_BROWSER_GROUP_OPTIONS, group),
		groups,
		equipmentSlots,
		hasEquipmentConflicts: equipmentSlots.some((slot) => slot.hasConflict),
		isGrouped: group !== "none",
		totalCount: inventoryRows.length,
		visibleCount: filteredRows.length,
		equippedCount,
		totalWeight,
		countLabel: buildInventoryCountLabel({
			query: state.query,
			visibleCount: filteredRows.length,
			totalCount: inventoryRows.length,
		}),
		hasItems: inventoryRows.length > 0,
		hasVisibleItems: filteredRows.length > 0,
	};
};

const buildActorActionBanner = ({ item, actionData, actionIndex, refType, kind }) => {
	const rowIndex = Number.isInteger(actionIndex) && actionIndex >= 0 ? actionIndex : 0;
	const embeddedAction = buildEmbeddedActionRow({
		item,
		actionData,
		index: rowIndex,
		config: CONFIG.nalfa,
	});
	const kindLabel = kind === "standalone" ? "Action" : "Action intégrée";
	const sourceLabel = String(item.name ?? "").trim() || "Sans source";
	const costLabel = getActionCostLabel(actionData);
	const spellTypeLabel = getActionSpellTypeLabel(actionData);
	const searchableText = [
		embeddedAction.displayName,
		sourceLabel,
		kindLabel,
		costLabel,
		spellTypeLabel,
		embeddedAction.detailRow1,
		embeddedAction.detailRow2,
		...(embeddedAction.summaryRows ?? []).map((row) => row.text ?? ""),
	]
		.filter(Boolean)
		.join(" ");

	return {
		kind,
		kindLabel,
		item,
		actionData,
		itemImage: item.img,
		sourceLabel,
		costLabel,
		spellTypeLabel,
		searchText: normalizeActionSearch(searchableText),
		embeddedAction: {
			...embeddedAction,
			refType,
			itemUuid: item.uuid,
			actionIndex: Number.isInteger(actionIndex) ? actionIndex : -1,
			actionShorthand: String(actionData?.shorthand ?? "").trim(),
		},
	};
};

const buildActorActionBanners = (
	actor,
	inventoryRows = [],
	{ includeUnequipped = false } = {},
) => {
	const banners = [];

	for (const item of actor?.items ?? []) {
		if (item.type === "Action") {
			banners.push(
				buildActorActionBanner({
					item,
					actionData: item.system,
					actionIndex: -1,
					refType: ACTION_REF_TYPES.ACTION_ITEM,
					kind: "standalone",
				}),
			);
			continue;
		}

		if (!includeUnequipped && !canShowEmbeddedActionsForItem(item, inventoryRows)) {
			continue;
		}

		const actions = Array.isArray(item.system?.actions) ? item.system.actions : [];
		for (let index = 0; index < actions.length; index += 1) {
			banners.push(
				buildActorActionBanner({
					item,
					actionData: actions[index],
					actionIndex: index,
					refType: ACTION_REF_TYPES.EMBEDDED_ACTION,
					kind: "embedded",
				}),
			);
		}
	}

	return banners.sort((left, right) => {
		const leftName = left.embeddedAction?.displayName ?? "";
		const rightName = right.embeddedAction?.displayName ?? "";
		return compareActionLabels(leftName, rightName);
	});
};

const compareActorActions = (sortMode) => (left, right) => {
	const leftName = left.embeddedAction?.displayName ?? "";
	const rightName = right.embeddedAction?.displayName ?? "";
	if (sortMode === "source") {
		return (
			compareActionLabels(left.sourceLabel, right.sourceLabel) ||
			compareActionLabels(leftName, rightName)
		);
	}
	if (sortMode === "cost") {
		return (
			compareActionLabels(left.costLabel, right.costLabel) ||
			compareActionLabels(leftName, rightName)
		);
	}
	if (sortMode === "spell") {
		return (
			compareActionLabels(left.spellTypeLabel, right.spellTypeLabel) ||
			compareActionLabels(leftName, rightName)
		);
	}
	return compareActionLabels(leftName, rightName);
};

const getActorActionGroupLabel = (action, groupMode) => {
	if (groupMode === "source") return action.sourceLabel;
	if (groupMode === "spell") return action.spellTypeLabel;
	if (groupMode === "cost") return action.costLabel;
	if (groupMode === "kind") return action.kindLabel;
	return "Actions";
};

const buildActorActionBrowser = (actorActions, state) => {
	const query = normalizeActionSearch(state.query);
	const sort = ACTION_BROWSER_SORT_OPTIONS.some((option) => option.value === state.sort)
		? state.sort
		: ACTION_BROWSER_DEFAULTS.sort;
	const group = ACTION_BROWSER_GROUP_OPTIONS.some(
		(option) => option.value === state.group,
	)
		? state.group
		: ACTION_BROWSER_DEFAULTS.group;
	const filteredActions = actorActions
		.filter((action) => !query || action.searchText.includes(query))
		.sort(compareActorActions(sort));
	const groupMap = new Map();

	for (const action of filteredActions) {
		const label = getActorActionGroupLabel(action, group);
		if (!groupMap.has(label)) groupMap.set(label, []);
		groupMap.get(label).push(action);
	}

	const groups = [...groupMap.entries()].map(([label, actions]) => ({
		label,
		actions,
		count: actions.length,
	}));

	if (group !== "none") {
		groups.sort((left, right) => compareActionLabels(left.label, right.label));
	}

	return {
		query: state.query,
		sort,
		group,
		sortOptions: makeSelectedOptions(ACTION_BROWSER_SORT_OPTIONS, sort),
		groupOptions: makeSelectedOptions(ACTION_BROWSER_GROUP_OPTIONS, group),
		groups,
		isGrouped: group !== "none",
		totalCount: actorActions.length,
		visibleCount: filteredActions.length,
		countLabel: buildActionBrowserCountLabel({
			query: state.query,
			visibleCount: filteredActions.length,
			totalCount: actorActions.length,
		}),
		hasActions: actorActions.length > 0,
		hasVisibleActions: filteredActions.length > 0,
	};
};

const getEventActionIndex = (event) => {
	const value = event.currentTarget?.dataset?.actionIndex;
	const fallback = event.currentTarget?.dataset?.index;
	const index = Number(value ?? fallback ?? -1);
	return Number.isInteger(index) ? index : -1;
};

const waitForCharacterConfirmation = ({ title, content, confirmLabel }) => {
	return new Promise((resolve) => {
		let settled = false;
		const settle = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		const dialog = new DialogV2({
			classes: ["nalfa", "sheet", "nalfa-action-dialog"],
			window: { title },
			content,
			buttons: [
				{
					action: "cancel",
					label: "Annuler",
					callback: () => false,
				},
				{
					action: "confirm",
					label: confirmLabel,
					default: true,
					callback: () => true,
				},
			],
			submit: (result) => settle(result),
		});

		dialog.addEventListener("close", () => settle(false));
		dialog.render({ force: true });
	});
};

const waitForRestSelection = () => {
	return new Promise((resolve) => {
		let settled = false;
		const settle = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};
		const dialog = new DialogV2({
			classes: ["nalfa", "sheet", "nalfa-action-dialog"],
			window: { title: "Repos" },
			content: `
				<section class="panel-section nalfa-rest-dialog">
					<p class="hint">La durée et la qualité déterminent la récupération.</p>
					<div class="nalfa-rest-dialog__choices">
						<label class="field field--inline">
							<span class="field__label">Durée</span>
							<select name="rest-duration">
								<option value="1">1 h</option>
								<option value="2">2 h</option>
								<option value="4">4 h</option>
								<option value="8" selected>8 h</option>
								<option value="24">24 h</option>
							</select>
						</label>
						<label class="field field--inline">
							<span class="field__label">Qualité</span>
							<input name="rest-quality" type="number" step="1" value="5" data-dtype="Number" />
						</label>
					</div>
					<p class="hint nalfa-rest-dialog__quality-key">
						≤0 Misérable · 1–2 Mauvaise · 3–4 Légère · 5–6 Correcte · 7–8 Bonne · 9+ Complète
					</p>
					<div class="nalfa-rest-dialog__preview">
						<span data-rest-quality-label>Correcte</span>
						<strong data-rest-percent>60 % PV &amp; Nalfa</strong>
						<strong data-rest-fatigue>−1 F</strong>
					</div>
				</section>
			`,
			buttons: [
				{
					action: "cancel",
					label: "Annuler",
					callback: () => settle(null),
				},
				{
					action: "rest",
					label: "Appliquer le repos",
					default: true,
					callback: (_event, _target, currentDialog) => {
						const duration = currentDialog.element?.querySelector(
							"[name='rest-duration']",
						)?.value;
						const quality =
							currentDialog.element?.querySelector(
								"[name='rest-quality']",
							)?.value;
						settle(getRestResult(duration, quality));
					},
				},
			],
		});
		const updatePreview = () => {
			const duration = dialog.element?.querySelector("[name='rest-duration']")?.value;
			const quality = dialog.element?.querySelector("[name='rest-quality']")?.value;
			const result = getRestResult(duration, quality);
			const qualityLabel = dialog.element?.querySelector("[data-rest-quality-label]");
			const percentLabel = dialog.element?.querySelector("[data-rest-percent]");
			const fatigueLabel = dialog.element?.querySelector("[data-rest-fatigue]");
			if (qualityLabel) qualityLabel.textContent = result.qualityLabel;
			if (percentLabel) {
				percentLabel.textContent = `${result.percent} % PV & Nalfa`;
			}
			if (fatigueLabel) {
				fatigueLabel.textContent = result.fatigueReduction
					? `−${result.fatigueReduction} F`
					: "";
			}
		};
		dialog.addEventListener("render", () => {
			dialog.element
				?.querySelectorAll("[name='rest-duration'], [name='rest-quality']")
				.forEach((element) => {
					element.addEventListener("input", updatePreview);
					element.addEventListener("change", updatePreview);
				});
			updatePreview();
		});

		dialog.addEventListener("close", () => settle(null));
		dialog.render({ force: true });
	});
};

const waitForStateSelection = (stateOptions) => {
	const options = stateOptions
		.map(
			({ id, name, category, intensity }) =>
				`<option value="${foundry.utils.escapeHTML(id)}" data-intensity="${intensity}">` +
				`${foundry.utils.escapeHTML(category)} · ${foundry.utils.escapeHTML(name)}</option>`,
		)
		.join("");

	return new Promise((resolve) => {
		let settled = false;
		const settle = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};
		const dialog = new DialogV2({
			classes: ["nalfa", "sheet", "nalfa-action-dialog"],
			window: { title: "Ajouter un état" },
			content: `
				<section class="panel-section nalfa-state-dialog">
					<label class="field field--inline">
						<span class="field__label">État</span>
						<select name="state-id">${options}</select>
					</label>
					<label class="field field--inline" data-state-intensity-row>
						<span class="field__label">Intensité</span>
						<input name="state-intensity" type="number" min="1" step="1" value="1" />
					</label>
					<label class="field field--inline">
						<span class="field__label">Durée</span>
						<input name="state-duration" type="number" min="0" step="1" placeholder="Illimitée" />
						<select name="state-duration-units">
							<option value="turns">Tours</option>
							<option value="rounds">Rounds</option>
							<option value="minutes">Minutes</option>
							<option value="hours">Heures</option>
						</select>
					</label>
					<label class="field nalfa-state-dialog__note">
						<span class="field__label">Note MJ / source / cible</span>
						<input name="state-note" type="text" placeholder="Ex. provoqué par le gardien" />
					</label>
				</section>
			`,
			buttons: [
				{ action: "cancel", label: "Annuler", callback: () => settle(null) },
				{
					action: "apply",
					label: "Appliquer",
					default: true,
					callback: (_event, _target, currentDialog) => {
						const value = (name) =>
							currentDialog.element?.querySelector(`[name='${name}']`)?.value;
						settle({
							stateId: value("state-id"),
							intensity: value("state-intensity"),
							duration: value("state-duration"),
							units: value("state-duration-units"),
							note: value("state-note"),
						});
					},
				},
			],
		});
		dialog.addEventListener("render", () => {
			const select = dialog.element?.querySelector("[name='state-id']");
			const intensityRow = dialog.element?.querySelector(
				"[data-state-intensity-row]",
			);
			const updateIntensityVisibility = () => {
				const option = select?.selectedOptions?.[0];
				if (intensityRow) {
					intensityRow.hidden = option?.dataset?.intensity !== "true";
				}
			};
			select?.addEventListener("change", updateIntensityVisibility);
			updateIntensityVisibility();
		});
		dialog.addEventListener("close", () => settle(null));
		dialog.render({ force: true });
	});
};

const buildUnequippedItemData = (item, { keepId = true } = {}) => {
	const itemData = item.inCompendium
		? game.items.fromCompendium(item, { clearFolder: true, keepId })
		: item.toObject();
	const equippedState = itemData.system?.equipped;

	if (equippedState) {
		itemData.system.equipped = Object.fromEntries(
			Object.keys(equippedState).map((key) => [key, false]),
		);
	}

	return itemData;
};

export default class NalfaCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
	/** ─── DEFAULT OPTIONS ───────────────────────────────────────────────────────── */
	static DEFAULT_OPTIONS = {
		classes: ["nalfa", "sheet", "actor-sheet"],
		position: {
			width: 812,
		},
		form: {
			submitOnChange: true,
		},
	};

	get title() {
		return `Feuille de personnage - ${this.actor?.name || "Inconnu"}`;
	}

	/** ─── TEMPLATE ───────────────────────────────────────────────────────────────── */
	static PARTS = {
		header: {
			template: "systems/nalfa/templates/sheets/character/header.hbs",
			classes: ["nalfa-sheet", "character-sheet"],
		},
		tabs: {
			template: "systems/nalfa/templates/sheets/character/tabs.hbs",
			classes: ["nalfa-sheet", "character-sheet"],
		},
		sheet: {
			template: "systems/nalfa/templates/sheets/character/body.hbs",
			classes: ["nalfa-sheet", "character-sheet", "sheet-body"],
		},
	};

	static TABS = {
		primary: {
			tabs: [
				{ id: "character", label: "Personnage" },
				{ id: "actions", label: "Actions" },
				{ id: "inventory", label: "Inventaire" },
				{ id: "bio", label: "Bio" },
				{ id: "combat", label: "Combat" },
				{ id: "states", label: "États" },
			],
			initial: "character",
		},
	};

	/** ─── PREPARE CONTEXT ──────────────────────────────────────── */
	_getActionBrowserState() {
		this._actionBrowserState ??= { ...ACTION_BROWSER_DEFAULTS };
		return this._actionBrowserState;
	}

	_getInventoryBrowserState() {
		this._inventoryBrowserState ??= { ...INVENTORY_BROWSER_DEFAULTS };
		return this._inventoryBrowserState;
	}

	async _prepareContext(options) {
		const baseData = await super._prepareContext(options);
		const { TextEditor } = foundry.applications.ux;
		const sysData = baseData.document.system;
		const tabs = this._prepareTabs("primary");
		const inventoryRows = buildActorInventoryRows(this.actor, {
			isEditable: this.isEditable,
		});
		const inventoryBrowser = buildActorInventoryBrowser(
			inventoryRows,
			this._getInventoryBrowserState(),
		);
		const actorActions = buildActorActionBanners(this.actor, inventoryRows);
		const allActorActions = buildActorActionBanners(this.actor, inventoryRows, {
			includeUnequipped: true,
		});
		const actionBrowser = buildActorActionBrowser(
			actorActions,
			this._getActionBrowserState(),
		);
		const bioValue = String(sysData.description ?? "");
		const bioEnriched = await TextEditor.enrichHTML(bioValue, {
			async: true,
		});
		const hpValue = Number(sysData.attributes?.hp?.value ?? 0);
		const hpMax = Math.max(1, Number(sysData.attributes?.hp?.max ?? 0));
		const hpUncappedMax = Math.max(
			1,
			Number(sysData.attributes?.hp?.uncapped_max ?? hpMax),
		);
		const hpFormula = formatProfileFormula(
			CONFIG.nalfa.health_profiles?.[sysData.health_profile] ?? "Standard",
			sysData.attributes?.hp,
		);
		const defenseFormula = formatProfileFormula(
			`${CONFIG.nalfa.defense_profiles?.[sysData.defense_profile] ?? "Standard"} + Poly (${sysData.stats?.poly?.value ?? 0})`,
			sysData.attributes?.defense,
		);
		const fatigueEffects = getFatigueEffects(
			this.actor.type === "Character" ? sysData.attributes?.exhaustion : 0,
		);
		const hpTooltipParts = [`PV max : ${hpFormula} = ${hpUncappedMax}`];
		if (fatigueEffects.healthCap < 1) {
			hpTooltipParts.push(
				`Fatigue ${fatigueEffects.level} : plafond ${Math.round(fatigueEffects.healthCap * 100)} % = ${hpMax}`,
			);
		}
		const defensePenalty = fatigueEffects.defensePenalty;
		const defenseTooltip = defensePenalty
			? `Défense : ${defenseFormula} ${formatFormulaNumber(defensePenalty)} (Fatigue ${fatigueEffects.level}) = ${sysData.attributes?.defense?.value}`
			: `Défense : ${defenseFormula} = ${sysData.attributes?.defense?.value}`;
		const evasionBase = Number(
			sysData.attributes?.evasion?.used_base ??
				sysData.attributes?.evasion?.base ??
				0,
		);
		const evasionAlt = Number(sysData.attributes?.evasion?.alt ?? 0);
		const evasionFormula = `${evasionBase}${formatFormulaNumber(evasionAlt)}`;
		const isKO = hpValue <= 0;
		let deathTick = null;

		if (isKO) {
			const hpLossPerTurn = Math.max(1, Math.ceil(hpMax * 0.1));
			const isDead = hpValue <= -hpMax;
			const turnsToDeath = isDead
				? 0
				: Math.max(0, Math.ceil((hpValue + hpMax) / hpLossPerTurn));

			deathTick = {
				isDead,
				turnsToDeath,
				lossPerTurn: String(hpLossPerTurn),
			};
		}

		const resistanceRows = Object.entries(CONFIG.nalfa.base_standard_damage_types)
			.filter(([key]) => key !== "none")
			.map(([key, label]) => {
				const resistance = sysData.attributes?.resistances?.[key] ?? {};
				const defaultCoef = 1;
				const baseCoef = Number.isFinite(Number(resistance.coef))
					? Number(resistance.coef)
					: defaultCoef;
				const altMult = Number.isFinite(Number(resistance.alt_mult))
					? Number(resistance.alt_mult)
					: 1;
				const baseValue = Number.isFinite(Number(resistance.value))
					? Number(resistance.value)
					: 0;
				const altValue = Number.isFinite(Number(resistance.alt))
					? Number(resistance.alt)
					: 0;
				const usedCoef = Number.isFinite(Number(resistance.used_coef))
					? Number(resistance.used_coef)
					: baseCoef * altMult;
				const usedValue = Number.isFinite(Number(resistance.used_value))
					? Number(resistance.used_value)
					: baseValue + altValue;
				return {
					key,
					label,
					coef: baseCoef,
					alt_mult: altMult,
					value: baseValue,
					alt: altValue,
					usedCoef,
					usedValue,
					isDefault: usedCoef === 1 && usedValue === 0,
					state:
						usedCoef === 0
							? "immune"
							: usedCoef > 1
								? "vulnerable"
								: usedCoef < 1
									? "resistant"
									: usedValue > 0
										? "reduced"
										: "modified",
				};
			});
		const combatResources = buildCombatResources(sysData);
		const progressionStats = ["pui", "poly"].map((key) => ({
			key,
			label: CONFIG.nalfa.stats[key],
			data: sysData.stats?.[key] ?? {},
		}));
		const saveStats = Object.entries(CONFIG.nalfa.save_stats).map(([key, label]) => ({
			key,
			label,
			data: sysData.stats?.[key] ?? {},
		}));
		const nalfaValue = Number(sysData.nalfa?.value ?? 0);
		const nalfaMax = Math.max(0, Number(sysData.nalfa?.max ?? 0));
		const combatSummary = {
			hp: {
				value: hpValue,
				max: hpMax,
				temporary: Math.max(0, Number(sysData.attributes?.hp?.abso ?? 0)),
				percent: Math.min(100, Math.max(0, (hpValue / hpMax) * 100)),
				min: -hpMax,
			},
			nalfa: {
				value: nalfaValue,
				max: nalfaMax,
				percent:
					nalfaMax > 0
						? Math.min(100, Math.max(0, (nalfaValue / nalfaMax) * 100))
						: 0,
			},
			defense: sysData.attributes?.defense?.value ?? 0,
			evasion: sysData.attributes?.evasion?.value ?? 0,
		};
		const combatHotbar = buildCombatHotbar(this.actor, allActorActions);
		const stateRows = buildActorStateRows(this.actor);
		const stateProfile = getActorStateProfile(this.actor);

		return {
			isOwner: this.actor.isOwner,
			isEditable: this.isEditable,
			readonly: !this.isEditable,
			rollable: this.actor.isOwner,
			actor: baseData.document,
			sysData: sysData,
			config: CONFIG.nalfa,
			tabs,
			actorActions,
			actionBrowser,
			inventoryRows,
			inventoryBrowser,
			bioEnriched,
			hasBioContent: bioValue.trim().length > 0,
			resistanceRows,
			hasModifiedResistances: resistanceRows.some(
				(resistance) => !resistance.isDefault,
			),
			combatResources,
			progressionStats,
			saveStats,
			combatSummary,
			combatHotbar,
			stateRows,
			stateProfile,
			hpTooltip: hpTooltipParts.join(" · "),
			defenseTooltip,
			evasionTooltip: `Évasion : ${evasionFormula} = ${sysData.attributes?.evasion?.value}`,
			fatigue: {
				...fatigueEffects,
				summary: getFatigueSummary(fatigueEffects.level),
				isNone: fatigueEffects.level === 0,
			},
			isKO,
			deathTick,
			isCharacter: this.actor.type === "Character",
		};
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		this._createContextMenu(
			this._getInventoryContextOptions,
			"[data-draggable='inventory-item']",
		);
	}

	_getInventoryContextOptions() {
		return [
			{
				label: "Supprimer l'objet",
				icon: "fa-solid fa-trash",
				visible: (element) => {
					return Boolean(
						this.isEditable &&
						this.actor.isOwner &&
						String(element?.dataset?.itemUuid ?? "").trim(),
					);
				},
				onClick: (_event, element) => {
					void this._onDeleteInventoryItem(element);
				},
			},
		];
	}

	async _onDeleteInventoryItem(element) {
		if (!this.isEditable || !this.actor.isOwner) return;

		const itemUuid = String(element?.dataset?.itemUuid ?? "").trim();
		const item = itemUuid ? await fromUuid(itemUuid) : null;
		if (!(item instanceof Item) || item.parent !== this.actor) {
			ui.notifications.warn("Objet introuvable dans cet inventaire.");
			return;
		}

		const itemName = foundry.utils.escapeHTML(item.name || "cet objet");
		const confirmed = await waitForCharacterConfirmation({
			title: "Supprimer un objet",
			content: `<p>Supprimer <strong>${itemName}</strong> de l'inventaire ?</p>`,
			confirmLabel: "Supprimer",
		});
		if (!confirmed) return;

		await item.delete();
	}

	async _onTakeRest(event) {
		event.preventDefault();
		if (!this.isEditable || !this.actor.isOwner) return;

		const rest = await waitForRestSelection();
		if (!rest) return;

		const hp = this.actor.system.attributes?.hp ?? {};
		const nalfa = this.actor.system.nalfa ?? {};
		const fatigue = getFatigueEffects(this.actor.system.attributes?.exhaustion).level;
		const hpValue = Number(hp.value ?? 0);
		const hpUncappedMax = Math.max(1, Number(hp.uncapped_max ?? hp.max ?? 0));
		const nalfaValue = Number(nalfa.value ?? 0);
		const nalfaMax = Math.max(0, Number(nalfa.max ?? 0));
		const nextFatigue = Math.max(0, fatigue - rest.fatigueReduction);
		const nextHpMax = getFatigueHealthMax(hpUncappedMax, nextFatigue);
		const hpRecovery = getRestRecoveryAmount(nextHpMax, rest.percent);
		const nalfaRecovery = getRestRecoveryAmount(nalfaMax, rest.percent);
		const nextHpValue = Math.min(nextHpMax, hpValue + hpRecovery);
		const nextNalfaValue = Math.min(nalfaMax, nalfaValue + nalfaRecovery);
		const gainedHp = Math.max(0, nextHpValue - hpValue);
		const gainedNalfa = Math.max(0, nextNalfaValue - nalfaValue);
		const reducedFatigue = fatigue - nextFatigue;

		await this.actor.update({
			"system.attributes.hp.value": nextHpValue,
			"system.nalfa.value": nextNalfaValue,
			"system.attributes.exhaustion": nextFatigue,
		});

		const recoveryParts = [`+${gainedHp} PV`, `+${gainedNalfa} Nalfa`];
		if (reducedFatigue > 0) recoveryParts.push(`-${reducedFatigue} Fatigue`);
		ui.notifications.info(
			`Repos ${rest.duration} h · ${rest.qualityLabel} (${rest.quality}) : ${recoveryParts.join(", ")}.`,
		);
	}

	async _onAddState(event) {
		event.preventDefault();
		if (!this.isEditable || !this.actor.isOwner) return;

		const selection = await waitForStateSelection(getNalfaStateOptions());
		if (!selection) return;
		const effect = buildNalfaStateEffect(selection);
		if (!effect) return;
		const previousStateIds = [...this.actor.effects]
			.filter(
				(activeEffect) =>
					activeEffect.flags?.nalfa?.state?.id === selection.stateId,
			)
			.map((activeEffect) => activeEffect.id);
		if (previousStateIds.length) {
			await this.actor.deleteEmbeddedDocuments("ActiveEffect", previousStateIds);
		}
		await this.actor.createEmbeddedDocuments("ActiveEffect", [effect]);
	}

	async _onRemoveState(event) {
		event.preventDefault();
		if (!this.isEditable || !this.actor.isOwner) return;

		const effectId = String(event.currentTarget?.dataset?.effectId ?? "").trim();
		if (!effectId) return;
		await this.actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
	}

	async _onDrop(event) {
		const dropData = foundry.applications.ux.TextEditor.getDragEventData(event);
		if (dropData?.type !== "Item") return super._onDrop?.(event);

		const item = await Item.implementation.fromDropData(dropData);
		if (!(item instanceof Item) || item.parent === this.actor) {
			return super._onDrop?.(event);
		}

		if (Hooks.call("dropActorSheetData", this.actor, this, dropData) === false) {
			return null;
		}

		if (!this.isEditable || !this.actor.isOwner) return null;

		const sourceActor = item.parent instanceof Actor ? item.parent : null;
		if (sourceActor && !sourceActor.isOwner) {
			ui.notifications.warn(
				"Vous ne pouvez pas retirer cet objet de son propriétaire.",
			);
			return null;
		}

		const itemName = foundry.utils.escapeHTML(item.name || "cet objet");
		const targetName = foundry.utils.escapeHTML(this.actor.name || "cet acteur");
		const sourceText = sourceActor
			? " L'objet sera retiré de l'inventaire du donneur."
			: "";
		const confirmed = await waitForCharacterConfirmation({
			title: "Transférer un objet",
			content: `<p>Donner <strong>${itemName}</strong> à <strong>${targetName}</strong> ?${sourceText}</p>`,
			confirmLabel: "Transférer",
		});
		if (!confirmed) return null;

		const keepId = !this.actor.items.has(item.id);
		const itemData = buildUnequippedItemData(item, { keepId });
		const created = await Item.implementation.create(itemData, {
			parent: this.actor,
			keepId,
		});
		if (!created) return null;

		if (!sourceActor) return created;

		try {
			const deleted = await sourceActor.deleteEmbeddedDocuments("Item", [item.id]);
			if (!deleted?.length) throw new Error("La suppression de la source a échoué.");
		} catch (error) {
			await created.delete();
			console.error("nalfa | Item transfer rollback", error);
			ui.notifications.error("Le transfert a échoué; l'objet n'a pas été déplacé.");
			return null;
		}

		return created;
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		if (this.tabGroups) {
			for (const [group, active] of Object.entries(this.tabGroups)) {
				if (active) this.changeTab(active, group);
			}
		}
		bindImageEditContextMenu(this);
		this.element
			?.querySelector("[data-action='open-richtext-editor']")
			?.addEventListener("click", this._onOpenRichTextEditor.bind(this));
		this.element
			?.querySelector("[data-action='roll-basic-attack']")
			?.addEventListener("click", this._onRollBasicAttack.bind(this));
		this.element
			?.querySelector("[data-action='roll-basic-damage']")
			?.addEventListener("click", this._onRollBasicDamage.bind(this));
		this.element
			?.querySelector("[data-action='roll-basic-save']")
			?.addEventListener("click", this._onRollBasicSave.bind(this));
		this.element
			?.querySelector("[data-action='roll-concentration']")
			?.addEventListener("click", this._onRollConcentration.bind(this));
		this.element
			?.querySelectorAll("[data-action='use-embedded-action']")
			.forEach((element) =>
				element.addEventListener("click", this._onUseActorAction.bind(this)),
			);
		this.element
			?.querySelectorAll("[data-action='use-embedded-action-concentration']")
			.forEach((element) =>
				element.addEventListener(
					"click",
					this._onUseActorActionConcentration.bind(this),
				),
			);
		this.element
			?.querySelectorAll("[data-action='open-embedded-action-source']")
			.forEach((element) =>
				element.addEventListener("click", this._onOpenActorActionItem.bind(this)),
			);
		this.element
			?.querySelectorAll("[data-draggable='embedded-action']")
			.forEach((element) =>
				element.addEventListener(
					"dragstart",
					this._onActorActionDragStart.bind(this),
				),
			);
		this.element
			?.querySelectorAll("[data-draggable='inventory-item']")
			.forEach((element) =>
				element.addEventListener(
					"dragstart",
					this._onInventoryItemDragStart.bind(this),
				),
			);
		this.element
			?.querySelectorAll("[data-action-browser-control]")
			.forEach((element) => {
				element.addEventListener("input", this._onActionBrowserControl.bind(this), {
					capture: true,
				});
				element.addEventListener(
					"change",
					this._onActionBrowserControl.bind(this),
					{
						capture: true,
					},
				);
			});
		this.element
			?.querySelectorAll("[data-inventory-browser-control]")
			.forEach((element) => {
				element.addEventListener(
					"input",
					this._onInventoryBrowserControl.bind(this),
					{
						capture: true,
					},
				);
				element.addEventListener(
					"change",
					this._onInventoryBrowserControl.bind(this),
					{
						capture: true,
					},
				);
			});
		this.element
			?.querySelectorAll("[data-action='open-inventory-item']")
			.forEach((element) =>
				element.addEventListener("click", this._onOpenInventoryItem.bind(this)),
			);
		this.element
			?.querySelectorAll("[data-action='change-inventory-equipped-slot']")
			.forEach((element) =>
				element.addEventListener(
					"change",
					this._onChangeInventoryEquippedSlot.bind(this),
				),
			);
		this.element
			?.querySelectorAll("[data-action='roll-stat-save']")
			.forEach((element) =>
				element.addEventListener("click", this._onRollStatSave.bind(this)),
			);
		this.element
			?.querySelectorAll("[data-action='roll-skill']")
			.forEach((element) =>
				element.addEventListener("click", this._onRollSkill.bind(this)),
			);
		this.element
			?.querySelectorAll("[data-action='take-rest']")
			.forEach((element) =>
				element.addEventListener("click", this._onTakeRest.bind(this)),
			);
		this.element
			?.querySelectorAll("[data-action='add-state']")
			.forEach((element) =>
				element.addEventListener("click", this._onAddState.bind(this)),
			);
		this.element
			?.querySelectorAll("[data-action='remove-state']")
			.forEach((element) =>
				element.addEventListener("click", this._onRemoveState.bind(this)),
			);
		this.element
			?.querySelectorAll("[data-action-resource-range]")
			.forEach((element) =>
				element.addEventListener("input", this._onActionResourceInput.bind(this)),
			);
		this.element
			?.querySelectorAll("[data-combat-resource-adjust]")
			.forEach((element) => {
				element.addEventListener("click", this._onCombatResourceAdjust.bind(this));
				element.addEventListener(
					"contextmenu",
					this._onCombatResourceAdjust.bind(this),
				);
			});
		this.element
			?.querySelectorAll("[data-action='focus-combat-action']")
			.forEach((element) => {
				element.addEventListener("click", this._onFocusCombatAction.bind(this));
			});
		this.element?.querySelectorAll("[data-combat-grid-drag]").forEach((element) => {
			element.addEventListener("dragstart", this._onCombatActionDragStart.bind(this));
		});
		this.element?.querySelectorAll("[data-hotbar-slot]").forEach((element) => {
			element.addEventListener("dragover", this._onCombatActionDragOver.bind(this));
			element.addEventListener("drop", this._onCombatActionDrop.bind(this));
		});
		this._applyCombatActionFocus();
		this._restoreActionBrowserFocus();
		this._restoreInventoryBrowserFocus();
	}

	_onActionResourceInput(event) {
		if (!this.isEditable) return;

		const range = event.currentTarget;
		const resourceKey = String(range?.dataset?.actionResourceRange ?? "");
		const item = range?.closest(".action-resources__item");
		const valueInput = item?.querySelector(
			`[data-action-resource-value='${resourceKey}']`,
		);
		if (!(valueInput instanceof HTMLInputElement)) return;

		valueInput.value = range.value;
		const valueLabel = item.querySelector("[data-action-resource-count]");
		if (valueLabel) {
			valueLabel.textContent =
				resourceKey === "movement" ? formatCombatDecimal(range.value) : range.value;
		}

		const max = Number(range.max);
		const value = Number(range.value);
		const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
		range.style.setProperty("--resource-fill", `${percent}%`);
	}

	async _onCombatResourceAdjust(event) {
		if (!event.altKey) return;
		event.preventDefault();
		event.stopPropagation();
		if (!this.isEditable || !this.actor.isOwner) return;

		const element = event.currentTarget;
		const path = String(element?.dataset?.combatResourceAdjust ?? "").trim();
		if (!path) return;
		const current = Number(foundry.utils.getProperty(this.actor.system, path));
		if (!Number.isFinite(current)) return;

		const rawMin = Number(element.dataset.resourceMin);
		const rawMax = Number(element.dataset.resourceMax);
		const min = Number.isFinite(rawMin) ? rawMin : Number.NEGATIVE_INFINITY;
		const max = Number.isFinite(rawMax) ? rawMax : Number.POSITIVE_INFINITY;
		const delta = event.type === "contextmenu" ? 1 : -1;
		const next = Math.min(max, Math.max(min, current + delta));
		if (next === current) return;
		await this.actor.update({ [`system.${path}`]: next });
	}

	_onFocusCombatAction(event) {
		if (event.altKey) return;
		event.preventDefault();
		this._focusedCombatActionKey = String(
			event.currentTarget?.dataset?.combatActionKey ?? "",
		);
		this._applyCombatActionFocus();
	}

	_applyCombatActionFocus() {
		const focusedKey = String(this._focusedCombatActionKey ?? "");
		let resourceKeys = new Set();
		this.element?.querySelectorAll("[data-combat-action-key]").forEach((element) => {
			const isFocused = element.dataset.combatActionKey === focusedKey;
			element.classList.toggle("combat-action-grid__action--focused", isFocused);
			if (isFocused) {
				resourceKeys = new Set(
					String(element.dataset.resourceKeys ?? "")
						.split(/\s+/)
						.filter(Boolean),
				);
			}
		});
		this.element?.querySelectorAll("[data-combat-resource-key]").forEach((element) => {
			element.classList.toggle(
				"combat-resource--focused-cost",
				resourceKeys.has(element.dataset.combatResourceKey),
			);
		});
	}

	_onCombatActionDragStart(event) {
		if (!this.isEditable || ui.hotbar?.locked || !event.dataTransfer) {
			event.preventDefault();
			return;
		}
		const sourceSlot = Number(event.currentTarget?.dataset?.sourceHotbarSlot ?? -1);
		const macroUuid = String(event.currentTarget?.dataset?.macroUuid ?? "").trim();
		if (Number.isInteger(sourceSlot) && sourceSlot > 0 && macroUuid) {
			event.dataTransfer.setData(
				"text/plain",
				JSON.stringify({ type: "Macro", uuid: macroUuid, slot: sourceSlot }),
			);
			event.dataTransfer.effectAllowed = "move";
			return;
		}

		this._onActorActionDragStart(event);
	}

	_onCombatActionDragOver(event) {
		if (!this.isEditable || ui.hotbar?.locked) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
	}

	async _onCombatActionDrop(event) {
		if (!this.isEditable || !this.actor.isOwner || ui.hotbar?.locked) return;
		const targetSlot = Number(event.currentTarget?.dataset?.hotbarSlot ?? -1);
		if (!Number.isInteger(targetSlot) || targetSlot < 1 || targetSlot > 50) return;
		const payload = foundry.applications.ux.TextEditor.getDragEventData(event);
		const isActionDrop = isNalfaHotbarDrop(payload);
		if (payload?.type !== "Macro" && !isActionDrop) return;

		event.preventDefault();
		event.stopImmediatePropagation();
		event.stopPropagation();
		if (isActionDrop) {
			await createHotbarMacro(payload, targetSlot);
			return;
		}

		const macroClass = getDocumentClass("Macro");
		let macro = await macroClass?.fromDropData(payload);
		if (!(macro instanceof Macro)) return;
		if (!game.macros.has(macro.id)) {
			macro = await Macro.create(macro.toObject());
		}
		const sourceSlot = Number(payload.slot ?? -1);
		await game.user.assignHotbarMacro(macro, targetSlot, {
			fromSlot:
				Number.isInteger(sourceSlot) && sourceSlot > 0 ? sourceSlot : undefined,
		});
	}

	_restoreActionBrowserFocus() {
		const focusState = this._actionBrowserFocus;
		if (!focusState?.field) return;

		const element = this.element?.querySelector(
			`[data-action-browser-field='${focusState.field}']`,
		);
		if (!(element instanceof HTMLElement)) return;

		element.focus();
		if (element instanceof HTMLInputElement) {
			const start = focusState.selectionStart;
			const end = focusState.selectionEnd;
			if (Number.isInteger(start) && Number.isInteger(end)) {
				element.setSelectionRange(start, end);
			}
		}
	}

	_restoreInventoryBrowserFocus() {
		const focusState = this._inventoryBrowserFocus;
		if (!focusState?.field) return;

		const element = this.element?.querySelector(
			`[data-inventory-browser-field='${focusState.field}']`,
		);
		if (!(element instanceof HTMLElement)) return;

		element.focus();
		if (element instanceof HTMLInputElement) {
			const start = focusState.selectionStart;
			const end = focusState.selectionEnd;
			if (Number.isInteger(start) && Number.isInteger(end)) {
				element.setSelectionRange(start, end);
			}
		}
	}

	async _onRollBasicAttack(event) {
		event.preventDefault();
		return rollAttack(this.actor, { promptAdjustments: event.altKey });
	}

	_onActionBrowserControl(event) {
		event.preventDefault();
		event.stopPropagation();

		const field = String(event.currentTarget?.dataset?.actionBrowserField ?? "").trim();
		if (!field) return;

		this._actionBrowserState = {
			...this._getActionBrowserState(),
			[field]: String(event.currentTarget?.value ?? ""),
		};
		this._actionBrowserFocus = {
			field,
			selectionStart: event.currentTarget?.selectionStart ?? null,
			selectionEnd: event.currentTarget?.selectionEnd ?? null,
		};

		window.clearTimeout(this._actionBrowserRenderTimeout);
		this._actionBrowserRenderTimeout = window.setTimeout(
			() => {
				this.render({ force: true });
			},
			field === "query" ? 120 : 0,
		);
	}

	_onInventoryBrowserControl(event) {
		event.preventDefault();
		event.stopPropagation();

		const field = String(
			event.currentTarget?.dataset?.inventoryBrowserField ?? "",
		).trim();
		if (!field) return;

		this._inventoryBrowserState = {
			...this._getInventoryBrowserState(),
			[field]: String(event.currentTarget?.value ?? ""),
		};
		this._inventoryBrowserFocus = {
			field,
			selectionStart: event.currentTarget?.selectionStart ?? null,
			selectionEnd: event.currentTarget?.selectionEnd ?? null,
		};

		window.clearTimeout(this._inventoryBrowserRenderTimeout);
		this._inventoryBrowserRenderTimeout = window.setTimeout(
			() => {
				this.render({ force: true });
			},
			field === "query" ? 120 : 0,
		);
	}

	async _onOpenInventoryItem(event) {
		event.preventDefault();
		const itemUuid = String(event.currentTarget?.dataset?.itemUuid ?? "").trim();
		if (!itemUuid) return;

		const item = await fromUuid(itemUuid);
		if (!(item instanceof Item)) {
			ui.notifications.warn("Objet introuvable.");
			return;
		}

		item.sheet?.render({ force: true });
	}

	async _onChangeInventoryEquippedSlot(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		event.stopPropagation();
		if (!this.isEditable) return;

		const select = event.currentTarget;
		const itemUuid = String(select?.dataset?.itemUuid ?? "").trim();
		if (!itemUuid) return;

		const item = await fromUuid(itemUuid);
		if (!(item instanceof Item) || item.parent !== this.actor) {
			ui.notifications.warn("Objet possédé introuvable.");
			return;
		}

		const currentSlot = getEquippedSlotValue(
			item.system?.equipped ?? {},
			item.system?.equippable ?? {},
		);
		if (item.type === "Currency") {
			select.value = currentSlot;
			return;
		}

		if (isEquippedSlotLocked(item.system)) {
			ui.notifications.warn("Cet objet maudit est verrouillé tant qu'il est équipé.");
			select.value = currentSlot;
			return;
		}

		const selectedSlot = select.value;
		if (selectedSlot !== EQUIP_SLOT_NONE && !EQUIP_SLOT_KEYS.has(selectedSlot)) {
			select.value = currentSlot;
			return;
		}

		if (selectedSlot !== EQUIP_SLOT_NONE && !item.system?.equippable?.[selectedSlot]) {
			ui.notifications.warn("Cet emplacement n'est pas autorisé.");
			select.value = currentSlot;
			return;
		}

		await item.update(buildEquippedSlotUpdate(selectedSlot));
	}

	async _resolveActorAction(event) {
		const button = event.currentTarget;
		const refType = String(button?.dataset?.refType ?? "").trim();
		const itemUuid = String(button?.dataset?.itemUuid ?? "").trim();
		if (!itemUuid) return null;

		const item = await fromUuid(itemUuid);
		if (!(item instanceof Item)) {
			ui.notifications.warn("Objet porteur introuvable.");
			return null;
		}

		if (refType === ACTION_REF_TYPES.ACTION_ITEM) {
			if (item.type !== "Action") {
				ui.notifications.warn("Action introuvable.");
				return null;
			}

			return {
				actionData: item.system,
				sourceItem: item,
				titleName: item.name,
				actionIndex: -1,
			};
		}

		if (refType !== ACTION_REF_TYPES.EMBEDDED_ACTION) return null;

		const actionIndex = getEventActionIndex(event);
		if (actionIndex < 0) {
			ui.notifications.warn("Index d'action intégrée invalide.");
			return null;
		}

		const actionData = item.system?.actions?.[actionIndex] ?? null;
		if (!actionData) {
			ui.notifications.warn("Action intégrée introuvable.");
			return null;
		}

		return {
			actionData,
			sourceItem: item,
			titleName:
				String(actionData?.name ?? "").trim() ||
				getDefaultEmbeddedActionName(item.name, actionIndex),
			actionIndex,
		};
	}

	_onActorActionDragStart(event) {
		const element = event.currentTarget;
		const itemUuid = String(element?.dataset?.itemUuid ?? "").trim();
		const refType = String(element?.dataset?.refType ?? "").trim();
		if (!itemUuid || !event.dataTransfer) return;

		let payload = { type: "Item", uuid: itemUuid };
		if (refType === ACTION_REF_TYPES.EMBEDDED_ACTION) {
			const actionIndex = Number(element.dataset.actionIndex ?? -1);
			if (!Number.isInteger(actionIndex) || actionIndex < 0) return;

			payload = {
				type: HOTBAR_DROP_TYPE_EMBEDDED_ACTION,
				refType,
				itemUuid,
				actionIndex,
				actorUuid: this.actor.uuid,
				actionName: String(element.dataset.actionName ?? "").trim(),
				actionShorthand: String(element.dataset.actionShorthand ?? "").trim(),
				sourceUuid: String(element.dataset.sourceUuid ?? "").trim(),
				img: String(element.dataset.img ?? "").trim(),
			};
		}

		event.dataTransfer.setData("text/plain", JSON.stringify(payload));
		event.dataTransfer.effectAllowed = "copy";
	}

	_onInventoryItemDragStart(event) {
		const itemUuid = String(event.currentTarget?.dataset?.itemUuid ?? "").trim();
		if (!itemUuid || !event.dataTransfer) return;

		event.dataTransfer.setData(
			"text/plain",
			JSON.stringify({ type: "Item", uuid: itemUuid }),
		);
		event.dataTransfer.effectAllowed = "copy";
	}

	async _onUseActorAction(event) {
		event.preventDefault();
		const action = await this._resolveActorAction(event);
		if (!action) return null;

		return executeActionPrompt({
			actor: this.actor,
			...action,
			forcePrompt: event.altKey,
		});
	}

	async _onUseActorActionConcentration(event) {
		event.preventDefault();
		const action = await this._resolveActorAction(event);
		if (!action) return null;

		return executeActionConcentrationPrompt({
			actor: this.actor,
			...action,
		});
	}

	async _onOpenActorActionItem(event) {
		event.preventDefault();
		const itemUuid = String(event.currentTarget?.dataset?.itemUuid ?? "").trim();
		if (!itemUuid) return;

		const item = await fromUuid(itemUuid);
		if (!(item instanceof Item)) {
			ui.notifications.warn("Objet porteur introuvable.");
			return;
		}

		item.sheet?.render({ force: true });
	}

	_onOpenRichTextEditor(event) {
		event.preventDefault();
		event.stopPropagation();
		if (!this.isEditable) return;

		const button = event.currentTarget;
		const path = button?.dataset?.path;
		if (!path) return;

		const title = button.dataset.title || "Éditeur";
		openRichTextEditorDialog(this.actor, path, title);
	}

	async _onRollBasicDamage(event) {
		event.preventDefault();
		return rollDamageSet(this.actor);
	}
	async _onRollBasicSave(event) {
		event.preventDefault();
		return rollSavePrompt(this.actor, {
			promptAdjustments: event.altKey,
			includeDifficulty: event.altKey,
		});
	}

	async _onRollConcentration(event) {
		event.preventDefault();
		return rollConcentration(this.actor, null, null, {
			promptAdjustments: event.altKey,
		});
	}

	async _onRollStatSave(event) {
		event.preventDefault();
		const statKey = event.currentTarget?.dataset?.stat;
		if (!statKey) return null;
		return rollStatSave(this.actor, statKey, {
			promptAdjustments: event.altKey,
			includeDifficulty: event.altKey,
		});
	}

	async _onRollSkill(event) {
		event.preventDefault();
		const skillKey = event.currentTarget?.dataset?.skill;
		if (!skillKey) return null;
		return rollSkill(this.actor, skillKey, {
			promptAdjustments: event.altKey,
			includeDifficulty: event.altKey,
		});
	}

	// activateListeners(html) {
	// 	super.activateListeners(html);
	// }
}
