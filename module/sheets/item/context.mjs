import {
	ITEM_TYPES_WITH_PHYSICAL,
	ITEM_TYPES_WITH_SPECIFIC,
	PRIMARY_TAB_GROUP,
} from "./constants.mjs";
import {
	getEquippedOptions,
	getEquippedSlotValue,
	isEquippedSlotLocked,
} from "./equipment.mjs";

const DEFAULT_ITEM_ICON = "icons/svg/item-bag.svg";

const buildVisibleTabs = ({
	activeTab,
	hasSpecific,
	isIdentificationLocked,
	item,
	rawTabs,
	showActionableTab,
}) => {
	const tabIds = [];
	if (isIdentificationLocked) {
		tabIds.push("description");
	} else {
		if (hasSpecific) tabIds.push("specific");
		if (showActionableTab) tabIds.push("actionable");
		tabIds.push("description");
	}

	const resolvedActiveTab = tabIds.includes(activeTab) ? activeTab : tabIds[0];
	const specificTabLabel = item.type;
	const tabs = {};

	for (const tabId of tabIds) {
		const tab = rawTabs[tabId] ?? { id: tabId };
		tabs[tabId] = {
			...tab,
			label: tabId === "specific" ? specificTabLabel : tab.label,
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
				: (descriptionData.value ?? ""),
		descriptionSource:
			typeof descriptionData === "string"
				? ""
				: (descriptionData.source ?? ""),
	};
};

const getItemImage = (item) => {
	const defaultItemIcon = item.constructor?.DEFAULT_ICON ?? DEFAULT_ITEM_ICON;
	const defaultArtwork = item.constructor?.getDefaultArtwork?.(item.toObject()) ?? {};
	return item.img === defaultItemIcon ? (defaultArtwork.img ?? item.img) : item.img;
};

export const buildItemSheetContext = async ({ baseData, config, sheet, textEditor }) => {
	const item = baseData.document;
	const rawTabs = sheet._prepareTabs(PRIMARY_TAB_GROUP);
	const isActionItem = item.type === "Action";
	const actionPath = isActionItem ? "" : "action.";
	const actionData = isActionItem ? item.system : item.system?.action;
	const hasActionable = actionData !== undefined;
	const showActionableTab = hasActionable && !isActionItem;
	const isCurrencyItem = item.type === "Currency";
	const hasSpecific = ITEM_TYPES_WITH_SPECIFIC.has(item.type);
	const hasPhysical = ITEM_TYPES_WITH_PHYSICAL.has(item.type);
	const identificationData = isCurrencyItem ? undefined : item.system?.identification;
	const needsIdentification = identificationData?.needs_identification ?? false;
	const isIdentificationLocked =
		needsIdentification === true && identificationData?.identified !== true;

	const { tabs, activeTab } = buildVisibleTabs({
		activeTab: sheet.tabGroups?.[PRIMARY_TAB_GROUP],
		hasSpecific,
		isIdentificationLocked,
		item,
		rawTabs,
		showActionableTab,
	});

	const { descriptionSource, descriptionValue } = getDescriptionData(item);
	const unidentifiedName = item.system?.identification?.unidentified?.name ?? "";
	const unidentifiedDescription =
		item.system?.identification?.unidentified?.description ?? "";
	const useUnidentifiedPresentation =
		needsIdentification === true && identificationData?.identified !== true;
	const currentDescriptionNamePath = useUnidentifiedPresentation
		? "system.identification.unidentified.description"
		: "system.description.value";
	const currentDescriptionEnriched = useUnidentifiedPresentation
		? await textEditor.enrichHTML(unidentifiedDescription, { async: true })
		: await textEditor.enrichHTML(descriptionValue, { async: true });
	const currentDescriptionLabel = useUnidentifiedPresentation
		? `Description (${unidentifiedName || "inconnue"})`
		: "Description";

	const actionMode = actionData?.mode ?? "arme";
	const effectTextSource = actionData?.effect?.text ?? "";
	const equippableState = item.system?.equippable ?? {};
	const equippedState = item.system?.equipped ?? {};
	const equippedSlot = getEquippedSlotValue(equippedState, equippableState);
	const equippedOptions = getEquippedOptions(equippableState);
	const isEquipLocked = isEquippedSlotLocked(item.system);

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
			actionData,
			actionPath,
			isCurrencyItem,
			isActionModeIncant: actionMode === "incant",
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
			equippedSlot,
			equippedOptions,
			isEquipLocked,
			descriptionValue,
			descriptionSource,
			config,
			enrichedHTML: {
				description: {
					source: await textEditor.enrichHTML(descriptionSource, {
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
