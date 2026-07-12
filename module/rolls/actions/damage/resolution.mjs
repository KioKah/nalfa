import {
	postDamageGroupMessage,
	postDamageSummaryMessage,
	rollDamageEntries,
} from "../../index.mjs";
import {
	getActionAttackResults,
	getActionSaveResults,
	getActionSelectedTargetRecords,
	resolveTokenRecords,
} from "../context.mjs";
import { applyDamageSummaryRowsToTargets } from "./application.mjs";
import {
	actionHasHealingDamage,
	buildDamageSummaryRows,
	combineDamageResults,
	getActionDamageEntries,
	getActionSavedDamageMode,
	getSavedDamageEntries,
} from "./summary.mjs";
import {
	getCurrentTargetTokens,
	getDebugTokenSummary,
	getSourceToken,
	sendGMReminder,
} from "../internal/shared.mjs";
import {
	getApplicableDamageTargets,
	getTargetOutcomeData,
	resetActionOutcomeState,
} from "../targeting/state.mjs";

const waitForChatMessageDiceAnimation = async (message) => {
	if (!message?.id) return;

	const dice3d = game.dice3d;
	const waitForAnimation =
		dice3d?.waitFor3DAnimationByMessageID ??
		dice3d?.waitFor3DAnimationByMessageId ??
		dice3d?.waitFor3DAnimation;
	if (!(waitForAnimation instanceof Function)) return;

	try {
		await waitForAnimation.call(dice3d, message.id);
	} catch (error) {
		console.warn("nalfa | Unable to await Dice So Nice animation.", error);
	}
};

export const executeActionDamageRoll = async ({
	actor,
	actionData,
	titleName,
	chatContext,
	rollContext,
}) => {
	const baseDamageEntries = getActionDamageEntries(actionData?.jdd?.damage_formulas ?? []);
	if (!baseDamageEntries.length) return null;

	const currentTargets = getCurrentTargetTokens();
	const sourceToken = getSourceToken(actor);
	const attackResults = sourceToken
		? getActionAttackResults({ sourceToken, rollContext })
		: [];
	const attackResultTargets = sourceToken ? await resolveTokenRecords(attackResults) : [];
	const selectedTargetTokens = sourceToken
		? await resolveTokenRecords(
				getActionSelectedTargetRecords({ sourceToken, rollContext }),
		  )
		: [];
	const saveResultTargets = sourceToken
		? await resolveTokenRecords(getActionSaveResults({ sourceToken, rollContext }))
		: [];
	const { baseTargets, savedTargets, hasAttackResults, hasSaveResults } =
		await getApplicableDamageTargets({
			sourceToken,
			actionData,
			rollContext,
			currentTargets,
		});
	const savedDamageMode = getActionSavedDamageMode(actionData);
	if (hasAttackResults && !baseTargets.length) {
		ui.notifications.warn("Aucune cible touchée pour le JdD.");
		return null;
	}
	const shouldRollBaseDamage =
		!hasSaveResults || savedDamageMode !== "other" || baseTargets.length > 0;
	const critCandidateMap = new Map();
	for (const targetToken of [
		...currentTargets,
		...selectedTargetTokens,
		...attackResultTargets,
		...baseTargets,
		...savedTargets,
	]) {
		const tokenUuid = String(targetToken?.document?.uuid ?? targetToken?.uuid ?? "").trim();
		if (!tokenUuid || critCandidateMap.has(tokenUuid)) continue;
		critCandidateMap.set(tokenUuid, targetToken);
	}
	const critTargets = Array.from(critCandidateMap.values()).filter((targetToken) => {
		const attackResult = getTargetOutcomeData({
			sourceToken,
			targetToken,
			actionData,
		}).attackResult;
		return attackResult?.isSuccess === true && attackResult?.isCrit === true;
	});
	const critTargetUuidSet = new Set(
		critTargets
			.map((targetToken) =>
				String(targetToken?.document?.uuid ?? targetToken?.uuid ?? "").trim(),
			)
			.filter(Boolean),
	);
	const damageRecipientUuidSet = new Set(
		[...baseTargets, ...savedTargets]
			.map((targetToken) =>
				String(targetToken?.document?.uuid ?? targetToken?.uuid ?? "").trim(),
			)
			.filter(Boolean),
	);
	const hasCritDamageTargets = Array.from(critTargetUuidSet).some((uuid) =>
		damageRecipientUuidSet.has(uuid),
	);
	const allDamageRecipientsAreCrit =
		damageRecipientUuidSet.size > 0 &&
		Array.from(damageRecipientUuidSet).every((uuid) => critTargetUuidSet.has(uuid));
	const resetTargets = [
		...currentTargets,
		...selectedTargetTokens,
		...attackResultTargets,
		...saveResultTargets,
		...baseTargets,
		...savedTargets,
		...critTargets,
	];
	console.log("nalfa | Crit damage debug | target resolution", {
		rollContext,
		attackResults: attackResults.map((result) => ({
			name: String(result?.name ?? "").trim(),
			tokenUuid: String(result?.tokenUuid ?? "").trim(),
			isSuccess: result?.isSuccess === true,
			isCrit: result?.isCrit === true,
		})),
		currentTargets: currentTargets.map(getDebugTokenSummary),
		selectedTargetTokens: selectedTargetTokens.map(getDebugTokenSummary),
		baseTargets: baseTargets.map(getDebugTokenSummary),
		savedTargets: savedTargets.map(getDebugTokenSummary),
		critTargets: critTargets.map(getDebugTokenSummary),
		hasCritDamageTargets,
		allDamageRecipientsAreCrit,
	});

	let baseResults = [];
	let baseMessage = null;
	let savedResults = [];
	let savedMessage = null;
	let critResults = [];
	let critMessage = null;
	let summaryRows = [];

	try {
		if (shouldRollBaseDamage) {
			baseResults = await rollDamageEntries(actor, baseDamageEntries, {
				weaponUsage: actionData?.weapon_usage,
			});
		}

		if (hasSaveResults && savedDamageMode === "other" && savedTargets.length) {
			const savedDamageEntries = getSavedDamageEntries(actionData);
			savedResults = await rollDamageEntries(actor, savedDamageEntries, {
				weaponUsage: actionData?.weapon_usage,
			});
		}

		if (hasCritDamageTargets) {
			console.log("nalfa | Crit damage debug | rolling crit bonus", {
				baseDamageEntries,
			});
			critResults = await rollDamageEntries(actor, baseDamageEntries, {
				includeStat: false,
				diceOnly: true,
				weaponUsage: actionData?.weapon_usage,
			});
			console.log("nalfa | Crit damage debug | crit results", {
				critResults: critResults.map((result) => ({
					formulaText: result?.formulaText,
					titleValue: result?.titleValue,
					damageTypeKey: result?.damageTypeKey,
				})),
			});
		}

		if (baseResults.length) {
			baseMessage = await postDamageGroupMessage(actor, {
				titleLabel:
					allDamageRecipientsAreCrit && critResults.length && savedDamageMode !== "other"
						? "JdD!!"
						: "JdD",
				titleName,
				results:
					allDamageRecipientsAreCrit && critResults.length && savedDamageMode !== "other"
						? combineDamageResults(baseResults, critResults)
						: baseResults,
				chatContext,
			});
		}

		if (savedResults.length) {
			savedMessage = await postDamageGroupMessage(actor, {
				titleLabel: "JdD sauvegardé",
				titleName,
				results: savedResults,
				chatContext,
			});
		}

		if (
			critResults.length &&
			!(allDamageRecipientsAreCrit && savedDamageMode !== "other")
		) {
			critMessage = await postDamageGroupMessage(actor, {
				titleLabel: "Crit",
				titleName,
				results: critResults,
				chatContext,
			});
		}

		await waitForChatMessageDiceAnimation(baseMessage);
		await waitForChatMessageDiceAnimation(savedMessage);
		await waitForChatMessageDiceAnimation(critMessage);

		if (baseTargets.length && baseResults.length) {
			summaryRows.push(
				...baseTargets.map((targetToken) => {
					const targetTokenUuid = String(
						targetToken?.document?.uuid ?? targetToken?.uuid ?? "",
					).trim();
					const damageResults = critTargetUuidSet.has(targetTokenUuid)
						? combineDamageResults(baseResults, critResults)
						: baseResults;
					return buildDamageSummaryRows({
						targets: [targetToken],
						damageResults,
					})[0];
				}),
			);
		}

		if (hasSaveResults && savedTargets.length) {
			if (savedDamageMode === "other") {
				if (savedResults.length) {
					summaryRows.push(
						...savedTargets.map((targetToken) => {
							const targetTokenUuid = String(
								targetToken?.document?.uuid ?? targetToken?.uuid ?? "",
							).trim();
							const damageResults = critTargetUuidSet.has(targetTokenUuid)
								? combineDamageResults(savedResults, critResults)
								: savedResults;
							return buildDamageSummaryRows({
								targets: [targetToken],
								damageResults,
							})[0];
						}),
					);
				}
			} else if (savedDamageMode === "half" && baseResults.length) {
				summaryRows.push(
					...savedTargets.map((targetToken) => {
						const targetTokenUuid = String(
							targetToken?.document?.uuid ?? targetToken?.uuid ?? "",
						).trim();
						const fullDamageResults = critTargetUuidSet.has(targetTokenUuid)
							? combineDamageResults(baseResults, critResults)
							: baseResults;
						return buildDamageSummaryRows({
							targets: [targetToken],
							damageResults: fullDamageResults,
							mode: "half",
						})[0];
					}),
				);
			} else if (baseResults.length) {
				summaryRows.push(
					...savedTargets.map((targetToken) => {
						const targetTokenUuid = String(
							targetToken?.document?.uuid ?? targetToken?.uuid ?? "",
						).trim();
						const damageResults = critTargetUuidSet.has(targetTokenUuid)
							? combineDamageResults(baseResults, critResults)
							: baseResults;
						return buildDamageSummaryRows({
							targets: [targetToken],
							damageResults,
						})[0];
					}),
				);
			}
		}

		summaryRows = summaryRows.filter(Boolean);
		console.log("nalfa | Crit damage debug | summary rows", { summaryRows });
		await applyDamageSummaryRowsToTargets(summaryRows);
		if (summaryRows.length) {
			await postDamageSummaryMessage(actor, {
				titleName,
				rows: summaryRows,
				chatContext,
			});
		}

		if (actionHasHealingDamage(actionData)) {
			await sendGMReminder("<p>Soin : Faire lancer pour potentiel Soin Critique.</p>");
		}

		if (!baseResults.length && !savedResults.length) {
			ui.notifications.warn("Aucun dégât applicable à lancer.");
			return null;
		}

		return {
			baseResults,
			critResults,
			savedResults,
			summaryRows,
		};
	} finally {
		await resetActionOutcomeState({
			sourceToken,
			rollContext,
			targets: resetTargets,
		});
	}
};
