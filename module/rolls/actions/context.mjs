const ACTION_ROLL_FLAG = "actionRollState";
const TARGET_OUTCOME_FLAG = "actionTargetOutcome";

const clonePlainObject = (value) => foundry.utils.deepClone(value ?? {});

const isValidActionIndex = (value) => Number.isInteger(value) && value >= 0;

const matchesActionState = (state, rollContext) => {
	if (!state || !rollContext) return false;

	const stateContextId = String(state.contextId ?? "").trim();
	const rollContextId = String(rollContext.contextId ?? "").trim();
	if (stateContextId && rollContextId && stateContextId === rollContextId) return true;

	const stateSourceItemUuid = String(state.sourceItemUuid ?? "").trim();
	const rollSourceItemUuid = String(rollContext.sourceItemUuid ?? "").trim();
	if (!stateSourceItemUuid || !rollSourceItemUuid || stateSourceItemUuid !== rollSourceItemUuid) {
		return false;
	}

	if (isValidActionIndex(state.actionIndex) && isValidActionIndex(rollContext.actionIndex)) {
		return state.actionIndex === rollContext.actionIndex;
	}

	const stateActionName = String(state.actionName ?? "").trim();
	const rollActionName = String(rollContext.actionName ?? "").trim();
	if (stateActionName && rollActionName) return stateActionName === rollActionName;

	return true;
};

const toTokenRecord = (token) => {
	const tokenUuid = String(token?.document?.uuid ?? token?.uuid ?? "").trim();
	if (!tokenUuid) return null;

	return {
		tokenUuid,
		actorUuid: String(token?.actor?.uuid ?? "").trim(),
		name: String(token?.document?.name ?? token?.name ?? "Cible").trim() || "Cible",
	};
};

const sortRecords = (records = {}) => {
	return Object.values(records).sort((left, right) => {
		return String(left?.name ?? "").localeCompare(String(right?.name ?? ""), "fr");
	});
};

const getActionRollFlag = (sourceToken) => {
	return clonePlainObject(sourceToken?.document?.getFlag?.("nalfa", ACTION_ROLL_FLAG));
};

export const getLatestActionRollState = (sourceToken) => {
	return getActionRollFlag(sourceToken);
};

const notifyActionRollStateUpdated = ({ sourceTokenUuid = "", contextId = "", targetTokenUuid = "" } = {}) => {
	Hooks.callAll("nalfaActionRollStateUpdated", {
		sourceTokenUuid: String(sourceTokenUuid ?? "").trim(),
		contextId: String(contextId ?? "").trim(),
		targetTokenUuid: String(targetTokenUuid ?? "").trim(),
	});
};

const setActionRollFlag = async (sourceToken, state) => {
	if (!sourceToken?.document?.setFlag) return null;
	await sourceToken.document.setFlag("nalfa", ACTION_ROLL_FLAG, state);
	notifyActionRollStateUpdated(state);
	return state;
};

const getTargetOutcomeFlag = (targetToken) => {
	return clonePlainObject(targetToken?.document?.getFlag?.("nalfa", TARGET_OUTCOME_FLAG));
};

const setTargetOutcomeFlag = async (targetToken, outcomeState) => {
	if (!targetToken?.document?.setFlag) return null;
	await targetToken.document.setFlag("nalfa", TARGET_OUTCOME_FLAG, outcomeState);
	notifyActionRollStateUpdated(outcomeState);
	return outcomeState;
};

export const getLatestTargetOutcomeState = (targetToken) => {
	return getTargetOutcomeFlag(targetToken);
};

export const clearActionRollState = async ({ sourceToken, rollContext }) => {
	const sourceTokenUuid = String(sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "").trim();
	const contextId = String(rollContext?.contextId ?? "").trim();
	if (!sourceToken?.document?.unsetFlag) return;
	await sourceToken.document.unsetFlag("nalfa", ACTION_ROLL_FLAG);
	notifyActionRollStateUpdated({ sourceTokenUuid, contextId });
};

export const clearTargetOutcomeState = async ({ targetToken, sourceTokenUuid = "", rollContext }) => {
	if (!targetToken?.document?.unsetFlag) return;
	const currentState = getTargetOutcomeFlag(targetToken);
	const normalizedSourceUuid = String(sourceTokenUuid ?? "").trim();
	if (
		normalizedSourceUuid &&
		currentState?.sourceTokenUuid &&
		currentState.sourceTokenUuid !== normalizedSourceUuid
	) {
		return;
	}
	await targetToken.document.unsetFlag("nalfa", TARGET_OUTCOME_FLAG);
	notifyActionRollStateUpdated({
		sourceTokenUuid: normalizedSourceUuid,
		contextId: String(rollContext?.contextId ?? "").trim(),
		targetTokenUuid: String(targetToken?.document?.uuid ?? targetToken?.uuid ?? "").trim(),
	});
};

const buildInitialState = ({ sourceToken, rollContext, selectedTargets = [] }) => {
	return {
		contextId: String(rollContext?.contextId ?? "").trim(),
		updatedAt: Date.now(),
		actionIndex: Number.isInteger(rollContext?.actionIndex) ? rollContext.actionIndex : -1,
		actionName: String(rollContext?.actionName ?? "").trim(),
		sourceItemUuid: String(rollContext?.sourceItemUuid ?? "").trim(),
		sourceTokenUuid: String(sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "").trim(),
		sourceTokenName:
			String(sourceToken?.name ?? sourceToken?.document?.name ?? "").trim() || "Source",
		selectedTargets: selectedTargets.map(toTokenRecord).filter(Boolean),
		attackResults: {},
		saveResults: {},
	};
};

export const createActionRollContext = ({ chatContext = null, sourceToken = null } = {}) => {
	const rollContext = {
		contextId: foundry.utils.randomID(),
		actionIndex: Number.isInteger(chatContext?.actionIndex) ? chatContext.actionIndex : -1,
		actionName: String(chatContext?.actionName ?? "").trim(),
		sourceItemUuid: String(chatContext?.sourceItemUuid ?? "").trim(),
	};

	const latestState = sourceToken ? getLatestActionRollState(sourceToken) : null;
	if (latestState && matchesActionState(latestState, { ...rollContext, contextId: "" })) {
		rollContext.contextId = String(latestState.contextId ?? "").trim() || rollContext.contextId;
	}

	return rollContext;
};

export const getStoredActionRollState = ({ sourceToken, rollContext }) => {
	const state = getActionRollFlag(sourceToken);
	return matchesActionState(state, rollContext) ? state : null;
};

export const initializeActionRollState = async ({
	sourceToken,
	rollContext,
	selectedTargets = [],
}) => {
	const contextId = String(rollContext?.contextId ?? "").trim();
	if (!sourceToken || !contextId) return null;

	const state = buildInitialState({ sourceToken, rollContext, selectedTargets });
	return setActionRollFlag(sourceToken, state);
};

export const ensureActionRollState = async ({
	sourceToken,
	rollContext,
	selectedTargets = [],
}) => {
	const existingState = getStoredActionRollState({ sourceToken, rollContext });
	if (existingState) {
		const nextContextId = String(rollContext?.contextId ?? "").trim();
		if (nextContextId && existingState.contextId !== nextContextId) {
			existingState.contextId = nextContextId;
			existingState.updatedAt = Date.now();
			await setActionRollFlag(sourceToken, existingState);
		}
		return existingState;
	}
	return initializeActionRollState({ sourceToken, rollContext, selectedTargets });
};

export const updateActionRollSelectedTargets = async ({
	sourceToken,
	rollContext,
	selectedTargets = [],
}) => {
	const state = await ensureActionRollState({ sourceToken, rollContext, selectedTargets });
	if (!state) return null;

	state.selectedTargets = selectedTargets.map(toTokenRecord).filter(Boolean);
	return setActionRollFlag(sourceToken, state);
};

export const storeActionAttackResult = async ({
	sourceToken,
	rollContext,
	targetToken,
	isSuccess,
	isCrit = false,
	isFumble = false,
	defense = null,
	rollTotal = null,
}) => {
	const state = await ensureActionRollState({
		sourceToken,
		rollContext,
		selectedTargets: [targetToken],
	});
	const targetRecord = toTokenRecord(targetToken);
	if (!state || !targetRecord) return null;

	state.attackResults[targetRecord.tokenUuid] = {
		...targetRecord,
		isSuccess: isSuccess === true,
		isCrit: isCrit === true,
		isFumble: isFumble === true,
		defense: Number.isFinite(Number(defense)) ? Number(defense) : null,
		rollTotal: Number.isFinite(Number(rollTotal)) ? Number(rollTotal) : null,
	};
	await setTargetOutcomeFlag(targetToken, {
		...(getTargetOutcomeFlag(targetToken) ?? {}),
		targetTokenUuid: targetRecord.tokenUuid,
		sourceTokenUuid: String(sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "").trim(),
		contextId: String(rollContext?.contextId ?? "").trim(),
		updatedAt: Date.now(),
		attack: {
			isSuccess: isSuccess === true,
			isCrit: isCrit === true,
			isFumble: isFumble === true,
			defense: Number.isFinite(Number(defense)) ? Number(defense) : null,
			rollTotal: Number.isFinite(Number(rollTotal)) ? Number(rollTotal) : null,
		},
	});
	return setActionRollFlag(sourceToken, state);
};

export const storeActionSaveResult = async ({
	sourceTokenUuid,
	rollContext,
	targetToken,
	isSuccess,
	dc = null,
	rollTotal = null,
	casterTokenName = "",
}) => {
	const sourceTokenDoc = await fromUuid(sourceTokenUuid);
	const sourceToken = sourceTokenDoc?.object ?? sourceTokenDoc;
	if (!sourceToken) return null;

	const state = getStoredActionRollState({ sourceToken, rollContext });
	const targetRecord = toTokenRecord(targetToken);
	if (!state || !targetRecord) return null;

	state.saveResults[targetRecord.tokenUuid] = {
		...targetRecord,
		isSuccess: isSuccess === true,
		dc: Number.isFinite(Number(dc)) ? Number(dc) : null,
		rollTotal: Number.isFinite(Number(rollTotal)) ? Number(rollTotal) : null,
		casterTokenName: String(casterTokenName ?? "").trim(),
	};
	await setTargetOutcomeFlag(targetToken, {
		...(getTargetOutcomeFlag(targetToken) ?? {}),
		targetTokenUuid: targetRecord.tokenUuid,
		sourceTokenUuid: String(sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "").trim(),
		contextId: String(rollContext?.contextId ?? "").trim(),
		updatedAt: Date.now(),
		save: {
			isSuccess: isSuccess === true,
			dc: Number.isFinite(Number(dc)) ? Number(dc) : null,
			rollTotal: Number.isFinite(Number(rollTotal)) ? Number(rollTotal) : null,
			casterTokenName: String(casterTokenName ?? "").trim(),
		},
	});
	return setActionRollFlag(sourceToken, state);
};

export const applyManualTargetOutcome = async ({
	sourceTokenUuid,
	rollContext,
	targetTokenUuid,
	attack,
	save,
} = {}) => {
	const sourceTokenDoc = await fromUuid(String(sourceTokenUuid ?? "").trim());
	const targetTokenDoc = await fromUuid(String(targetTokenUuid ?? "").trim());
	const sourceToken = sourceTokenDoc?.object ?? sourceTokenDoc;
	const targetToken = targetTokenDoc?.object ?? targetTokenDoc;
	if (!sourceToken || !targetToken) return null;

	const targetRecord = toTokenRecord(targetToken);
	if (!targetRecord) return null;

	const state = await ensureActionRollState({
		sourceToken,
		rollContext,
		selectedTargets: [targetToken],
	});
	if (!state) return null;

	const hasSelectedTarget = Array.isArray(state.selectedTargets)
		&& state.selectedTargets.some((entry) => entry?.tokenUuid === targetRecord.tokenUuid);
	if (!hasSelectedTarget) {
		state.selectedTargets = [...(state.selectedTargets ?? []), targetRecord];
	}

	if (attack !== undefined) {
		if (attack) state.attackResults[targetRecord.tokenUuid] = { ...targetRecord, ...attack };
		else delete state.attackResults[targetRecord.tokenUuid];
	}

	if (save !== undefined) {
		if (save) state.saveResults[targetRecord.tokenUuid] = { ...targetRecord, ...save };
		else delete state.saveResults[targetRecord.tokenUuid];
	}

	const outcomeState = {
		...(getTargetOutcomeFlag(targetToken) ?? {}),
		targetTokenUuid: targetRecord.tokenUuid,
		sourceTokenUuid: String(sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "").trim(),
		contextId: String(rollContext?.contextId ?? "").trim(),
		updatedAt: Date.now(),
	};

	if (attack !== undefined) {
		if (attack) outcomeState.attack = attack;
		else delete outcomeState.attack;
	}

	if (save !== undefined) {
		if (save) outcomeState.save = save;
		else delete outcomeState.save;
	}

	if (!outcomeState.attack && !outcomeState.save) {
		await clearTargetOutcomeState({
			targetToken,
			sourceTokenUuid: outcomeState.sourceTokenUuid,
			rollContext,
		});
	} else {
		await setTargetOutcomeFlag(targetToken, outcomeState);
	}

	return setActionRollFlag(sourceToken, state);
};

export const getActionAttackResults = ({ sourceToken, rollContext }) => {
	const state = getStoredActionRollState({ sourceToken, rollContext });
	return state ? sortRecords(state.attackResults) : [];
};

export const getActionSaveResults = ({ sourceToken, rollContext }) => {
	const state = getStoredActionRollState({ sourceToken, rollContext });
	return state ? sortRecords(state.saveResults) : [];
};

export const getActionSelectedTargetRecords = ({ sourceToken, rollContext }) => {
	const state = getStoredActionRollState({ sourceToken, rollContext });
	return Array.isArray(state?.selectedTargets) ? clonePlainObject(state.selectedTargets) : [];
};

export const resolveTokenRecords = async (records = []) => {
	const uuids = records.map((record) => String(record?.tokenUuid ?? "").trim()).filter(Boolean);
	const docs = await Promise.all(uuids.map((uuid) => fromUuid(uuid)));
	return docs.map((doc) => doc?.object ?? doc).filter(Boolean);
};

export const getActionRollContextFlagData = ({ sourceToken, rollContext }) => {
	const state = getStoredActionRollState({ sourceToken, rollContext });
	if (!state) return null;

	return {
		contextId: state.contextId,
		sourceTokenUuid: state.sourceTokenUuid,
		sourceTokenName: state.sourceTokenName,
		actionIndex: state.actionIndex,
		actionName: state.actionName,
		sourceItemUuid: state.sourceItemUuid,
	};
};
