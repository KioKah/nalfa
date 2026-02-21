import {
	EQUIP_SLOT_KEYS,
	EQUIP_SLOT_NONE,
	EQUIP_SLOT_OPTIONS,
} from "./constants.mjs";

export const getEquippedSlotValue = (equippedState = {}, equippableState = {}) => {
	for (const { key } of EQUIP_SLOT_OPTIONS) {
		if (equippedState[key] && equippableState[key]) return key;
	}

	return EQUIP_SLOT_NONE;
};

export const getAnyEquippedSlotValue = (equippedState = {}) => {
	for (const { key } of EQUIP_SLOT_OPTIONS) {
		if (equippedState[key]) return key;
	}

	return EQUIP_SLOT_NONE;
};

export const isEquippedSlotLocked = (systemData = {}) => {
	if (!systemData?.cursed) return false;
	const equippedSlot = getAnyEquippedSlotValue(systemData.equipped ?? {});
	return equippedSlot !== EQUIP_SLOT_NONE;
};

export const getEquippedOptions = (equippableState = {}) => {
	const equippableSlots = EQUIP_SLOT_OPTIONS.filter(({ key }) => equippableState[key]);
	return [{ key: EQUIP_SLOT_NONE, label: "Non" }, ...equippableSlots];
};

export const buildEquippedSlotUpdate = (selectedSlot) => {
	const activeSlot =
		selectedSlot === EQUIP_SLOT_NONE || EQUIP_SLOT_KEYS.has(selectedSlot)
			? selectedSlot
			: EQUIP_SLOT_NONE;

	return EQUIP_SLOT_OPTIONS.reduce((updates, { key }) => {
		updates[`system.equipped.${key}`] = key === activeSlot;
		return updates;
	}, {});
};
