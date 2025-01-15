import { round } from "../utils.js";

export function prepareCurrency(sysData) {
	if (!sysData.quantity) {
		sysData.quantity = 1;
	}
	// Variables de denominations :
	Object.values(sysData.denominations).forEach((denomination) => {
		denomination.valid =
			denomination.amount != null &&
			denomination.amount >= 0 &&
			denomination.short_name &&
			denomination.monetary_value > 0 &&
			denomination.weight_coefficient != null &&
			denomination.weight_coefficient >= 0;

		if (denomination.valid) {
			denomination.amount *= sysData.quantity;

			denomination.value = denomination.amount * denomination.monetary_value;
			denomination.value = round(denomination.value);

			denomination.weight =
				denomination.amount * sysData.base_coin_weight * denomination.weight_coefficient;
			denomination.weight = round(denomination.weight);
		} else {
			denomination.value = null;
			denomination.weight = null;
		}
	});
	sysData.quantity = 1;

	// Variables générales de currency :
	let base_denomination = Object.values(sysData.denominations).find(
		(denomination) => denomination.monetary_value === 1 && denomination.valid
	);
	sysData.currency_base = base_denomination ? base_denomination.short_name : null;

	sysData.all_valid =
		Object.values(sysData.denominations).every((denomination) => denomination.valid) &&
		sysData.base_coin_weight >= 0 &&
		sysData.currency_base;

	if (sysData.all_valid) {
		sysData.total_value = round(
			Object.values(sysData.denominations).reduce(
				(total, denomination) => total + denomination.value,
				0
			)
		);

		sysData.total_weight = round(
			Object.values(sysData.denominations).reduce(
				(total, denomination) => total + denomination.weight,
				0
			)
		);
	} else {
		sysData.total_value = null;
		sysData.total_weight = null;
		sysData.add_denomination = false;
	}
}
