import {
	arrayField,
	booleanField,
	htmlField,
	numberField,
	numberValueField,
	resistanceSchema,
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
		athlet: skillSchema(),
		acroba: skillSchema(),
		adress: skillSchema(),
		discre: skillSchema(),
		endura: skillSchema(),
		percep: skillSchema(),
		analyse: skillSchema(),
		intuit: skillSchema(),
		persua: skillSchema(),
		intimi: skillSchema(),
		trompe: skillSchema(),
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
	secondary: actionResourceSchema(1),
	concentration: schemaField({
		value: numberField(0),
		max: numberValueField(null),
		base: numberField(1),
		alt: numberField(0),
		active: schemaField({
			name: stringField(""),
			stat: stringField("vig"),
			dd: numberField(0),
			source_item_uuid: stringField(""),
			action_index: numberField(-1),
		}),
	}),
	reaction: actionResourceSchema(1),
	movement: movementSchema(),
	interaction: actionResourceSchema(1),
});

export const baseActorSchema = () => ({
	race: stringField(""),
	class: stringField(""),
	health_profile: stringField("standard"),
	defense_profile: stringField("standard"),
	save_profile: stringField("stoic"),
	stats: schemaField({
		pui: statSchema(),
		poly: statSchema(),
		vig: statSchema(),
		agi: statSchema(),
		vol: statSchema(),
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
		exhaustion: numberField(0, { min: 0, max: 6, integer: true }),
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
