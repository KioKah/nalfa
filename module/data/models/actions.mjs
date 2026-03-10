import {
	createDefaultActionData,
	createDefaultDamageFormula,
} from "../../actions/core.mjs";
import {
	createDefaultEmbeddedAction,
	getDefaultEmbeddedActionShorthand,
} from "../../actions/embedded.mjs";
import {
	arrayField,
	booleanField,
	htmlField,
	numberField,
	numberValueField,
	schemaField,
	stringField,
} from "./base.mjs";

export const DEFAULT_ACTION_DESCRIPTION_TEXT = [
	"<table><tbody><tr>",
	'<td colspan="2" data-colwidth="352,0">',
	'<p style="text-align: center">Nom de l\'Action</p>',
	"</td>",
	"</tr><tr>",
	'<td colspan="2" data-colwidth="352,0">',
	'<p style="text-align: center">Effets</p>',
	"</td>",
	"</tr><tr>",
	'<td data-colwidth="352">',
	'<p style="text-align: center">Portee :</p>',
	"</td>",
	"<td>",
	'<p style="text-align: center">CD :</p>',
	"</td>",
	"</tr><tr>",
	'<td data-colwidth="352">',
	'<p style="text-align: center">Sort Niveau(?)</p>',
	"</td>",
	"<td>",
	'<p style="text-align: center">(Type d\'action)</p>',
	"</td>",
	"</tr></tbody></table>",
].join("");

export const DEFAULT_ACTION_DESCRIPTION_LORETEXT = "<p><em>-</em></p>";

const defaultActionCostOptionSchema = (initial = {}) =>
	schemaField({
		main: numberField(initial.main ?? 1),
		bonus: numberField(initial.bonus ?? 0),
		reaction: numberField(initial.reaction ?? 0),
		condition: stringField(initial.condition ?? ""),
	});

export const damageFormulaSchema = (initial = createDefaultDamageFormula()) =>
	schemaField({
		formula: stringField(initial.formula ?? ""),
		type: stringField(initial.type ?? "none"),
		stat: stringField(initial.stat ?? "none"),
	});

export const damageFormulaArrayField = (
	initial = [createDefaultDamageFormula()],
) => {
	return arrayField(damageFormulaSchema(), initial);
};

export const actionSchemaDefinition = () => {
	const defaults = createDefaultActionData();

	return {
		mode: stringField(defaults.mode),
		range_type: stringField(defaults.range_type),
		requires: stringField(defaults.requires),
		cost: schemaField({
			actions: schemaField({
				note: htmlField(defaults.cost.actions.note),
				options: arrayField(
					defaultActionCostOptionSchema(),
					defaults.cost.actions.options,
				),
			}),
			movement: schemaField({
				mode: stringField(defaults.cost.movement.mode),
				amount: numberField(defaults.cost.movement.amount),
				variable: stringField(defaults.cost.movement.variable),
			}),
			ester: schemaField({
				amount: numberField(defaults.cost.ester.amount),
				unit: stringField(defaults.cost.ester.unit),
			}),
			uses: schemaField({
				value: numberValueField(defaults.cost.uses.value),
				max: numberValueField(defaults.cost.uses.max),
				unit: stringField(defaults.cost.uses.unit),
			}),
			cooldown: schemaField({
				amount: numberField(defaults.cost.cooldown.amount),
				unit: stringField(defaults.cost.cooldown.unit),
			}),
		}),
		selection: schemaField({
			target: schemaField({
				amount: numberField(defaults.selection.target.amount),
				unit: stringField(defaults.selection.target.unit),
				visibility: stringField(defaults.selection.target.visibility),
				include_self: booleanField(defaults.selection.target.include_self),
			}),
			zone: schemaField({
				shape: stringField(defaults.selection.zone.shape),
				range_secondary: numberField(defaults.selection.zone.range_secondary),
				range: numberField(defaults.selection.zone.range),
				min_range: numberField(defaults.selection.zone.min_range),
				long_range: numberField(defaults.selection.zone.long_range),
				has_long_range: booleanField(defaults.selection.zone.has_long_range),
			}),
		}),
		effect: schemaField({
			text: htmlField(defaults.effect.text),
		}),
		jdt: schemaField({
			enabled: booleanField(defaults.jdt.enabled),
			stat: stringField(defaults.jdt.stat),
			bonus: numberField(defaults.jdt.bonus),
		}),
		jds: schemaField({
			enabled: booleanField(defaults.jds.enabled),
			dd: numberField(defaults.jds.dd),
			stat: stringField(defaults.jds.stat),
			text: stringField(defaults.jds.text),
			jdd_saved: booleanField(defaults.jds.jdd_saved),
		}),
		jdd: schemaField({
			enabled: booleanField(defaults.jdd.enabled),
			damage_formulas: damageFormulaArrayField(defaults.jdd.damage_formulas),
		}),
		jdd_saved: schemaField({
			enabled: booleanField(defaults.jdd_saved.enabled),
			damage_formulas: damageFormulaArrayField(defaults.jdd_saved.damage_formulas),
		}),
		concentration: schemaField({
			enabled: booleanField(defaults.concentration.enabled),
			stat: stringField(defaults.concentration.stat),
			dd: numberField(defaults.concentration.dd),
			enemy_attack_bonus: numberField(defaults.concentration.enemy_attack_bonus),
		}),
	};
};

export const actionSchema = () => schemaField(actionSchemaDefinition());

export const embeddedActionSchemaDefinition = () => {
	const defaults = createDefaultEmbeddedAction();

	return {
		name: stringField(defaults.name),
		shorthand: stringField(defaults.shorthand),
		source_uuid: stringField(defaults.source_uuid),
		source_version: stringField(defaults.source_version),
		source_hash: stringField(defaults.source_hash),
		always_refresh: booleanField(defaults.always_refresh),
		...actionSchemaDefinition(),
	};
};

export const embeddedActionSchema = () =>
	schemaField(embeddedActionSchemaDefinition());

export const defaultEmbeddedActionArrayInitial = () => [
	createDefaultEmbeddedAction({ shorthand: getDefaultEmbeddedActionShorthand(0) }),
];
