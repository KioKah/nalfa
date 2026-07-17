import {
	rollAttackFromAction,
	rollSavePromptFromAction,
	sendPrivateSavePromptsFromAction,
} from "../../index.mjs";
import {
	clearActionRollState,
	clearTargetOutcomeState,
	getActionAttackResults,
	getActionSaveResults,
	getActionSelectedTargetRecords,
	getLatestTargetOutcomeState,
	initializeActionRollState,
	resolveTokenRecords,
	storeActionAttackResult,
	updateActionRollSelectedTargets,
} from "../context.mjs";
import {
	getCurrentTargetTokens,
	getDebugTokenSummary,
	getSourceToken,
	getTargetDefense,
	getTokenDisplayName,
} from "../internal/shared.mjs";

export const getSaveOutcomeStatus = ({ saveResult, actionData }) => {
	if (!saveResult) return null;
	if (saveResult.isSuccess) {
		return actionData?.jds?.fails_on_save === true ? "fail" : "warning";
	}
	return "success";
};

export const getTargetOutcomeData = ({ sourceToken, targetToken, actionData }) => {
	const empty = {
		attackResult: null,
		saveResult: null,
		markerStatus: "source",
	};
	const state = getLatestTargetOutcomeState(targetToken);
	if (!state) return empty;

	const sourceTokenUuid = String(
		sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "",
	).trim();
	if (
		sourceTokenUuid &&
		state.sourceTokenUuid &&
		state.sourceTokenUuid !== sourceTokenUuid
	) {
		return empty;
	}

	const attackResult = state.attack ?? null;
	const saveResult = state.save ?? null;
	const hasAttack = actionData?.jdt?.enabled === true;
	const hasSave = actionData?.jds?.enabled === true;
	let markerStatus = "source";

	if (!hasAttack && !hasSave) {
		markerStatus = "source";
	} else if (hasAttack && !hasSave) {
		markerStatus = attackResult ? (attackResult.isSuccess ? "success" : "fail") : "source";
	} else if (!hasAttack && hasSave) {
		markerStatus = getSaveOutcomeStatus({ saveResult, actionData }) ?? "source";
	} else if (attackResult && !saveResult) {
		markerStatus = attackResult.isSuccess ? "source" : "fail";
	} else if (attackResult && saveResult) {
		const saveStatus = getSaveOutcomeStatus({ saveResult, actionData });
		if (attackResult.isSuccess !== true || saveStatus === "fail") markerStatus = "fail";
		else if (saveStatus === "warning") markerStatus = "warning";
		else markerStatus = "success";
	}

	return {
		attackResult,
		saveResult,
		markerStatus,
	};
};

const logSaveTargetDebug = ({
	stage,
	sourceToken,
	actionData,
	rollContext,
	currentTargets = [],
	selectedTargets = [],
	attackResults = [],
	applicableTargets = [],
}) => {
	const sourceTokenUuid = String(
		sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "",
	).trim();
	const summarizeOutcome = (targetToken) => {
		const outcomeData = getTargetOutcomeData({ sourceToken, targetToken, actionData });
		const latestState = getLatestTargetOutcomeState(targetToken);
		return {
			...getDebugTokenSummary(targetToken),
			attackResult: outcomeData.attackResult
				? {
						isSuccess: outcomeData.attackResult.isSuccess,
						isCrit: outcomeData.attackResult.isCrit,
						isFumble: outcomeData.attackResult.isFumble,
				  }
				: null,
			outcomeContextId: String(latestState?.contextId ?? "").trim(),
			outcomeSourceTokenUuid: String(latestState?.sourceTokenUuid ?? "").trim(),
		};
	};

	console.log(`nalfa | JdS debug | ${stage}`, {
		sourceTokenUuid,
		rollContext: {
			contextId: String(rollContext?.contextId ?? "").trim(),
			actionIndex: Number.isInteger(rollContext?.actionIndex)
				? rollContext.actionIndex
				: -1,
			actionName: String(rollContext?.actionName ?? "").trim(),
			sourceItemUuid: String(rollContext?.sourceItemUuid ?? "").trim(),
		},
		currentTargets: currentTargets.map(summarizeOutcome),
		selectedTargets: selectedTargets.map(summarizeOutcome),
		attackResults: attackResults.map((result) => ({
			name: String(result?.name ?? "").trim(),
			tokenUuid: String(result?.tokenUuid ?? "").trim(),
			isSuccess: result?.isSuccess === true,
			isCrit: result?.isCrit === true,
			isFumble: result?.isFumble === true,
		})),
		applicableTargets: applicableTargets.map(getDebugTokenSummary),
	});
};

export const resetActionOutcomeState = async ({
	sourceToken,
	rollContext,
	targets = [],
}) => {
	const sourceTokenUuid = String(
		sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "",
	).trim();
	const seen = new Set();
	for (const targetToken of targets) {
		const targetTokenUuid = String(
			targetToken?.document?.uuid ?? targetToken?.uuid ?? "",
		).trim();
		if (!targetTokenUuid || seen.has(targetTokenUuid)) continue;
		seen.add(targetTokenUuid);
		await clearTargetOutcomeState({
			targetToken,
			sourceTokenUuid,
			rollContext,
		});
	}
	if (sourceToken) {
		await clearActionRollState({ sourceToken, rollContext });
	}
};

const getApplicableSavePromptTargets = async ({
	sourceToken,
	actionData,
	rollContext,
	currentTargets,
}) => {
	if (!sourceToken) return currentTargets;
	const currentSuccessfulTargets = currentTargets.filter((targetToken) => {
		return (
			getTargetOutcomeData({ sourceToken, targetToken, actionData }).attackResult
				?.isSuccess === true
		);
	});
	if (currentSuccessfulTargets.length) return currentSuccessfulTargets;

	const sourceTokenUuid = String(
		sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "",
	).trim();
	const matchesStoredAttackOutcome = (targetToken) => {
		const state = getLatestTargetOutcomeState(targetToken);
		if (!state?.attack) return false;
		if (state.attack.isSuccess !== true) return false;
		if (
			sourceTokenUuid &&
			state.sourceTokenUuid &&
			state.sourceTokenUuid !== sourceTokenUuid
		) {
			return false;
		}
		const rollContextId = String(rollContext?.contextId ?? "").trim();
		if (rollContextId && state.contextId && state.contextId !== rollContextId) return false;
		return true;
	};

	const attackResults = getActionAttackResults({ sourceToken, rollContext });
	if (!attackResults.length) {
		if (currentTargets.length) {
			return currentTargets.filter((targetToken) =>
				matchesStoredAttackOutcome(targetToken),
			);
		}

		const selectedTargets = await resolveTokenRecords(
			getActionSelectedTargetRecords({ sourceToken, rollContext }),
		);
		const selectedSuccessfulTargets = selectedTargets.filter((targetToken) => {
			return (
				getTargetOutcomeData({ sourceToken, targetToken, actionData }).attackResult
					?.isSuccess === true
			);
		});
		if (selectedSuccessfulTargets.length) return selectedSuccessfulTargets;
		return selectedTargets.filter((targetToken) => matchesStoredAttackOutcome(targetToken));
	}

	const successfulTargetUuids = new Set(
		attackResults
			.filter((result) => result.isSuccess)
			.map((result) => String(result.tokenUuid ?? "").trim())
			.filter(Boolean),
	);
	const successfulResults = attackResults.filter((result) => result.isSuccess);

	if (currentTargets.length) {
		const matchingCurrentTargets = currentTargets.filter((targetToken) => {
			const tokenUuid = String(
				targetToken?.document?.uuid ?? targetToken?.uuid ?? "",
			).trim();
			return successfulTargetUuids.has(tokenUuid);
		});
		if (matchingCurrentTargets.length) return matchingCurrentTargets;
	}

	return resolveTokenRecords(successfulResults);
};

export const getApplicableDamageTargets = async ({
	sourceToken,
	actionData,
	rollContext,
	currentTargets,
}) => {
	if (!sourceToken) {
		return {
			baseTargets: currentTargets,
			savedTargets: [],
			hasAttackResults: false,
			hasSaveResults: false,
		};
	}

	const saveResults = getActionSaveResults({ sourceToken, rollContext });
	if (saveResults.length) {
		const resolvedBaseTargets = await resolveTokenRecords(
			saveResults.filter((result) => !result.isSuccess),
		);
		const resolvedSavedTargets = await resolveTokenRecords(
			saveResults.filter((result) => result.isSuccess),
		);
		if (resolvedBaseTargets.length || resolvedSavedTargets.length) {
			return {
				baseTargets: resolvedBaseTargets,
				savedTargets: resolvedSavedTargets,
				hasAttackResults: false,
				hasSaveResults: true,
			};
		}

		const fallbackTargets = currentTargets.length
			? currentTargets
			: await resolveTokenRecords(
						getActionSelectedTargetRecords({ sourceToken, rollContext }),
				  );
		const baseTargets = fallbackTargets.filter((targetToken) => {
			return (
				getTargetOutcomeData({ sourceToken, targetToken, actionData }).saveResult
					?.isSuccess === false
			);
		});
		const savedTargets = fallbackTargets.filter((targetToken) => {
			return (
				getTargetOutcomeData({ sourceToken, targetToken, actionData }).saveResult
					?.isSuccess === true
			);
		});
		return {
			baseTargets,
			savedTargets,
			hasAttackResults: false,
			hasSaveResults: true,
		};
	}

	const attackResults = getActionAttackResults({ sourceToken, rollContext });
	if (attackResults.length) {
		const resolvedBaseTargets = await resolveTokenRecords(
			attackResults.filter((result) => result.isSuccess),
		);
		if (resolvedBaseTargets.length) {
			return {
				baseTargets: resolvedBaseTargets,
				savedTargets: [],
				hasAttackResults: true,
				hasSaveResults: false,
			};
		}

		const fallbackTargets = currentTargets.length
			? currentTargets
			: await resolveTokenRecords(
						getActionSelectedTargetRecords({ sourceToken, rollContext }),
				  );
		return {
			baseTargets: fallbackTargets.filter((targetToken) => {
				return (
					getTargetOutcomeData({ sourceToken, targetToken, actionData }).attackResult
						?.isSuccess === true
				);
			}),
			savedTargets: [],
			hasAttackResults: true,
			hasSaveResults: false,
		};
	}

	return {
		baseTargets: currentTargets,
		savedTargets: [],
		hasAttackResults: false,
		hasSaveResults: false,
	};
};

export const executeActionAttackRoll = async ({
	actor,
	actionData,
	titleName,
	chatContext,
	rollContext,
	promptAdjustments = false,
}) => {
	const targets = getCurrentTargetTokens();
	if (!targets.length) {
		return rollAttackFromAction(actor, actionData, {
			titleName,
			chatContext,
			promptAdjustments,
		});
	}

	const sourceToken = getSourceToken(actor);
	if (sourceToken) {
		await initializeActionRollState({ sourceToken, rollContext, selectedTargets: targets });
		console.log("nalfa | JdT debug | initialized action state", {
			sourceToken: getDebugTokenSummary(sourceToken),
			rollContext,
			targets: targets.map(getDebugTokenSummary),
		});
	}

	const results = [];
	for (const targetToken of targets) {
		const defense = getTargetDefense(targetToken);
		const result = await rollAttackFromAction(actor, actionData, {
			titleName,
			chatContext,
			targetDefense: defense,
			versusName: getTokenDisplayName(targetToken),
			promptAdjustments,
		});
		if (!result) continue;

		if (sourceToken) {
			await storeActionAttackResult({
				sourceToken,
				rollContext,
				targetToken,
				isSuccess: result.isSuccess,
				isCrit: result.isCrit,
				isFumble: result.isFumble,
				defense,
				rollTotal: result.roll?.total,
			});
			console.log("nalfa | JdT debug | stored attack result", {
				sourceToken: getDebugTokenSummary(sourceToken),
				rollContext,
				target: getDebugTokenSummary(targetToken),
				result: {
					isSuccess: result.isSuccess,
					isCrit: result.isCrit,
					isFumble: result.isFumble,
					rollTotal: result.roll?.total,
					defense,
				},
			});
		}

		results.push(result);
	}

	return results;
};

export const executeActionSavePromptRoll = async ({
	actor,
	actionData,
	titleName,
	chatContext,
	rollContext,
	promptAdjustments = false,
}) => {
	const currentTargets = getCurrentTargetTokens();
	const sourceToken = getSourceToken(actor);
	const attackResults = sourceToken
		? getActionAttackResults({ sourceToken, rollContext })
		: [];
	const selectedTargets = sourceToken
		? await resolveTokenRecords(
				getActionSelectedTargetRecords({ sourceToken, rollContext }),
		  )
		: [];
	logSaveTargetDebug({
		stage: "before resolution",
		sourceToken,
		actionData,
		rollContext,
		currentTargets,
		selectedTargets,
		attackResults,
	});
	const applicableTargets = await getApplicableSavePromptTargets({
		sourceToken,
		actionData,
		rollContext,
		currentTargets,
	});
	logSaveTargetDebug({
		stage: "after resolution",
		sourceToken,
		actionData,
		rollContext,
		currentTargets,
		selectedTargets,
		attackResults,
		applicableTargets,
	});
	if (!currentTargets.length && !applicableTargets.length) {
		return rollSavePromptFromAction(actor, actionData, {
			titleName,
			chatContext,
			promptAdjustments,
			autoNatural: true,
		});
	}
	if (!applicableTargets.length) {
		ui.notifications.warn("Aucune cible valide pour le JdS.");
		return [];
	}

	if (sourceToken) {
		await updateActionRollSelectedTargets({
			sourceToken,
			rollContext,
			selectedTargets: applicableTargets,
		});
	}

	return sendPrivateSavePromptsFromAction(actor, actionData, {
		titleName,
		chatContext,
		promptAdjustments,
		autoNatural: true,
		targets: applicableTargets,
		sourceTokenUuid: String(sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "").trim(),
		sourceTokenName: String(sourceToken?.name ?? actor.name ?? "").trim(),
		sourceTokenDocument: sourceToken?.document ?? null,
		rollContext,
	});
};
