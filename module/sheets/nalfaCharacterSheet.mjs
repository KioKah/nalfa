import {
	rollAttack,
	rollDamageSet,
	rollConcentration,
	rollSavePrompt,
	rollSkill,
	rollStatSave,
} from "../rolls/index.mjs";
import { ACTION_REF_TYPES } from "../actions/refs.mjs";
import { getDefaultEmbeddedActionName } from "../actions/embedded.mjs";
import {
	executeActionConcentrationPrompt,
	executeActionPrompt,
} from "../rolls/actions/execution.mjs";
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

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const ACTION_BROWSER_DEFAULTS = Object.freeze({
	query: "",
	sort: "name",
	group: "none",
});

const ACTION_BROWSER_SORT_OPTIONS = Object.freeze([
	{ value: "name", label: "Nom" },
	{ value: "source", label: "Source" },
	{ value: "cost", label: "Coût" },
	{ value: "mode", label: "Mode" },
	{ value: "spell", label: "Type de sort" },
]);

const ACTION_BROWSER_GROUP_OPTIONS = Object.freeze([
	{ value: "none", label: "Aucun" },
	{ value: "source", label: "Source" },
	{ value: "spell", label: "Type de sort" },
	{ value: "cost", label: "Coût" },
	{ value: "mode", label: "Mode" },
	{ value: "kind", label: "Type" },
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
	EQUIP_SLOT_OPTIONS.filter(({ key }) =>
		["main_hand", "off_hand", "body"].includes(key),
	),
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

const getActionModeLabel = (actionData = {}) => {
	const mode = String(actionData?.mode ?? "none").trim() || "none";
	return (
		String(CONFIG.nalfa.attack_mode?.[mode] ?? mode).trim() || "Sans mode"
	);
};

const getActionSpellTypeLabel = (actionData = {}) => {
	const esterUnit =
		String(actionData?.cost?.ester?.unit ?? "none").trim() || "none";
	const mode = String(actionData?.mode ?? "none").trim() || "none";
	if (mode !== "incant" && esterUnit === "none") return "Non-sort";
	return (
		String(CONFIG.nalfa.ester_levels?.[esterUnit] ?? esterUnit).trim() ||
		"Basique"
	);
};

const getActionCostLabel = (actionData = {}) => {
	const options = Array.isArray(actionData?.cost?.actions?.options)
		? actionData.cost.actions.options
		: [];
	const option = options.find((entry) => {
		return [entry?.main, entry?.bonus, entry?.reaction].some(
			(value) => Number(value) > 0,
		);
	});
	if (!option) return "Principale";

	const parts = [];
	if (Number(option.main) > 0) parts.push("Principale");
	if (Number(option.bonus) > 0) parts.push("Bonus");
	if (Number(option.reaction) > 0) parts.push("Réaction");
	return parts.join(" + ") || "Principale";
};

const pluralizeActionCount = (count) =>
	`${count} action${count > 1 ? "s" : ""}`;

const pluralizeInventoryCount = (count) =>
	`${count} objet${count > 1 ? "s" : ""}`;

const buildActionBrowserCountLabel = ({ query, visibleCount, totalCount }) => {
	if (!String(query ?? "").trim()) return pluralizeActionCount(totalCount);

	const resultLabel = `${visibleCount} résultat${visibleCount > 1 ? "s" : ""}`;
	return `${resultLabel} (/${totalCount})`;
};

const compareActionLabels = (left = "", right = "") => {
	return String(left).localeCompare(
		String(right),
		game.i18n?.lang ?? undefined,
		{
			sensitivity: "base",
			numeric: true,
		},
	);
};

const compareInventoryLabels = compareActionLabels;

const getInventoryTypeLabel = (item) => {
	const type = String(item?.type ?? "").trim();
	return (
		CONFIG.nalfa.item_types?.[type] ?? INVENTORY_TYPE_LABELS[type] ?? type
	);
};

const getEquipSlotLabel = (slot) => {
	return (
		EQUIP_SLOT_OPTIONS.find((option) => option.key === slot)?.label ??
		"Non équipé"
	);
};

const getInventoryEquippedGroupLabel = (row) => {
	if (!row.canEquip) return "Non équipable";
	if (row.isEffectivelyEquipped) return `Équipé - ${row.equippedSlotLabel}`;
	if (row.isEquipped) return `Conflit - ${row.equippedSlotLabel}`;
	return "Non équipé";
};

const hasInventoryEquipOptions = (item) => {
	const equippable = item.system?.equippable ?? {};
	return [...INVENTORY_EQUIPPED_SLOT_KEYS].some(
		(slot) => equippable[slot] === true,
	);
};

const toInventoryNumber = (value, fallback = 0) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

const buildInventoryRow = (item, { isEditable = false } = {}) => {
	const equippableState = item.system?.equippable ?? {};
	const equippedState = item.system?.equipped ?? {};
	const rawEquippedSlot = getEquippedSlotValue(
		equippedState,
		equippableState,
	);
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
	const totalWeight = toInventoryNumber(
		item.system?.total_weight,
		weight * quantity,
	);
	const equippedSlotLabel = isEquipped
		? getEquipSlotLabel(equippedSlot)
		: "Non équipé";
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
		INVENTORY_HAND_SLOT_KEYS.has(slotKey) &&
		left.equippedSlot === "two_handed";
	const rightTwoHanded =
		INVENTORY_HAND_SLOT_KEYS.has(slotKey) &&
		right.equippedSlot === "two_handed";
	if (leftTwoHanded !== rightTwoHanded) return leftTwoHanded ? -1 : 1;

	if (left.isEquipLocked !== right.isEquipLocked)
		return left.isEquipLocked ? -1 : 1;

	const leftTypePriority = INVENTORY_ITEM_TYPE_PRIORITY[left.type] ?? 99;
	const rightTypePriority = INVENTORY_ITEM_TYPE_PRIORITY[right.type] ?? 99;
	if (leftTypePriority !== rightTypePriority)
		return leftTypePriority - rightTypePriority;

	const leftSort = Number(left.item?.sort ?? 0);
	const rightSort = Number(right.item?.sort ?? 0);
	if (
		Number.isFinite(leftSort) &&
		Number.isFinite(rightSort) &&
		leftSort !== rightSort
	) {
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
				(row) =>
					row.equippedSlot === slotKey ||
					row.equippedSlot === "two_handed",
			)
			.sort((left, right) =>
				compareEquipmentPriority(left, right, slotKey),
			);
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
				return (
					row.equippedSlot === option.key ||
					row.equippedSlot === "two_handed"
				);
			}

			return row.equippedSlot === option.key;
		});
		const winners = occupants.filter((row) =>
			row.effectiveSlots.includes(option.key),
		);
		const losers = occupants.filter((row) =>
			row.lostSlots.includes(option.key),
		);
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
			Number(right.isEffectivelyEquipped) -
				Number(left.isEffectivelyEquipped) ||
			Number(right.isEquipmentLoser) - Number(left.isEquipmentLoser) ||
			compareInventoryLabels(
				left.equippedSlotLabel,
				right.equippedSlotLabel,
			) ||
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
			right.quantity - left.quantity ||
			compareInventoryLabels(left.name, right.name)
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

	const inventoryRow = inventoryRows.find(
		(row) => row.itemUuid === item.uuid,
	);
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
		groups.sort((left, right) =>
			compareInventoryLabels(left.label, right.label),
		);
	}

	const totalWeight = inventoryRows.reduce(
		(sum, row) => sum + row.totalWeight,
		0,
	);
	const equippedCount = inventoryRows.filter(
		(row) => row.isEffectivelyEquipped,
	).length;
	const equipmentSlots = buildInventoryEquipmentSlots(inventoryRows);

	return {
		query: state.query,
		sort,
		group,
		sortOptions: makeSelectedOptions(INVENTORY_BROWSER_SORT_OPTIONS, sort),
		groupOptions: makeSelectedOptions(
			INVENTORY_BROWSER_GROUP_OPTIONS,
			group,
		),
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

const buildActorActionBanner = ({
	item,
	actionData,
	actionIndex,
	refType,
	kind,
}) => {
	const rowIndex =
		Number.isInteger(actionIndex) && actionIndex >= 0 ? actionIndex : 0;
	const embeddedAction = buildEmbeddedActionRow({
		item,
		actionData,
		index: rowIndex,
		config: CONFIG.nalfa,
	});
	const kindLabel = kind === "standalone" ? "Action" : "Action intégrée";
	const sourceLabel = String(item.name ?? "").trim() || "Sans source";
	const modeLabel = getActionModeLabel(actionData);
	const costLabel = getActionCostLabel(actionData);
	const spellTypeLabel = getActionSpellTypeLabel(actionData);
	const searchableText = [
		embeddedAction.displayName,
		sourceLabel,
		kindLabel,
		modeLabel,
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
		itemImage: item.img,
		sourceLabel,
		modeLabel,
		costLabel,
		spellTypeLabel,
		searchText: normalizeActionSearch(searchableText),
		embeddedAction: {
			...embeddedAction,
			refType,
			itemUuid: item.uuid,
			actionIndex: Number.isInteger(actionIndex) ? actionIndex : -1,
		},
	};
};

const buildActorActionBanners = (actor, inventoryRows = []) => {
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

		if (!canShowEmbeddedActionsForItem(item, inventoryRows)) continue;

		const actions = Array.isArray(item.system?.actions)
			? item.system.actions
			: [];
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
	if (sortMode === "mode") {
		return (
			compareActionLabels(left.modeLabel, right.modeLabel) ||
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
	if (groupMode === "mode") return action.modeLabel;
	if (groupMode === "kind") return action.kindLabel;
	return "Actions";
};

const buildActorActionBrowser = (actorActions, state) => {
	const query = normalizeActionSearch(state.query);
	const sort = ACTION_BROWSER_SORT_OPTIONS.some(
		(option) => option.value === state.sort,
	)
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
		groups.sort((left, right) =>
			compareActionLabels(left.label, right.label),
		);
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

export default class NalfaCharacterSheet extends HandlebarsApplicationMixin(
	ActorSheetV2,
) {
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
				{ id: "resources", label: "Ressources" },
				{ id: "combat", label: "Combat" },
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

		const bioResistances = Object.entries(
			CONFIG.nalfa.base_standard_damage_types,
		)
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
				};
			});

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
			bioResistances,
			isKO,
			deathTick,
		};
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
				element.addEventListener(
					"click",
					this._onUseActorAction.bind(this),
				),
			);
		this.element
			?.querySelectorAll(
				"[data-action='use-embedded-action-concentration']",
			)
			.forEach((element) =>
				element.addEventListener(
					"click",
					this._onUseActorActionConcentration.bind(this),
				),
			);
		this.element
			?.querySelectorAll("[data-action='open-embedded-action-source']")
			.forEach((element) =>
				element.addEventListener(
					"click",
					this._onOpenActorActionItem.bind(this),
				),
			);
		this.element
			?.querySelectorAll("[data-action-browser-control]")
			.forEach((element) => {
				element.addEventListener(
					"input",
					this._onActionBrowserControl.bind(this),
					{
						capture: true,
					},
				);
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
				element.addEventListener(
					"click",
					this._onOpenInventoryItem.bind(this),
				),
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
				element.addEventListener(
					"click",
					this._onRollStatSave.bind(this),
				),
			);
		this.element
			?.querySelectorAll("[data-action='roll-skill']")
			.forEach((element) =>
				element.addEventListener("click", this._onRollSkill.bind(this)),
			);
		this._restoreActionBrowserFocus();
		this._restoreInventoryBrowserFocus();
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
		return rollAttack(this.actor, "physical");
	}

	_onActionBrowserControl(event) {
		event.preventDefault();
		event.stopPropagation();

		const field = String(
			event.currentTarget?.dataset?.actionBrowserField ?? "",
		).trim();
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
		const itemUuid = String(
			event.currentTarget?.dataset?.itemUuid ?? "",
		).trim();
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
			ui.notifications.warn(
				"Cet objet maudit est verrouillé tant qu'il est équipé.",
			);
			select.value = currentSlot;
			return;
		}

		const selectedSlot = select.value;
		if (
			selectedSlot !== EQUIP_SLOT_NONE &&
			!EQUIP_SLOT_KEYS.has(selectedSlot)
		) {
			select.value = currentSlot;
			return;
		}

		if (
			selectedSlot !== EQUIP_SLOT_NONE &&
			!item.system?.equippable?.[selectedSlot]
		) {
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

	async _onUseActorAction(event) {
		event.preventDefault();
		const action = await this._resolveActorAction(event);
		if (!action) return null;

		return executeActionPrompt({
			actor: this.actor,
			...action,
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
		const itemUuid = String(
			event.currentTarget?.dataset?.itemUuid ?? "",
		).trim();
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
		return rollSavePrompt(this.actor);
	}

	async _onRollConcentration(event) {
		event.preventDefault();
		return rollConcentration(this.actor);
	}

	async _onRollStatSave(event) {
		event.preventDefault();
		const statKey = event.currentTarget?.dataset?.stat;
		if (!statKey) return null;
		return rollStatSave(this.actor, statKey);
	}

	async _onRollSkill(event) {
		event.preventDefault();
		const skillKey = event.currentTarget?.dataset?.skill;
		if (!skillKey) return null;
		return rollSkill(this.actor, skillKey);
	}

	// activateListeners(html) {
	// 	super.activateListeners(html);
	// }
}
