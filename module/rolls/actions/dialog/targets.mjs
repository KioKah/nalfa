import {
	getDistanceNote,
	getConeNote,
	getLineNote,
	getTokenDistance,
} from "../targeting/geometry.mjs";
import { promptManualTargetOutcomeEdit } from "./manualOutcome.mjs";
import { getSaveOutcomeStatus, getTargetOutcomeData } from "../targeting/state.mjs";
import {
	escapeAttribute,
	formatDistance,
	getSourceToken,
	getTokenDisplayName,
} from "../internal/shared.mjs";

const ACTION_DIALOG_TARGETS_SELECTOR = ".nalfa-action-dialog__targets-content";
const ACTION_DIALOG_TARGET_EDIT_SELECTOR = "[data-action='edit-target-outcome']";

const getTargetAmountLimit = (actionData) => {
	const rawAmount = String(actionData?.selection?.target?.amount ?? "").trim();
	if (!rawAmount) return { rawAmount: "0", isAoE: false, limit: 0 };
	if (rawAmount.toLowerCase() === "aoe") {
		return { rawAmount: "AoE", isAoE: true, limit: null };
	}

	const limit = Number(rawAmount);
	if (!Number.isFinite(limit) || limit < 0) {
		return { rawAmount, isAoE: false, limit: 0 };
	}

	return { rawAmount, isAoE: false, limit };
};

const getTargetRequirementLabel = (actionData) => {
	const targetData = actionData?.selection?.target ?? {};
	const { isAoE, limit } = getTargetAmountLimit(actionData);
	const targetUnit = String(targetData.unit ?? "").trim();
	const visibilityKey = String(targetData.visibility ?? "").trim();
	const includeSelf = targetData.include_self === true;
	const pluralize = (label) => {
		if (!label) return "";
		return isAoE || limit >= 2 ? `${label}s` : label;
	};
	const unitLabel = pluralize(
		CONFIG.nalfa?.selection_target_units?.[targetUnit] ?? targetUnit,
	);
	const visibilityLabel = pluralize(
		CONFIG.nalfa?.target_visibility?.[visibilityKey] ?? visibilityKey,
	);
	const details = [];

	if (unitLabel) details.push(unitLabel);
	if (visibilityLabel && targetUnit !== "self") details.push(visibilityLabel);
	if (includeSelf && targetUnit !== "self") details.push("(Soi inclus)");

	if (!details.length) return "";
	return `[${details.join(" ")}]`;
};

const getAttackOutcomeSelection = (attackResult) => {
	if (!attackResult) return "";
	if (attackResult.isSuccess) return attackResult.isCrit ? "crit" : "success";
	return attackResult.isFumble ? "fumble" : "fail";
};

const getSaveOutcomeSelection = (saveResult) => {
	if (!saveResult) return "";
	return saveResult.isSuccess ? "success" : "fail";
};

const getTargetEditActionAttributes = ({
	targetToken,
	sourceToken,
	rollContext,
	titleName,
	attackResult,
	saveResult,
}) => {
	const targetTokenUuid = String(
		targetToken?.document?.uuid ?? targetToken?.uuid ?? "",
	).trim();
	const sourceTokenUuid = String(
		sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "",
	).trim();
	if (!targetTokenUuid || !sourceTokenUuid) return "";

	return `data-action="edit-target-outcome" data-source-token-uuid="${escapeAttribute(sourceTokenUuid)}" data-target-token-uuid="${escapeAttribute(targetTokenUuid)}" data-context-id="${escapeAttribute(rollContext?.contextId)}" data-source-item-uuid="${escapeAttribute(rollContext?.sourceItemUuid)}" data-action-index="${escapeAttribute(rollContext?.actionIndex)}" data-action-name="${escapeAttribute(rollContext?.actionName ?? titleName)}" data-target-name="${escapeAttribute(getTokenDisplayName(targetToken))}" data-attack-outcome="${escapeAttribute(getAttackOutcomeSelection(attackResult))}" data-save-outcome="${escapeAttribute(getSaveOutcomeSelection(saveResult))}"`;
};

const getStoredTargetOutcomeHtml = ({
	sourceToken,
	targetToken,
	actionData,
	rollContext,
	titleName,
}) => {
	const { attackResult, saveResult } = getTargetOutcomeData({
		sourceToken,
		targetToken,
		actionData,
	});
	const editActionAttributes = getTargetEditActionAttributes({
		targetToken,
		sourceToken,
		rollContext,
		titleName,
		attackResult,
		saveResult,
	});
	const badges = [];
	if (attackResult) {
		const attackLabel = attackResult.isCrit
			? "JdT réussite critique"
			: attackResult.isFumble
				? "JdT échec critique"
				: attackResult.isSuccess
					? "JdT réussi"
					: "JdT échoué";
		const attackClass = attackResult.isSuccess ? "success" : "fail";
		badges.push(
			`<span class="nalfa-action-dialog__target-outcome nalfa-action-dialog__target-outcome--${attackClass}" ${editActionAttributes} data-tooltip="${foundry.utils.escapeHTML(attackLabel)}">T${attackResult.isCrit ? "!" : ""}</span>`,
		);
	}

	if (saveResult) {
		const saveClass = getSaveOutcomeStatus({ saveResult, actionData }) ?? "source";
		const saveLabel = saveResult.isSuccess
			? actionData?.jds?.fails_on_save === true
				? "JdS réussi - le sort échoue"
				: "JdS réussi - effet réduit/annulé"
			: "JdS échoué - effet appliqué";
		badges.push(
			`<span class="nalfa-action-dialog__target-outcome nalfa-action-dialog__target-outcome--${saveClass}" ${editActionAttributes} data-tooltip="${foundry.utils.escapeHTML(saveLabel)}">S</span>`,
		);
	}

	if (!badges.length) return "";
	return `<span class="nalfa-action-dialog__target-outcomes">${badges.join("")}</span>`;
};

const buildTargetEditButtonHtml = ({
	actionData,
	targetToken,
	sourceToken,
	rollContext,
	titleName,
}) => {
	if (actionData?.jdt?.enabled !== true && actionData?.jds?.enabled !== true) return "";

	const targetTokenUuid = String(
		targetToken?.document?.uuid ?? targetToken?.uuid ?? "",
	).trim();
	const sourceTokenUuid = String(
		sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "",
	).trim();
	if (!targetTokenUuid || !sourceTokenUuid) return "";

	const { attackResult, saveResult } = getTargetOutcomeData({
		sourceToken,
		targetToken,
		actionData,
	});
	const editActionAttributes = getTargetEditActionAttributes({
		targetToken,
		sourceToken,
		rollContext,
		titleName,
		attackResult,
		saveResult,
	});
	return `<a class="nalfa-action-dialog__target-edit" role="button" tabindex="0" ${editActionAttributes} data-tooltip="Editer T/S"><i class="fa-solid fa-pen-to-square"></i></a>`;
};

export const buildTargetInfoHtml = ({ actor, actionData, rollContext, titleName }) => {
	const sourceToken = getSourceToken(actor);
	if (!sourceToken) {
		return "<p>Aucun token source sélectionné.</p>";
	}

	const { rawAmount, isAoE, limit } = getTargetAmountLimit(actionData);
	const targets = Array.from(game.user?.targets ?? []).filter(Boolean);
	const selectionLabel = isAoE
		? "Cibles sélectionnées (AoE) :"
		: `Cibles sélectionnées ${targets.length}/${foundry.utils.escapeHTML(rawAmount)} :`;
	const targetCountNote = !isAoE && targets.length > limit ? " Trop de cibles !" : "";
	const requirementLabel = foundry.utils.escapeHTML(getTargetRequirementLabel(actionData));

	const coneNote = foundry.utils.escapeHTML(
		getConeNote({ sourceToken, actionData, targets }),
	);
	const lineNote = foundry.utils.escapeHTML(
		getLineNote({ sourceToken, actionData, targets }),
	);
	const extraNotes = [coneNote, lineNote]
		.filter(Boolean)
		.map((note) => `<p>${note}</p>`)
		.join("");
	const headerHtml = `<p>${selectionLabel}${targetCountNote}${requirementLabel ? ` ${requirementLabel}` : ""}</p>`;

	if (targets.length === 0) {
		return `${headerHtml}${extraNotes}`;
	}

	const targetLines = targets.map((targetToken) => {
		const name = foundry.utils.escapeHTML(getTokenDisplayName(targetToken));
		const distance = getTokenDistance(sourceToken, targetToken);
		const distanceLabel = formatDistance(distance);
		const note = getDistanceNote({ actor, actionData, distance });
		const outcomeHtml = getStoredTargetOutcomeHtml({
			sourceToken,
			targetToken,
			actionData,
			rollContext,
			titleName,
		});
		return {
			name,
			distanceLabel,
			note: foundry.utils.escapeHTML(note),
			outcomeHtml,
			editButtonHtml: buildTargetEditButtonHtml({
				actionData,
				targetToken,
				sourceToken,
				rollContext,
				titleName,
			}),
		};
	});

	const itemsHtml = targetLines
		.map((target) => {
			const noteSuffix = target.note ? ` ${target.note}` : "";
			return `<li class="nalfa-action-dialog__target-row"><span class="nalfa-action-dialog__target-text">${target.outcomeHtml}${target.name}, a ${target.distanceLabel}m.${noteSuffix}</span>${target.editButtonHtml}</li>`;
		})
		.join("");
	return `${headerHtml}<ul>${itemsHtml}</ul>${extraNotes}`;
};

export const createActionDialogLiveController = ({
	actor,
	actionData,
	previewController,
	rollContext,
	titleName,
}) => {
	const targetHookIds = [];
	const controlHookIds = [];
	const stateHookIds = [];

	const refreshDialogTargets = (dialog) => {
		const targetContainer = dialog.element?.querySelector(ACTION_DIALOG_TARGETS_SELECTOR);
		if (!(targetContainer instanceof HTMLElement)) return;
		targetContainer.innerHTML = buildTargetInfoHtml({
			actor,
			actionData,
			rollContext,
			titleName,
		});
	};

	const refresh = (dialog) => {
		refreshDialogTargets(dialog);
		previewController.cleanup();
		previewController.render();
	};

	return {
		activate(dialog) {
			refresh(dialog);

			const targetContainer = dialog.element?.querySelector(ACTION_DIALOG_TARGETS_SELECTOR);
			if (
				targetContainer instanceof HTMLElement &&
				!targetContainer.dataset.nalfaTargetEdit
			) {
				targetContainer.dataset.nalfaTargetEdit = "true";
				targetContainer.addEventListener("click", async (event) => {
					const button = event.target?.closest?.(ACTION_DIALOG_TARGET_EDIT_SELECTOR);
					if (!(button instanceof HTMLElement)) return;
					event.preventDefault();
					const targetTokenUuid = String(button.dataset.targetTokenUuid ?? "").trim();
					const targetTokenDoc = await fromUuid(targetTokenUuid);
					const targetToken = targetTokenDoc?.object ?? targetTokenDoc;
					if (!targetToken) {
						ui.notifications.warn("Cible introuvable.");
						return;
					}

					await promptManualTargetOutcomeEdit({
						actor,
						actionData,
						targetToken,
						rollContext,
						titleName,
					});
				});
			}

			targetHookIds.push(
				Hooks.on("targetToken", (user) => {
					if (user !== game.user) return;
					refresh(dialog);
				}),
			);

			controlHookIds.push(
				Hooks.on("controlToken", (token, controlled) => {
					void token;
					void controlled;
					refresh(dialog);
				}),
			);

			stateHookIds.push(
				Hooks.on("nalfaActionRollStateUpdated", ({ sourceTokenUuid } = {}) => {
					const currentSourceToken = getSourceToken(actor);
					const currentSourceTokenUuid = String(
						currentSourceToken?.document?.uuid ?? currentSourceToken?.uuid ?? "",
					).trim();
					if (!currentSourceTokenUuid || currentSourceTokenUuid !== sourceTokenUuid) {
						return;
					}
					refresh(dialog);
				}),
			);
		},
		cleanup() {
			for (const hookId of targetHookIds) Hooks.off("targetToken", hookId);
			for (const hookId of controlHookIds) Hooks.off("controlToken", hookId);
			for (const hookId of stateHookIds) {
				Hooks.off("nalfaActionRollStateUpdated", hookId);
			}
			targetHookIds.length = 0;
			controlHookIds.length = 0;
			stateHookIds.length = 0;
			previewController.cleanup();
		},
	};
};
