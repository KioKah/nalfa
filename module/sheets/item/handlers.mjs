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

export const handleAddArrayEntry = async (sheet, event) => {
	event.preventDefault();
	const button = event.currentTarget;
	const path = button.dataset.path;
	if (!path) return;

	const entryType = button.dataset.entryType ?? "string";
	await addArrayEntry(sheet.item, path, entryType);
};

export const handleRemoveArrayEntry = async (sheet, event) => {
	event.preventDefault();
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

	const isEnabled = Boolean(event.currentTarget.checked);
	await sheet.item.update(buildNeedsIdentificationUpdate(sheet.item, isEnabled));
};

export const handleToggleIdentified = async (sheet, event) => {
	event.preventDefault();
	event.stopImmediatePropagation();
	event.stopPropagation();

	const isIdentified = Boolean(event.currentTarget.checked);
	await sheet.item.update(buildIdentifiedUpdate(sheet.item, isIdentified));
};

export const handleChangeModifierCategory = async (sheet, event) => {
	event.preventDefault();
	event.stopImmediatePropagation();
	event.stopPropagation();

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
