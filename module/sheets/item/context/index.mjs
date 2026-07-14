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
	const weaponAttack = item.system?.attack ?? {};
	const weaponAttackRows = [
		{
			key: "main_hand",
			label: "Mp",
			value: String(weaponAttack.main_hand ?? "").trim(),
			available: item.system?.equippable?.main_hand === true,
			active: equippedSlot === "main_hand",
		},
		{
			key: "secondary_hand",
			label: "Ms",
			value: String(weaponAttack.secondary_hand ?? "").trim(),
			available: item.system?.equippable?.off_hand === true,
			active: equippedSlot === "off_hand",
		},
		{
			key: "two_hands",
			label: "2M",
			value: String(weaponAttack.two_hands ?? "").trim(),
			available: item.system?.equippable?.two_handed === true,
			active: equippedSlot === "two_handed",
		},
	].filter((row) => row.available);
	const activeWeaponAttack = weaponAttackRows.find((row) => row.active) ?? null;
	const weaponAttributeList = item.system?.weapon_attributes?.list ?? [];
	const weaponWarnings = [];
	if (weaponAttributeList.includes("Lourde") && weaponAttributeList.includes("Légère")) {
		weaponWarnings.push("Lourde + Légère");
	}
	if (weaponAttributeList.includes("Lourde") && weaponAttributeList.includes("Finesse")) {
		weaponWarnings.push("Lourde + Finesse");
	}
	if (weaponAttributeList.includes("Lancer") && !weaponAttributeList.includes("Légère")) {
		weaponWarnings.push("Lancer sans Légère");
	}
	const weaponWarningText = weaponWarnings.join(", ");
	const modifiers = Array.isArray(item.system?.modifiers) ? item.system.modifiers : [];
	const modifierRows = buildModifierRows({ modifiers, config });
	const [
		enrichedLoretext,
		enrichedRequirements,
		enrichedEffectText,
		enrichedNote,
		enrichedJdsText,
		enrichedNalfaOverloadEffect,
	] = await Promise.all([
		textEditor.enrichHTML(loretextValue, { async: true }),
		textEditor.enrichHTML(actionableContext.requirementsTextSource, { async: true }),
		textEditor.enrichHTML(actionableContext.effectTextSource, { async: true }),
		textEditor.enrichHTML(actionableContext.noteTextSource, { async: true }),
		textEditor.enrichHTML(actionableContext.jdsTextSource, { async: true }),
		textEditor.enrichHTML(actionableContext.nalfaOverloadEffectSource, { async: true }),
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
			weaponAttackRows,
			activeWeaponAttack,
			weaponWarnings,
			weaponWarningText,
			descriptionValue,
			loretextValue,
			config,
			enrichedHTML: {
				requirements: enrichedRequirements,
				description: {
					loretext: enrichedLoretext,
				},
				effect: {
					text: enrichedEffectText,
				},
				note: enrichedNote,
				jds: {
					text: enrichedJdsText,
				},
				nalfaOverload: {
					effect: enrichedNalfaOverloadEffect,
				},
			},
		},
	};
};
