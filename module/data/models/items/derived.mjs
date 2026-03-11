import { roundNumber } from "../base.mjs";

export const prepareBaseItemDerivedData = (model) => {
	if (
		model.weight === undefined ||
		model.quantity === undefined ||
		model.total_weight === undefined
	) {
		return;
	}

	const weight = Number(model.weight ?? 0);
	const quantity = Number(model.quantity ?? 0);

	if (!Number.isFinite(weight) || !Number.isFinite(quantity)) {
		model.total_weight = null;
		return;
	}

	model.total_weight = roundNumber(weight * quantity);
};

export const prepareCurrencyDerivedData = (model) => {
	const baseCoinWeight = Number(model.base_coin_weight ?? 0);
	let totalValue = 0;
	let totalWeight = 0;
	let hasBaseDenomination = false;

	model.currency_base = "";

	for (const denomination of model.denominations ?? []) {
		const amount = Number(denomination.amount ?? 0);
		const shortName = String(denomination.short_name ?? "").trim();
		const monetaryValue = Number(denomination.monetary_value ?? 0);
		const weightCoefficient = Number(denomination.weight_coefficient ?? 0);

		denomination.valid =
			Number.isFinite(amount) &&
			amount >= 0 &&
			shortName.length > 0 &&
			Number.isFinite(monetaryValue) &&
			monetaryValue > 0 &&
			Number.isFinite(weightCoefficient) &&
			weightCoefficient >= 0;

		if (!denomination.valid) {
			denomination.value = null;
			denomination.weight = null;
			continue;
		}

		const value = roundNumber(amount * monetaryValue);
		const weight = roundNumber(amount * baseCoinWeight * weightCoefficient);

		denomination.value = value;
		denomination.weight = weight;
		totalValue += value;
		totalWeight += weight;

		if (!hasBaseDenomination && monetaryValue === 1) {
			hasBaseDenomination = true;
			model.currency_base = denomination.short_name;
		}
	}

	const allDenominationsValid = (model.denominations ?? []).every(
		(denomination) => denomination.valid,
	);
	const hasValidWeight = allDenominationsValid && baseCoinWeight >= 0;
	const calculatedWeight = hasValidWeight ? roundNumber(totalWeight) : 0;

	for (const slot of ["main_hand", "off_hand", "two_handed", "body"]) {
		model.equippable[slot] = false;
		model.equipped[slot] = false;
	}
	model.equippable.coin_pouch = true;
	model.equipped.coin_pouch = true;

	model.quantity = 1;
	model.weight = calculatedWeight;
	model.total_weight = hasValidWeight ? calculatedWeight : null;
	model.all_valid = hasValidWeight && hasBaseDenomination;

	if (model.all_valid) {
		model.total_value = roundNumber(totalValue);
		return;
	}

	model.total_value = null;
};

export const prepareClassDerivedData = (model) => {
	if (model.attributes?.armor_score) {
		model.attributes.armor_score.value = model.attributes.armor_score.base;
	}
};
