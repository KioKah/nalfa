import {
	ITEM_TYPES_WITH_MODIFIERS,
	ITEM_TYPES_WITH_PHYSICAL,
	ITEM_TYPES_WITH_SPECIFIC,
	PRIMARY_TAB_GROUP,
} from "./constants.mjs";
import {
	MAX_ITEM_ACTIONS,
	getDefaultItemActionName,
} from "../../itemActions.mjs";
import {
	getEquippedOptions,
	getEquippedSlotValue,
	isEquippedSlotLocked,
} from "./equipment.mjs";

const DEFAULT_ITEM_ICON = "icons/svg/item-bag.svg";

const buildVisibleTabs = ({
	actionTabLabel,
	activeTab,
	hasSpecific,
	isIdentificationLocked,
	item,
	rawTabs,
	showModifiersTab,
	showActionableTab,
}) => {
	const tabIds = [];
	if (isIdentificationLocked) {
		tabIds.push("description");
	} else {
		if (hasSpecific) tabIds.push("specific");
		if (showActionableTab) tabIds.push("actionable");
		if (showModifiersTab) tabIds.push("modifiers");
		tabIds.push("description");
	}

	const resolvedActiveTab = tabIds.includes(activeTab) ? activeTab : tabIds[0];
	const specificTabLabel = item.type;
	const tabs = {};

	for (const tabId of tabIds) {
		const tab = rawTabs[tabId] ?? { id: tabId };
		const tabLabel =
			tabId === "specific"
				? specificTabLabel
				: (tabId === "actionable" ? actionTabLabel : tab.label);
		tabs[tabId] = {
			...tab,
			label: tabLabel,
			cssClass: tabId === resolvedActiveTab ? "active" : "",
		};
	}

	return {
		tabs,
		activeTab: resolvedActiveTab,
	};
};

const getDescriptionData = (item) => {
	const descriptionData = item.system?.description ?? {};
	return {
		descriptionValue:
			typeof descriptionData === "string"
				? descriptionData
				: (descriptionData.text ?? ""),
		loretextValue:
			typeof descriptionData === "string"
				? ""
				: (descriptionData.loretext ?? ""),
	};
};

const getItemImage = (item) => {
	const defaultItemIcon = item.constructor?.DEFAULT_ICON ?? DEFAULT_ITEM_ICON;
	const defaultArtwork = item.constructor?.getDefaultArtwork?.(item.toObject()) ?? {};
	return item.img === defaultItemIcon ? (defaultArtwork.img ?? item.img) : item.img;
};

const resolveModifierCategory = ({
	category,
	modifierPath,
	pathCategories,
	pathsByCategory,
	defaultCategory,
}) => {
	if (category && Object.hasOwn(pathsByCategory, category)) {
		return category;
	}

	for (const [categoryKey, groupPaths] of Object.entries(pathsByCategory)) {
		if (Object.hasOwn(groupPaths, modifierPath)) {
			return categoryKey;
		}
	}

	if (Object.hasOwn(pathsByCategory, defaultCategory)) {
		return defaultCategory;
	}

	const firstCategory = Object.keys(pathCategories)[0] ?? "";
	return Object.hasOwn(pathsByCategory, firstCategory) ? firstCategory : "";
};

const buildModifierRows = ({ modifiers, config }) => {
	const pathCategories = config.modifier_path_categories ?? {};
	const pathsByCategory = config.modifier_base_paths_by_category ?? {};
	const defaultCategory = Object.keys(pathCategories)[0] ?? "";

	return modifiers.map((modifier) => {
		const selectedPath = String(modifier.path ?? "").trim();
		const category = resolveModifierCategory({
			category: modifier.category,
			modifierPath: selectedPath,
			pathCategories,
			pathsByCategory,
			defaultCategory,
		});

		const categoryPaths = pathsByCategory[category] ?? {};
		const resolvedPath = Object.hasOwn(categoryPaths, selectedPath)
			? selectedPath
			: "";

		return {
			...modifier,
			resolvedCategory: category,
			resolvedPath,
		};
	});
};

const buildActionCostSummary = (actionData, config) => {
	const actionCost = actionData?.cost?.action ?? {};
	const actionUnit = String(actionCost.unit ?? "none");
	if (actionUnit === "none") return "Sans cout d'action";

	const amount = Number(actionCost.amount ?? 0);
	const unitLabel = config.action_units?.[actionUnit] ?? actionUnit;
	if (!Number.isFinite(amount) || amount <= 0) return unitLabel;

	return `${amount} ${unitLabel}`;
};

const buildActionSummary = (actionData, config) => {
	const mode = String(actionData?.mode ?? "physical");
	const rangeType = String(actionData?.range_type ?? "ranged");
	const tags = [
		config.attack_mode?.[mode] ?? mode,
		config.range_types?.[rangeType] ?? rangeType,
		buildActionCostSummary(actionData, config),
	];

	if (actionData?.jdt?.enabled) tags.push("JdT");
	if (actionData?.jds?.enabled) tags.push("JdS");
	if (actionData?.jdd?.enabled) tags.push("JdD");
	if (actionData?.concentration?.enabled) tags.push("JdF");

	return tags.filter(Boolean).join(" | ");
};

const buildItemActionRows = ({ item, config }) => {
	const itemActions = Array.isArray(item.system?.actions) ? item.system.actions : [];

	return itemActions.map((actionData, index) => {
		const storedName = String(actionData?.name ?? "");
		const trimmedName = storedName.trim();
		const defaultName = getDefaultItemActionName(item.name, index);

		return {
			index,
			defaultName,
			displayName: trimmedName || defaultName,
			inputName: trimmedName || defaultName,
			summary: buildActionSummary(actionData, config),
		};
	});
};

export const buildItemSheetContext = async ({ baseData, config, sheet, textEditor }) => {
	const item = baseData.document;
	const rawTabs = sheet._prepareTabs(PRIMARY_TAB_GROUP);
	const isActionItem = item.type === "Action";
	const hasItemActions = Array.isArray(item.system?.actions);
	const actionData = isActionItem ? item.system : null;
	const actionPath = isActionItem ? "" : "actions.0.";
	const hasActionable = isActionItem ? actionData !== null : hasItemActions;
	const showActionableTab = hasItemActions && !isActionItem;
	const itemActions = showActionableTab ? buildItemActionRows({ item, config }) : [];
	const itemActionsCount = itemActions.length;
	const canAddItemAction = itemActionsCount < MAX_ITEM_ACTIONS;
	const actionTabLabel = itemActionsCount >= 2 ? "Actions" : "Action";
	const isCurrencyItem = item.type === "Currency";
	const hasSpecific = ITEM_TYPES_WITH_SPECIFIC.has(item.type);
	const hasModifiers = ITEM_TYPES_WITH_MODIFIERS.has(item.type);
	const hasPhysical = ITEM_TYPES_WITH_PHYSICAL.has(item.type);
	const showModifiersTab = hasModifiers && Array.isArray(item.system?.modifiers);
	const identificationData = isCurrencyItem ? undefined : item.system?.identification;
	const needsIdentification = identificationData?.needs_identification ?? false;
	const isIdentificationLocked =
		needsIdentification === true && identificationData?.identified !== true;

	const { tabs, activeTab } = buildVisibleTabs({
		actionTabLabel,
		activeTab: sheet.tabGroups?.[PRIMARY_TAB_GROUP],
		hasSpecific,
		isIdentificationLocked,
		item,
		rawTabs,
		showModifiersTab,
		showActionableTab,
	});

	const { descriptionValue, loretextValue } = getDescriptionData(item);
	const unidentifiedDescription =
		item.system?.identification?.unidentified?.description ?? "";
	const unidentifiedLoretext = item.system?.identification?.unidentified?.loretext ?? "";
	const useUnidentifiedPresentation =
		needsIdentification === true && identificationData?.identified !== true;
	const currentDescriptionNamePath = useUnidentifiedPresentation
		? "system.identification.unidentified.description"
		: "system.description.text";
	const currentDescriptionEnriched = useUnidentifiedPresentation
		? await textEditor.enrichHTML(unidentifiedDescription, { async: true })
		: await textEditor.enrichHTML(descriptionValue, { async: true });
	const currentDescriptionLabel = "Description";
	const currentLoretextNamePath = useUnidentifiedPresentation
		? "system.identification.unidentified.loretext"
		: "system.description.loretext";
	const currentLoretextEnriched = useUnidentifiedPresentation
		? await textEditor.enrichHTML(unidentifiedLoretext, { async: true })
		: await textEditor.enrichHTML(loretextValue, { async: true });
	const currentLoretextLabel = "Loretext";

	const actionMode = actionData?.mode ?? "physical";
	const isActionModeIncant = actionMode === "incant";
	const isActionModePhysical = actionMode === "physical";
	const effectTextSource = actionData?.effect?.text ?? "";
	const equippableState = item.system?.equippable ?? {};
	const equippedState = item.system?.equipped ?? {};
	const equippedSlot = getEquippedSlotValue(equippedState, equippableState);
	const equippedOptions = getEquippedOptions(equippableState);
	const isEquipLocked = isEquippedSlotLocked(item.system);
	const modifiers = Array.isArray(item.system?.modifiers) ? item.system.modifiers : [];
	const modifierRows = buildModifierRows({ modifiers, config });

	return {
		activeTab,
		sheetData: {
			isOwner: sheet.item.isOwner,
			isEditable: sheet.isEditable,
			item,
			itemImage: getItemImage(item),
			sysData: item.system,
			tabs,
			hasActionable,
			showActionableTab,
			itemActions,
			itemActionsCount,
			canAddItemAction,
			maxItemActions: MAX_ITEM_ACTIONS,
			hasModifiers,
			showModifiersTab,
			modifierRows,
			actionData,
			actionPath,
			isCurrencyItem,
			isActionModeIncant,
			isActionModePhysical,
			hasSpecific,
			hasPhysical,
			hasRarity: item.system?.rarity !== undefined,
			hasIdentification: !isCurrencyItem && item.system?.identification !== undefined,
			hasRecommendedLevel: item.system?.recommended_level !== undefined,
			isIdentificationLocked,
			useUnidentifiedPresentation,
			currentDescriptionNamePath,
			currentDescriptionEnriched,
			currentDescriptionLabel,
			currentLoretextNamePath,
			currentLoretextEnriched,
			currentLoretextLabel,
			equippedSlot,
			equippedOptions,
			isEquipLocked,
			descriptionValue,
			loretextValue,
			config,
			enrichedHTML: {
				description: {
					loretext: await textEditor.enrichHTML(loretextValue, {
						async: true,
					}),
				},
				effect: {
					text: await textEditor.enrichHTML(effectTextSource, {
						async: true,
					}),
				},
			},
		},
	};
};
