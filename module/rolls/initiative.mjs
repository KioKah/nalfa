import { getStatBasedValue, postRollMessage, rollD20WithModifier } from "./shared.mjs";

export const rollInitiative = async (actor, options = {}) => {
	if (!actor) return null;
	const { titleName = "", messageOptions = {} } = options;
	const initiativeObj = actor.system?.attributes?.initiative ?? {};
	const modifier = getStatBasedValue(actor, initiativeObj);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(modifier);
	const titleLabel = "Init";
	const titleValue = roll.total;
	const formulaText = `d20 [${dieResult ?? "-"}] + Init (${modifier})`;

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
			isCrit,
			isFumble,
		},
		messageOptions,
	);

	return rollData;
};
