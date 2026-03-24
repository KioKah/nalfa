export const formatDistance = (distance) => {
	if (!Number.isFinite(distance)) return "?";
	return `${Number(distance.toFixed(2))}`;
};

export const getSourceToken = (actor) => {
	const controlledTokens = Array.isArray(canvas?.tokens?.controlled)
		? canvas.tokens.controlled
		: [];
	const controlledToken = controlledTokens.find((token) => token?.actor === actor);
	if (controlledToken) return controlledToken;

	if (actor?.getActiveTokens instanceof Function) {
		const activeTokens = actor.getActiveTokens(false, true);
		if (Array.isArray(activeTokens) && activeTokens.length > 0) {
			return activeTokens[0];
		}
	}

	return controlledTokens[0] ?? null;
};

export const getTokenDisplayName = (token) => {
	return String(token?.document?.name ?? token?.name ?? "Cible").trim() || "Cible";
};

export const getCurrentTargetTokens = () => {
	return Array.from(game.user?.targets ?? []).filter(Boolean);
};

export const getDebugTokenSummary = (token) => {
	return {
		name: getTokenDisplayName(token),
		tokenUuid: String(token?.document?.uuid ?? token?.uuid ?? "").trim(),
		actorUuid: String(token?.actor?.uuid ?? "").trim(),
	};
};

export const getTargetDefense = (targetToken) => {
	return Number(targetToken?.actor?.system?.attributes?.defense?.value ?? 0);
};

export const getGMWhisperIds = () => {
	return ChatMessage.getWhisperRecipients("GM")
		.map((user) => String(user?.id ?? "").trim())
		.filter(Boolean);
};

export const sendGMReminder = async (content) => {
	const whisper = getGMWhisperIds();
	if (!whisper.length) return null;
	return ChatMessage.create({
		user: game.user.id,
		content,
		whisper,
	});
};

export const escapeAttribute = (value) => foundry.utils.escapeHTML(String(value ?? ""));

export const buildActionChatContext = ({
	sourceItem = null,
	titleName = "",
	actionIndex = -1,
}) => {
	if (!(sourceItem instanceof Item)) return null;

	const sourceItemUuid = String(sourceItem.uuid ?? "").trim();
	if (!sourceItemUuid) return null;

	const actionName = String(titleName ?? "").trim();
	const context = {
		sourceItemUuid,
	};

	if (actionName) context.actionName = actionName;
	if (Number.isInteger(actionIndex) && actionIndex >= 0) {
		context.actionIndex = actionIndex;
	}

	return context;
};

export const getActionTitle = ({ actionData = {}, sourceItem = null, titleName = "" } = {}) => {
	const explicitTitle = String(titleName ?? "").trim();
	if (explicitTitle) return explicitTitle;

	const actionName = String(actionData?.name ?? "").trim();
	if (actionName) return actionName;

	const sourceName = String(sourceItem?.name ?? "").trim();
	if (sourceName) return sourceName;

	return "Action";
};
