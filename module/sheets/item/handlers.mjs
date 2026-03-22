import { addArrayEntry, removeArrayEntry } from "./arrays.mjs";
import { EQUIP_SLOT_KEYS, EQUIP_SLOT_NONE } from "./constants.mjs";
import {
	buildEquippedSlotUpdate,
	getEquippedSlotValue,
	isEquippedSlotLocked,
} from "./equipment.mjs";
import {
	buildIdentifiedUpdate,
	buildNeedsIdentificationUpdate,
} from "./identification.mjs";
import { openRichTextEditorDialog } from "./dialogs/richTextDialog.mjs";
import {
	chooseSpecialDamageType,
	getSpecialDamageTypeSentinel,
} from "./dialogs/specialDamageTypeDialog.mjs";
import { canManageItemSheetRules } from "./permissions.mjs";

export const handleAddArrayEntry = async (sheet, event) => {
	event.preventDefault();
	if (!canManageItemSheetRules(sheet)) return;
	const button = event.currentTarget;
	const path = button.dataset.path;
	if (!path) return;

	const entryType = button.dataset.entryType ?? "string";
	await addArrayEntry(sheet.item, path, entryType);
};

export const handleRemoveArrayEntry = async (sheet, event) => {
	event.preventDefault();
	if (!canManageItemSheetRules(sheet)) return;
	const button = event.currentTarget;
	const path = button.dataset.path;
	const index = Number(button.dataset.index ?? -1);
	const minimum = Number(button.dataset.minimum ?? 0);

	if (!path || !Number.isInteger(index) || index < 0) return;
	await removeArrayEntry(sheet.item, path, index, minimum);
};

export const handleOpenRichTextEditor = (sheet, event) => {
	event.preventDefault();
	event.stopPropagation();
	if (!canManageItemSheetRules(sheet)) return;

	const button = event.currentTarget;
	const path = button.dataset.path;
	if (!path) return;

	const title = button.dataset.title || "Éditeur";
	openRichTextEditorDialog(sheet.item, path, title);
};

export const handleChangeEquippedSlot = async (sheet, event) => {
	event.preventDefault();
	event.stopPropagation();

	if (isEquippedSlotLocked(sheet.item.system)) {
		ui.notifications.warn("Cet objet maudit est verrouillé tant qu'il est équipé.");
		event.currentTarget.value = getEquippedSlotValue(
			sheet.item.system?.equipped ?? {},
			sheet.item.system?.equippable ?? {},
		);
		return;
	}

	const selectedSlot = event.currentTarget.value;
	if (selectedSlot !== EQUIP_SLOT_NONE && !EQUIP_SLOT_KEYS.has(selectedSlot)) return;

	if (
		selectedSlot !== EQUIP_SLOT_NONE &&
		!sheet.item.system?.equippable?.[selectedSlot]
	) {
		ui.notifications.warn("Cet emplacement n'est pas autorisé.");
		event.currentTarget.value = EQUIP_SLOT_NONE;
		await sheet.item.update(buildEquippedSlotUpdate(EQUIP_SLOT_NONE));
		return;
	}

	await sheet.item.update(buildEquippedSlotUpdate(selectedSlot));
};

export const handleToggleNeedsIdentification = async (sheet, event) => {
	event.preventDefault();
	event.stopImmediatePropagation();
	event.stopPropagation();
	if (!canManageItemSheetRules(sheet)) return;

	const isEnabled = Boolean(event.currentTarget.checked);
	await sheet.item.update(buildNeedsIdentificationUpdate(sheet.item, isEnabled));
};

export const handleToggleIdentified = async (sheet, event) => {
	event.preventDefault();
	event.stopImmediatePropagation();
	event.stopPropagation();
	if (!canManageItemSheetRules(sheet)) return;

	const isIdentified = Boolean(event.currentTarget.checked);
	await sheet.item.update(buildIdentifiedUpdate(sheet.item, isIdentified));
};

export const handleChangeModifierCategory = async (sheet, event) => {
	event.preventDefault();
	event.stopImmediatePropagation();
	event.stopPropagation();
	if (!canManageItemSheetRules(sheet)) return;

	const select = event.currentTarget;
	const index = Number(select.dataset.index ?? -1);
	if (!Number.isInteger(index) || index < 0) return;

	const category = String(select.value ?? "");
	const pathsByCategory = CONFIG.nalfa?.modifier_base_paths_by_category ?? {};
	const availablePaths = Object.keys(pathsByCategory[category] ?? {});
	const modifiers = foundry.utils.deepClone(sheet.item.system?.modifiers ?? []);
	if (!modifiers[index]) return;

	const currentPath = String(modifiers[index].path ?? "");
	const nextPath = availablePaths.includes(currentPath)
		? currentPath
		: (availablePaths[0] ?? "");

	modifiers[index].category = category;
	modifiers[index].path = nextPath;

	await sheet.item.update({ "system.modifiers": modifiers });
};

const syncDamageTypeSelectValue = (select, type) => {
	const nextType = String(type ?? "none").trim() || "none";
	const selectValue = CONFIG.nalfa?.base_damage_types?.[nextType]
		? nextType
		: CONFIG.nalfa?.base_standard_damage_types?.[nextType]
			? nextType
			: "none";
	const fusionLabel = CONFIG.nalfa?.fusion_damage_types?.[nextType] ?? "";
	const existingDynamicOption = select.querySelector(
		"option[data-special-damage-type='true']",
	);

	if (fusionLabel) {
		if (existingDynamicOption instanceof HTMLOptionElement) {
			existingDynamicOption.value = nextType;
			existingDynamicOption.label = fusionLabel;
			existingDynamicOption.textContent = fusionLabel;
		} else {
			const option = new Option(fusionLabel, nextType, false, false);
			option.dataset.specialDamageType = "true";
			select.insertBefore(
				option,
				select.querySelector(
					`option[value='${getSpecialDamageTypeSentinel()}']`,
				),
			);
		}
		select.value = nextType;
		return;
	}

	if (existingDynamicOption instanceof HTMLOptionElement) {
		existingDynamicOption.remove();
	}
	select.value = selectValue;
};

const resolvePersistedDamageType = (type) => {
	const nextType = String(type ?? "none").trim() || "none";
	if (CONFIG.nalfa?.base_damage_types?.[nextType]) return nextType;
	if (CONFIG.nalfa?.base_standard_damage_types?.[nextType]) return nextType;
	if (CONFIG.nalfa?.fusion_damage_types?.[nextType]) return nextType;
	return "none";
};

const updateActionDamageType = async (item, propertyPath, type) => {
	const match = /^system\.actions\.(\d+)\.(.+)$/.exec(propertyPath);
	if (!match) {
		const systemPathMatch = /^system\.(.+)$/.exec(propertyPath);
		if (!systemPathMatch) {
			await item.update({ [propertyPath]: type });
			return;
		}

		const nextSystem = foundry.utils.deepClone(item.system ?? {});
		foundry.utils.setProperty(nextSystem, systemPathMatch[1], type);
		await item.update({ system: nextSystem });
		return;
	}

	const index = Number(match[1]);
	const actionPath = match[2];
	const currentActions = item.system?.actions;
	if (!Array.isArray(currentActions) || !currentActions[index]) {
		await item.update({ [propertyPath]: type });
		return;
	}

	const nextActions = foundry.utils.deepClone(currentActions);
	foundry.utils.setProperty(nextActions[index], actionPath, type);
	await item.update({ "system.actions": nextActions });
};

export const handleChangeDamageType = async (sheet, event) => {
	const select = event.currentTarget;
	if (!(select instanceof HTMLSelectElement)) return;

	event.preventDefault();
	event.stopImmediatePropagation();
	event.stopPropagation();

	const propertyPath = String(select.name ?? "").trim();
	if (!propertyPath) {
		syncDamageTypeSelectValue(select, "none");
		return;
	}

	try {
		let safeType = resolvePersistedDamageType(select.value);
		console.info("[nalfa] damage type change", {
			item: sheet.item?.name,
			propertyPath,
			selectedValue: select.value,
			safeType,
		});

		if (select.value === getSpecialDamageTypeSentinel()) {
			const currentValue =
				String(foundry.utils.getProperty(sheet.item, propertyPath) ?? "none").trim() ||
				"none";
			const nextType = await chooseSpecialDamageType(currentValue);
			safeType = CONFIG.nalfa?.fusion_damage_types?.[nextType] ? nextType : "none";
			console.info("[nalfa] special damage type resolved", {
				item: sheet.item?.name,
				propertyPath,
				currentValue,
				nextType,
				safeType,
			});
		}

		syncDamageTypeSelectValue(select, safeType);
		await updateActionDamageType(sheet.item, propertyPath, safeType);
	} catch (error) {
		console.error("[nalfa] damage type update failed", {
			item: sheet.item?.name,
			propertyPath,
			selectedValue: select.value,
			error,
		});
		syncDamageTypeSelectValue(
			select,
			String(foundry.utils.getProperty(sheet.item, propertyPath) ?? "none").trim() || "none",
		);
	}
};
