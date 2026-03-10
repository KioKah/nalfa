const round = (value, decimals = 6) => {
	return Number(Math.round(value * 10 ** decimals) / 10 ** decimals);
};

export const registerHandlebarsHelpers = (nalfaConfig) => {
	Handlebars.registerHelper("onoff", function (bool) {
		return bool ? "on" : "off";
	});

	Handlebars.registerHelper("plusOne", function (numberString) {
		return String(parseInt(numberString, 10) + 1);
	});

	Handlebars.registerHelper("formulaSignedNumber", function (value) {
		const number = Number(value);
		if (!Number.isFinite(number)) return "";
		if (number == 0) return "";
		return number >= 0 ? `+${number}` : `${number}`;
	});

	Handlebars.registerHelper("repeat", function (n, content) {
		let result = "";
		for (let i = 0; i < n; ++i) {
			result += content.fn(i);
		}
		return result;
	});

	Handlebars.registerHelper("isEmptyArray", function (array) {
		return !array.length;
	});

	Handlebars.registerHelper("statName", function (stat) {
		return nalfaConfig.stats[stat];
	});

	Handlebars.registerHelper("skillName", function (skill) {
		return nalfaConfig.skills[skill];
	});

	Handlebars.registerHelper("actionName", function (action) {
		return nalfaConfig.actions[action];
	});

	Handlebars.registerHelper("valueBaseAlt", function (mode, systemPath, obj) {
		const hasValue = (value) => value !== null && value !== undefined;
		if (mode == "values" && hasValue(obj.value)) {
			return `<span class="value">${obj.value}</span>`;
		}
		if (mode == "base" && hasValue(obj.base)) {
			return `<input
						class="base"
						name="${systemPath}.base"
						type="number"
						value="${obj.base}"
						data-dtype="Number"
					/>`;
		}
		if (mode == "alt" && hasValue(obj.alt)) {
			return `<input
						class="alt"
						name="${systemPath}.alt"
						type="number"
						value="${obj.alt}"
						data-dtype="Number"
					/>`;
		}
		return "";
	});

	Handlebars.registerHelper("weightIcon", function () {
		return `<i class="fa-solid fa-weight-hanging fa-sm weight-unit"></i>`;
	});

	Handlebars.registerHelper("compactNumber", function (value, maxDigits = 4) {
		const number = Number(value);
		if (!Number.isFinite(number)) return "";

		const digits = Math.max(1, Number(maxDigits) || 4);
		const minMagnitude = 10 ** (1 - digits);
		const clampedNumber =
			number !== 0 && Math.abs(number) < minMagnitude
				? Math.sign(number) * minMagnitude
				: number;
		return new Intl.NumberFormat("fr-FR", {
			maximumSignificantDigits: digits,
			useGrouping: false,
		}).format(clampedNumber);
	});

	Handlebars.registerHelper("roundNumber", function (value, decimals = 2) {
		const number = Number(value);
		if (!Number.isFinite(number)) return "";

		const precision = Math.max(0, Math.trunc(Number(decimals) || 0));
		return round(number, precision);
	});

	Handlebars.registerHelper("pluralTargetLabel", function (label, count) {
		const amount = Number(count ?? 0);
		return amount >= 2 ? `${label}s` : `${label}`;
	});

	Handlebars.registerHelper("listTypedValues", function (listOfTypedValues) {
		return listOfTypedValues
			.map((elem) => `<span class="${elem.type}">${elem.value} ${elem.type}</span>`)
			.join(", ");
	});
};
