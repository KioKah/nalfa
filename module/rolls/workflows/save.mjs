import {
	formatStatSuffix,
	getAttackName,
	getCompareSymbol,
	getLabel,
	getStatBasedValue,
	getStatTotal,
	postRollMessage,
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
		...messageOptions,
	});
};

export const sendPrivateSavePromptsFromAction = async (
	actor,
	actionData = {},
	options = {},
) => {
	if (!actor) return [];

	const targets = Array.isArray(options.targets) ? options.targets.filter(Boolean) : [];
	if (!targets.length) {
		const message = await rollSavePromptFromAction(actor, actionData, options);
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

export const rollSavePrompt = async (actor) => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const titleName = getAttackName(attack);
	return rollSavePromptFromAction(actor, attack, { titleName });
};

export const rollSaveTarget = async (actor, statKey, dc, titleName, options = {}) => {
	if (!actor) return null;
	const statName = String(options.statName ?? getLabel(CONFIG.nalfa.stats, statKey, statKey));
	const explicitStatValue = Number(options.statValue ?? NaN);
	const statValue = Number.isFinite(explicitStatValue)
		? explicitStatValue
		: (statKey ? getStatTotal(actor, statKey) : 0);
	const targetDc = Number(dc ?? 0);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(statValue);
	const isSuccess = Number(roll.total ?? 0) >= targetDc;
	const saveSuffix = formatStatSuffix(statKey, statName, statValue, statValue);
	const compareSymbol = getCompareSymbol(isSuccess);
	const formulaText = `d20 [${dieResult ?? "-"}]${saveSuffix} ${compareSymbol} DD ${targetDc}`;
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
		titleValue: roll.total,
		formulaText,
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
