import {
	formatStatSuffix,
	getAttackName,
	getCompareSymbol,
	getD20RollDetail,
	formatRollAdjustment,
	getLabel,
	getStatBasedValue,
	getStatTotal,
	postRollMessage,
	promptD20RollOptions,
	rollD20WithModifier,
	withActionSheetFlag,
} from "../core/shared.mjs";
import { storeActionSaveResult } from "../actions/context.mjs";

const getWhisperUserIdsForActor = (actor) => {
	if (!actor || !game.users) return [];

	const ownerLevel = CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
	const recipients = game.users.filter((user) => {
		if (user.isGM) return true;
		return actor.testUserPermission?.(user, ownerLevel) === true;
	});

	return recipients.map((user) => user.id);
};

export const rollSavePromptFromAction = async (actor, actionData = {}, options = {}) => {
	if (!actor) return null;
	const messageOptions = withActionSheetFlag(
		options.messageOptions ?? {},
		options.chatContext,
	);

	const jds = actionData?.jds ?? {};
	const statKey = jds.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, "");
	const statLabel = statName || (statKey && statKey !== "none" ? statKey.toUpperCase() : "");
	const adjustments = options.promptAdjustments
		? await promptD20RollOptions({
				typeLabel: "JdS",
				baseModifier: 0,
				includeDifficulty: options.includeDifficulty,
			})
		: options.adjustments ?? null;
	if (options.promptAdjustments && !adjustments) return null;
	const dc = Number.isFinite(adjustments?.difficulty)
		? adjustments.difficulty
		: Number(options.dc ?? jds.dd ?? 0);
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const content = await foundry.applications.handlebars.renderTemplate(
		"systems/nalfa/templates/chat/roll/prompt-save.hbs",
		{
			titleName,
			statKey,
			statLabel,
				dc,
				rollBonus: adjustments?.bonus ?? 0,
				rollMode: adjustments?.mode ?? "normal",
				autoNatural: options.autoNatural === true,
			},
	);

	return ChatMessage.create({
		user: game.user.id,
		speaker: ChatMessage.getSpeaker({ actor }),
		content,
		...messageOptions,
	});
};

export const sendPrivateSavePromptsFromAction = async (
	actor,
	actionData = {},
	options = {},
) => {
	if (!actor) return [];
	const adjustments = options.promptAdjustments
		? await promptD20RollOptions({ typeLabel: "JdS", baseModifier: 0 })
		: options.adjustments ?? null;
	if (options.promptAdjustments && !adjustments) return [];

	const targets = Array.isArray(options.targets) ? options.targets.filter(Boolean) : [];
	if (!targets.length) {
		const message = await rollSavePromptFromAction(actor, actionData, {
			...options,
			promptAdjustments: false,
			adjustments,
		});
		return message ? [message] : [];
	}

	const jds = actionData?.jds ?? {};
	const statKey = jds.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, "");
	const statLabel = statName || (statKey && statKey !== "none" ? statKey.toUpperCase() : "");
	const dc = Number(options.dc ?? jds.dd ?? 0);
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const sourceTokenUuid = String(options.sourceTokenUuid ?? "").trim();
	const sourceTokenName = String(options.sourceTokenName ?? "").trim();
	const rollContext = options.rollContext ?? null;
	const messages = [];

	for (const targetToken of targets) {
		const targetStatValue = statKey ? getStatTotal(targetToken.actor, statKey) : 0;
		const targetName =
			String(targetToken.document?.name ?? targetToken.name ?? "Cible").trim() || "Cible";
		const content = await foundry.applications.handlebars.renderTemplate(
			"systems/nalfa/templates/chat/roll/prompt-save.hbs",
			{
				titleName,
				statKey,
				statLabel,
					dc,
					rollBonus: adjustments?.bonus ?? 0,
					rollMode: adjustments?.mode ?? "normal",
					autoNatural: options.autoNatural === true,
				targetName,
				sourceTokenName,
				targetTokenUuid: String(targetToken.document?.uuid ?? targetToken.uuid ?? "").trim(),
				targetActorUuid: String(targetToken.actor?.uuid ?? "").trim(),
				targetStatValue,
				sourceTokenUuid,
				contextId: String(rollContext?.contextId ?? "").trim(),
				sourceItemUuid: String(options.chatContext?.sourceItemUuid ?? "").trim(),
				actionIndex: Number.isInteger(options.chatContext?.actionIndex)
					? options.chatContext.actionIndex
					: -1,
				actionName: String(options.chatContext?.actionName ?? titleName).trim(),
			},
		);

		const whisper = getWhisperUserIdsForActor(targetToken.actor);
		const message = await ChatMessage.create({
			user: game.user.id,
			speaker: ChatMessage.getSpeaker({ actor, token: options.sourceTokenDocument ?? null }),
			content,
			whisper,
			...withActionSheetFlag(options.messageOptions ?? {}, options.chatContext),
		});
		if (message) messages.push(message);
	}

	return messages;
};

export const rollSavePrompt = async (actor, options = {}) => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const titleName = getAttackName(attack);
	return rollSavePromptFromAction(actor, attack, { titleName, ...options });
};

export const rollSaveTarget = async (actor, statKey, dc, titleName, options = {}) => {
	if (!actor) return null;
	const statName = String(options.statName ?? getLabel(CONFIG.nalfa.stats, statKey, statKey));
	const explicitStatValue = Number(options.statValue ?? NaN);
	const statValue = Number.isFinite(explicitStatValue)
		? explicitStatValue
		: (statKey ? getStatTotal(actor, statKey) : 0);
	const targetDc = Number(dc ?? 0);
	const rollResult = await rollD20WithModifier(statValue, {
		promptAdjustments: options.promptAdjustments,
		adjustments: options.adjustments,
		typeLabel: "JdS",
	});
	if (!rollResult) return null;
	const { roll, dieResult, isCrit, isFumble } = rollResult;
	const autoNatural = options.autoNatural === true;
	const isSuccess = autoNatural
		? (isCrit || (!isFumble && Number(roll.total ?? 0) >= targetDc))
		: Number(roll.total ?? 0) >= targetDc;
	const saveSuffix = formatStatSuffix(statKey, statName, statValue, statValue);
	const adjustmentSuffix = formatRollAdjustment(rollResult.customBonus);
	const compareSymbol = getCompareSymbol(isSuccess);
	const formulaText =
		`d20 [${dieResult ?? "-"}]${saveSuffix}${adjustmentSuffix} ` +
		`${compareSymbol} DD ${targetDc}`;
	const rollDetail = getD20RollDetail(
		roll,
		`${saveSuffix}${adjustmentSuffix}`,
		autoNatural
			? {
				isCrit,
				isFumble,
				modifier: rollResult.modifier,
				comparison: `${compareSymbol} DD ${targetDc}`,
			}
			: { modifier: rollResult.modifier, comparison: `${compareSymbol} DD ${targetDc}` },
	);
	const naturalTitle = isCrit
		? (rollResult.rollMode === "disadvantage" ? "20 Naturel !!" : "20 Naturel !")
		: (rollResult.rollMode === "advantage" ? "1 Naturel ?!" : "1 Naturel...");
	const titleValue = autoNatural && (isCrit || isFumble)
		? naturalTitle
		: roll.total;
	const messageOptions = withActionSheetFlag(
		options.messageOptions ?? {},
		options.chatContext,
	);

	await storeActionSaveResult({
		sourceTokenUuid: String(options.sourceTokenUuid ?? "").trim(),
		rollContext: options.rollContext,
		targetToken: options.targetToken,
		isSuccess,
		dc: targetDc,
		rollTotal: roll.total,
		casterTokenName: String(options.versusName ?? "").trim(),
	});

	await postRollMessage(actor, "save", {
		actor,
		roll,
		titleLabel: "JdS",
		titleName: titleName ?? "",
		titleValue,
		formulaText,
		rollDetail,
		hasTarget: true,
		isSuccess,
		versusName: String(options.versusName ?? "").trim(),
		isCrit,
		isFumble,
	}, messageOptions);

	return {
		type: "save",
		roll,
		formulaText,
		isSuccess,
	};
};

export const rollStatSave = async (actor, statKey, options = {}) => {
	if (!actor) return null;
	const statObj = actor.system?.stats?.[statKey] ?? {};
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const modifier = getStatBasedValue(actor, statObj.save ?? {}, statKey);
	const rollResult = await rollD20WithModifier(modifier, {
		promptAdjustments: options.promptAdjustments,
		adjustments: options.adjustments,
		includeDifficulty: options.includeDifficulty,
		typeLabel: "JdS",
	});
	if (!rollResult) return null;
	const { roll, dieResult, isCrit, isFumble } = rollResult;
	const titleLabel = "JdS";
	const titleName = statName;
	const difficulty = options.promptAdjustments
		? rollResult.adjustments?.difficulty
		: options.difficulty;
	const hasTarget = difficulty !== null && Number.isFinite(Number(difficulty));
	const targetDifficulty = Number(difficulty);
	const isSuccess = hasTarget ? Number(roll.total ?? 0) >= targetDifficulty : null;
	const titleValue = roll.total;
	const saveSuffix = formatStatSuffix(statKey, statName, modifier, modifier);
	const adjustmentSuffix = formatRollAdjustment(rollResult.customBonus);
	const comparison = hasTarget
		? `${getCompareSymbol(isSuccess)} DD ${targetDifficulty}`
		: "";
	const formulaText =
		`d20 [${dieResult ?? "-"}]${saveSuffix}${adjustmentSuffix}` +
		(comparison ? ` ${comparison}` : "");
	const rollDetail = getD20RollDetail(roll, `${saveSuffix}${adjustmentSuffix}`, {
		modifier: rollResult.modifier,
		comparison,
	});

	await postRollMessage(actor, "save", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		rollDetail,
		hasTarget,
		isSuccess,
		isCrit: hasTarget ? false : isCrit,
		isFumble: hasTarget ? false : isFumble,
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
