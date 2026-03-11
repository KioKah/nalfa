const { TypeDataModel } = foundry.abstract;
const fields = foundry.data.fields;

export { TypeDataModel };

export const numberField = (initial = 0, options = {}) =>
	new fields.NumberField({ initial, ...options });

export const numberValueField = (initial = null, options = {}) => {
	const nullable = initial === null ? true : options.nullable;
	return new fields.NumberField({ initial, nullable, ...options });
};

export const stringField = (initial = "", options = {}) =>
	new fields.StringField({ initial, ...options });

export const htmlField = (initial = "", options = {}) =>
	new fields.HTMLField({ initial, ...options });

export const booleanField = (initial = false, options = {}) =>
	new fields.BooleanField({ initial, ...options });

export const schemaField = (schema) => new fields.SchemaField(schema);

export const arrayField = (elementField, initial = []) =>
	new fields.ArrayField(elementField, { initial });

export const roundNumber = (value, decimals = 6) =>
	Number(Math.round(value * 10 ** decimals) / 10 ** decimals);

export const toFiniteNumber = (value) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
};

export const saveSchema = () =>
	schemaField({
		base: numberField(0),
		alt: numberField(0),
		value: numberValueField(null),
		auto_fail: booleanField(false),
	});

export const statSchema = () =>
	schemaField({
		base: numberField(0),
		value: numberValueField(null),
		alt: numberField(0),
		save: saveSchema(),
	});

export const rollStatSchema = ({ defaultStat = null, stat = null } = {}) => {
	const schema = {
		value: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
	};

	if (defaultStat !== null) {
		schema.default_stat = stringField(defaultStat);
	}
	if (stat !== null) {
		schema.stat = stringField(stat);
	}

	return schemaField(schema);
};

export const skillSchema = (statKey) =>
	schemaField({
		value: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
		stat: stringField(statKey),
		default_stat: stringField(statKey),
	});

export const resistanceSchema = () =>
	schemaField({
		value: numberField(0),
		immune: booleanField(false),
	});
