import {
	ITEM_TYPES_WITH_MODIFIERS,
	ITEM_TYPES_WITH_PHYSICAL,
	ITEM_TYPES_WITH_SPECIFIC,
	PRIMARY_TAB_GROUP,
} from "../constants.mjs";
import {
	getEquippedOptions,
	getEquippedSlotValue,
	isEquippedSlotLocked,
} from "../equipment.mjs";
import { getItemImage } from "../utils.mjs";
import { canManageItemSheetRules, canRollItemSheet } from "../permissions.mjs";
import { buildActionableContext } from "./actions.mjs";
import { buildDescriptionContext, getDescriptionData } from "./descriptions.mjs";
import { buildModifierRows } from "./modifiers.mjs";
import { buildVisibleTabs } from "./tabs.mjs";

export const buildItemSheetContext = async ({ baseData, config, sheet, textEditor }) => {
	const item = baseData.document;
	const readonly = !canManageItemSheetRules(sheet);
	const rollable = canRollItemSheet(item);
	const rawTabs = sheet._prepareTabs(PRIMARY_TAB_GROUP);
	const actionableContext = buildActionableContext({
		item,
		config,
		readonly,
		rollable,
		isEditable: sheet.isEditable,
	});
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
		embeddedActionsTabLabel: actionableContext.embeddedActionsTabLabel,
		activeTab: sheet.tabGroups?.[PRIMARY_TAB_GROUP],
		hasSpecific,
		isIdentificationLocked,
		item,
		rawTabs,
		showModifiersTab,
		showEmbeddedActionsTab: actionableContext.showEmbeddedActionsTab,
	});

	const { descriptionValue, loretextValue } = getDescriptionData(item);
	const descriptionContext = await buildDescriptionContext({
		item,
		textEditor,
		descriptionValue,
		loretextValue,
		identificationData,
		needsIdentification,
	});

	const equippableState = item.system?.equippable ?? {};
	const equippedState = item.system?.equipped ?? {};
	const equippedSlot = getEquippedSlotValue(equippedState, equippableState);
	const equippedOptions = getEquippedOptions(equippableState);
	const isEquipLocked = isEquippedSlotLocked(item.system);
	const modifiers = Array.isArray(item.system?.modifiers) ? item.system.modifiers : [];
	const modifierRows = buildModifierRows({ modifiers, config });
	const [enrichedLoretext, enrichedEffectText, enrichedNote] = await Promise.all([
		textEditor.enrichHTML(loretextValue, { async: true }),
		textEditor.enrichHTML(actionableContext.effectTextSource, { async: true }),
		textEditor.enrichHTML(actionableContext.noteTextSource, { async: true }),
	]);

	return {
		activeTab,
		sheetData: {
			isOwner: sheet.item.isOwner,
			isEditable: sheet.isEditable,
			readonly,
			rollable,
			item,
			itemImage: getItemImage(item),
			sysData: item.system,
			...actionableContext,
			tabs,
			hasModifiers,
			showModifiersTab,
			modifierRows,
			isCurrencyItem,
			hasSpecific,
			hasPhysical,
			hasRarity: item.system?.rarity !== undefined,
			hasIdentification: !isCurrencyItem && item.system?.identification !== undefined,
			hasRecommendedLevel: item.system?.recommended_level !== undefined,
			isIdentificationLocked,
			...descriptionContext,
			equippedSlot,
			equippedOptions,
			isEquipLocked,
			descriptionValue,
			loretextValue,
			config,
			enrichedHTML: {
				description: {
					loretext: enrichedLoretext,
				},
				effect: {
					text: enrichedEffectText,
				},
				note: enrichedNote,
			},
		},
	};
};
