import {
	getStatBasedValue,
	postRollMessage,
	rollD20WithModifier,
} from "../core/shared.mjs";

export const rollInitiative = async (actor, options = {}) => {
	if (!actor) return null;
	const { titleName = "", messageOptions = {} } = options;
	const initiativeObj = actor.system?.attributes?.initiative ?? {};
	const modifier = getStatBasedValue(actor, initiativeObj);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(modifier);
	const titleLabel = "Init";
	const titleValue = roll.total;
	const formulaText = `d20 [${dieResult ?? "-"}] + Init (${modifier})`;
	const showCriticalState = false;

	const rollData = {
		type: "initiative",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
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
			isCrit: showCriticalState ? isCrit : false,
			isFumble: showCriticalState ? isFumble : false,
		},
		messageOptions,
	);

	return rollData;
};
