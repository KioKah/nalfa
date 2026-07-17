import {
	getStatBasedValue,
	getD20RollDetail,
	formatRollAdjustment,
	postRollMessage,
	rollD20WithModifier,
} from "../core/shared.mjs";

export const rollInitiative = async (actor, options = {}) => {
	if (!actor) return null;
	const { titleName = "", messageOptions = {} } = options;
	const initiativeObj = actor.system?.attributes?.initiative ?? {};
	const modifier = getStatBasedValue(actor, initiativeObj);
	const rollResult = await rollD20WithModifier(modifier, {
		promptAdjustments: options.promptAdjustments,
		typeLabel: "Initiative",
	});
	if (!rollResult) return null;
	const { roll, dieResult, isCrit, isFumble } = rollResult;
	const titleLabel = "Init";
	const titleValue = roll.total;
	const adjustmentSuffix = formatRollAdjustment(rollResult.customBonus);
	const formulaText = `d20 [${dieResult ?? "-"}] + Init (${modifier})${adjustmentSuffix}`;
	const rollDetail = getD20RollDetail(roll, `+ Init (${modifier})${adjustmentSuffix}`, {
		modifier: rollResult.modifier,
	});
	const showCriticalState = false;

	const rollData = {
		type: "initiative",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		rollDetail,
	};

	await postRollMessage(
		actor,
		"initiative",
		{
			actor,
			roll,
			titleLabel,
			titleName,
			titleValue,
			formulaText,
			rollDetail,
			isCrit: showCriticalState ? isCrit : false,
			isFumble: showCriticalState ? isFumble : false,
		},
		messageOptions,
	);

	return rollData;
};
