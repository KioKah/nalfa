import {
	arrayField,
	booleanField,
	htmlField,
	numberField,
	numberValueField,
	resistanceSchema,
	rollStatSchema,
	schemaField,
	skillSchema,
	statSchema,
	stringField,
} from "../base.mjs";
import { actionSchema } from "../items/schema.mjs";

const actionResourceSchema = (baseInitial = 1) =>
	schemaField({
		value: numberField(0),
		max: numberValueField(null),
		base: numberField(baseInitial),
		alt: numberField(0),
	});

const movementSchema = () =>
	schemaField({
		value: numberField(0),
		max: numberValueField(null),
		base: numberField(6),
		alt: numberField(0),
		alt_mult: numberField(1),
	});

export const baseAttributesSchema = () => ({
	hp: schemaField({
		value: numberField(1),
		abso: numberField(0),
		max: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
		formula: stringField(""),
	}),
	defense: schemaField({
		value: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
	}),
	evasion: schemaField({
		value: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
	}),
	initiative: schemaField({
		value: numberValueField(null),
		base: numberField(0),
		alt: numberField(0),
		stat: stringField("dex"),
		stat_coef: numberField(2),
	}),
	passive_percep: schemaField({
		value: numberValueField(null),
		base: numberField(8),
		alt: numberField(0),
		stat: stringField("wis"),
	}),
	reach: schemaField({
		value: numberValueField(null),
		base: numberField(1),
		alt: numberField(0),
		alt_mult: numberField(1),
	}),
	range_coef: schemaField({
		value: numberValueField(null),
		base: numberField(1),
		alt_mult: numberField(1),
	}),
	carrying_capacity: numberValueField(null),
	skills: schemaField({
		athlet: skillSchema("str"),
		robust: skillSchema("str"),
		adress: skillSchema("dex"),
		discre: skillSchema("dex"),
		acroba: skillSchema("dex"),
		cultur: skillSchema("int"),
		magie: skillSchema("int"),
		nature: skillSchema("int"),
		invest: skillSchema("int"),
		percep: skillSchema("wis"),
		sereni: skillSchema("wis"),
		intuit: skillSchema("wis"),
		intimi: skillSchema("cha"),
		trompe: skillSchema("cha"),
		persua: skillSchema("cha"),
		perfor: skillSchema("cha"),
		sante: skillSchema("con"),
		endura: skillSchema("con"),
	}),
	resistances: schemaField({
		soin: resistanceSchema(),
		abso: resistanceSchema(),
		tran: resistanceSchema(),
		perf: resistanceSchema(),
		cont: resistanceSchema(),
		soni: resistanceSchema(),
		sang: resistanceSchema(),
		feu: resistanceSchema(),
		eau: resistanceSchema(),
		terr: resistanceSchema(),
		air: resistanceSchema(),
		natu: resistanceSchema(),
		givr: resistanceSchema(),
		foud: resistanceSchema(),
		radt: resistanceSchema(),
		obsc: resistanceSchema(),
		arca: resistanceSchema(),
		chao: resistanceSchema(),
		necr: resistanceSchema(),
		psyc: resistanceSchema(),
	}),
});

const baseActionsSchema = () => ({
	main: actionResourceSchema(1),
	bonus: actionResourceSchema(1),
	concentration: actionResourceSchema(1),
	reaction: actionResourceSchema(1),
	movement: movementSchema(),
});

export const baseActorSchema = () => ({
	race: stringField(""),
	class: stringField(""),
	profile: stringField("none"),
	stats: schemaField({
		str: statSchema(),
		dex: statSchema(),
		int: statSchema(),
		wis: statSchema(),
		cha: statSchema(),
		con: statSchema(),
	}),
	roll_stats: schemaField({
		physical: rollStatSchema({ defaultStat: "str" }),
		incant: rollStatSchema({ stat: "none" }),
	}),
	da: schemaField({
		value: stringField("d2+1"),
		primary: stringField(""),
		secondary: stringField(""),
	}),
	damage_type: stringField("none"),
	weapon_state: schemaField({
		main_weapon_name: stringField(""),
		main_weapon_slot: stringField(""),
		main_weapon_can_use_dex: booleanField(false),
		main_weapon_attributes: arrayField(stringField(""), []),
		invalid_configuration: booleanField(false),
		warning: stringField(""),
	}),
	attributes: schemaField(baseAttributesSchema()),
	nalfa: schemaField({
		value: numberField(0),
		max: numberField(0),
	}),
	actions: schemaField(baseActionsSchema()),
	attack: actionSchema(),
	ui: schemaField({
		valueMode: stringField("values"),
	}),
});

export const characterActorSchema = () => ({
	...baseActorSchema(),
	description: htmlField(""),
	attributes: schemaField({
		...baseAttributesSchema(),
		level: numberField(1),
		exhaustion: numberField(0),
		death: schemaField({
			passing_throw: schemaField({
				base: numberField(11),
				stat: stringField("none"),
				value: numberValueField(null),
			}),
			successes: numberField(0),
			failures: numberField(0),
		}),
	}),
});

export const npcActorSchema = () => ({
	...baseActorSchema(),
	attributes: schemaField({
		...baseAttributesSchema(),
		elite: booleanField(false),
	}),
	description: htmlField(""),
	difficulty: numberField(1),
});
