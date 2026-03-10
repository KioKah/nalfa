import {
	formatStatSuffix,
	getAttackName,
	getCompareSymbol,
	getLabel,
	getStatBasedValue,
	getStatTotal,
	postRollMessage,
	rollD20WithModifier,
} from "./shared.mjs";

export const rollSavePromptFromAction = async (actor, actionData = {}, options = {}) => {
	if (!actor) return null;

	const jds = actionData?.jds ?? {};
	const statKey = jds.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, "");
	const statLabel = statName || (statKey && statKey !== "none" ? statKey.toUpperCase() : "");
	const dc = Number(options.dc ?? jds.dd ?? 0);
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const content = await foundry.applications.handlebars.renderTemplate(
		"systems/nalfa/templates/chat/roll/prompt-save.hbs",
		{
			titleName,
			statKey,
			statLabel,
			dc,
		},
	);

	return ChatMessage.create({
		user: game.user.id,
		speaker: ChatMessage.getSpeaker({ actor }),
		content,
	});
};

export const rollSavePrompt = async (actor) => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const titleName = getAttackName(attack);
	return rollSavePromptFromAction(actor, attack, { titleName });
};

export const rollSaveTarget = async (actor, statKey, dc, titleName) => {
	if (!actor) return null;
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statValue = statKey ? getStatTotal(actor, statKey) : 0;
	const targetDc = Number(dc ?? 0);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(statValue);
	const isSuccess = Number(roll.total ?? 0) >= targetDc;
	const saveSuffix = formatStatSuffix(statKey, statName, statValue, statValue);
	const compareSymbol = getCompareSymbol(isSuccess);
	const formulaText = `d20 [${dieResult ?? "-"}]${saveSuffix} ${compareSymbol} DD ${targetDc}`;

	await postRollMessage(actor, "save", {
		actor,
		roll,
		titleLabel: "JdS",
		titleName: titleName ?? "",
		titleValue: roll.total,
		formulaText,
		hasTarget: true,
		isSuccess,
		isCrit,
		isFumble,
	});

	return {
		type: "save",
		roll,
		formulaText,
		isSuccess,
	};
};

export const rollStatSave = async (actor, statKey) => {
	if (!actor) return null;
	const statObj = actor.system?.stats?.[statKey] ?? {};
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const modifier = getStatBasedValue(actor, statObj.save ?? {}, statKey);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(modifier);
	const titleLabel = "JdS";
	const titleName = statName;
	const titleValue = roll.total;
	const saveSuffix = formatStatSuffix(statKey, statName, modifier, modifier);
	const formulaText = `d20 [${dieResult ?? "-"}]${saveSuffix}`;

	await postRollMessage(actor, "save", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		hasTarget: false,
		isCrit,
		isFumble,
	});

	return {
		type: "save",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
	};
};
