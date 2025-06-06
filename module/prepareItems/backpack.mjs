import { round } from "../utils.mjs";

export function prepareBackpack(sheetData) {
	/* XXX
	// Variables de denominations :
	Object.values(sheetData.sysData.denominations).forEach((denomination) => {
		denomination.valid =
			denomination.amount != null &&
			denomination.amount >= 0 &&
			denomination.short_name &&
			denomination.monetary_value > 0 &&
			denomination.weight_coefficient != null &&
			denomination.weight_coefficient >= 0;

		if (denomination.valid) {
			denomination.value = denomination.amount * denomination.monetary_value;
			denomination.value = round(denomination.value);

			denomination.weight =
				denomination.amount *
				sheetData.sysData.base_coin_weight *
				denomination.weight_coefficient;
			denomination.weight = round(denomination.weight);
		} else {
			denomination.value = null;
			denomination.weight = null;
		}
	});

	// Variables générales de currency :
	sheetData.sysData.currency_base = Object.values(sheetData.sysData.denominations).find(
		(denomination) => denomination.monetary_value === 1 && denomination.valid
	).short_name;

	sheetData.sysData.all_valid =
		Object.values(sheetData.sysData.denominations).every(
			(denomination) => denomination.valid
		) &&
		sheetData.sysData.base_coin_weight >= 0 &&
		sheetData.sysData.currency_base;

	if (sheetData.sysData.all_valid) {
		sheetData.sysData.total_value = round(
			Object.values(sheetData.sysData.denominations).reduce(
				(total, denomination) => total + denomination.value,
				0
			)
		);

		sheetData.sysData.total_weight = round(
			Object.values(sheetData.sysData.denominations).reduce(
				(total, denomination) => total + denomination.weight,
				0
			)
		);
	} else {
		sheetData.sysData.total_value = null;
		sheetData.sysData.total_weight = null;
		sheetData.sysData.add_denomination = false;
	}
	*/
}
