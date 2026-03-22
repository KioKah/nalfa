import {
	rollAttackFromAction,
	rollConcentrationFromAction,
	postDamageGroupMessage,
	postDamageSummaryMessage,
	rollDamageEntries,
	rollSavePromptFromAction,
	sendPrivateSavePromptsFromAction,
	summarizeAppliedDamageForToken,
} from "../index.mjs";
import { buildEmbeddedActionRow } from "../../sheets/item/context/actions.mjs";
import {
	applyManualTargetOutcome,
	clearActionRollState,
	clearTargetOutcomeState,
	createActionRollContext,
	getActionAttackResults,
	getActionSelectedTargetRecords,
	getLatestTargetOutcomeState,
	getActionSaveResults,
	initializeActionRollState,
	resolveTokenRecords,
	storeActionAttackResult,
	updateActionRollSelectedTargets,
} from "./context.mjs";

const { DialogV2 } = foundry.applications.api;

const ACTION_DIALOG_CLASSES = ["nalfa", "sheet", "nalfa-action-dialog"];
const ACTION_DIALOG_TARGETS_SELECTOR = ".nalfa-action-dialog__targets-content";
const ACTION_DIALOG_TARGET_EDIT_SELECTOR = "[data-action='edit-target-outcome']";
const PREVIEW_LAYER_NAME = "nalfa-action-preview";
const TARGET_STATUS_COLORS = Object.freeze({
	ok: 0x3fb950,
	success: 0x3fb950,
	disadvantage: 0xd29922,
	fail: 0xf85149,
	impossible: 0xf85149,
	source: 0x58a6ff,
	warning: 0xd29922,
});

const ATTACK_OUTCOME_CHOICES = Object.freeze([
	{ value: "", label: "" },
	{ value: "success", label: "Réussite" },
	{ value: "crit", label: "Réussite critique !" },
	{ value: "fail", label: "Échec" },
	{ value: "fumble", label: "Échec critique !" },
]);

const SAVE_OUTCOME_CHOICES = Object.freeze([
	{ value: "", label: "" },
	{ value: "success", label: "Réussite adverse" },
	{ value: "fail", label: "Échec adverse" },
]);

const formatDistance = (distance) => {
	if (!Number.isFinite(distance)) return "?";
	return `${Number(distance.toFixed(2))}`;
};

const getTokenCenter = (token) => {
	const center = token?.center;
	if (!center) return null;
	if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return null;
	return center;
};

const getSourceToken = (actor) => {
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

const getTokenDisplayName = (token) => {
	return String(token?.document?.name ?? token?.name ?? "Cible").trim() || "Cible";
};

const getCurrentTargetTokens = () => {
	return Array.from(game.user?.targets ?? []).filter(Boolean);
};

const getDebugTokenSummary = (token) => {
	return {
		name: getTokenDisplayName(token),
		tokenUuid: String(token?.document?.uuid ?? token?.uuid ?? "").trim(),
		actorUuid: String(token?.actor?.uuid ?? "").trim(),
	};
};

const getTargetDefense = (targetToken) => {
	return Number(targetToken?.actor?.system?.attributes?.defense?.value ?? 0);
};

const getGMWhisperIds = () => {
	return ChatMessage.getWhisperRecipients("GM")
		.map((user) => String(user?.id ?? "").trim())
		.filter(Boolean);
};

const sendGMReminder = async (content) => {
	const whisper = getGMWhisperIds();
	if (!whisper.length) return null;
	return ChatMessage.create({
		user: game.user.id,
		content,
		whisper,
	});
};

const escapeAttribute = (value) => foundry.utils.escapeHTML(String(value ?? ""));

const getAttackOutcomeSelection = (attackResult) => {
	if (!attackResult) return "";
	if (attackResult.isSuccess) return attackResult.isCrit ? "crit" : "success";
	return attackResult.isFumble ? "fumble" : "fail";
};

const getSaveOutcomeSelection = (saveResult) => {
	if (!saveResult) return "";
	return saveResult.isSuccess ? "success" : "fail";
};

const getAttackOutcomeLabel = (value) => {
	return ATTACK_OUTCOME_CHOICES.find((choice) => choice.value === value)?.label ?? "-";
};

const getSaveOutcomeLabel = (value) => {
	return SAVE_OUTCOME_CHOICES.find((choice) => choice.value === value)?.label ?? "-";
};

const getManualAttackOutcomePayload = ({ value, defense }) => {
	const normalizedDefense = Number.isFinite(Number(defense)) ? Number(defense) : null;
	if (!value) return null;
	if (value === "success") {
		return {
			isSuccess: true,
			isCrit: false,
			isFumble: false,
			defense: normalizedDefense,
			rollTotal: null,
		};
	}
	if (value === "crit") {
		return {
			isSuccess: true,
			isCrit: true,
			isFumble: false,
			defense: normalizedDefense,
			rollTotal: null,
		};
	}
	if (value === "fumble") {
		return {
			isSuccess: false,
			isCrit: false,
			isFumble: true,
			defense: normalizedDefense,
			rollTotal: null,
		};
	}
	return {
		isSuccess: false,
		isCrit: false,
		isFumble: false,
		defense: normalizedDefense,
		rollTotal: null,
	};
};

const getManualSaveOutcomePayload = ({ value, dc, casterTokenName }) => {
	const normalizedDc = Number.isFinite(Number(dc)) ? Number(dc) : null;
	if (!value) return null;
	return {
		isSuccess: value === "success",
		dc: normalizedDc,
		rollTotal: null,
		casterTokenName: String(casterTokenName ?? "").trim(),
	};
};

const getManualOutcomeDialogContent = ({
	targetName,
	attackValue,
	saveValue,
	hasAttack,
	hasSave,
}) => {
	const attackOptions = ATTACK_OUTCOME_CHOICES.map((choice) => {
		const selected = choice.value === attackValue ? " selected" : "";
		return `<option value="${choice.value}"${selected}>${choice.label}</option>`;
	}).join("");
	const saveOptions = SAVE_OUTCOME_CHOICES.map((choice) => {
		const selected = choice.value === saveValue ? " selected" : "";
		return `<option value="${choice.value}"${selected}>${choice.label}</option>`;
	}).join("");

	return `<div class="nalfa-action-dialog__manual-edit"><p>Modifier les resultats de ${foundry.utils.escapeHTML(targetName)}.</p>${hasAttack ? `<label class="nalfa-action-dialog__manual-row"><span class="field__label">JdT</span><select name="manual-attack-outcome">${attackOptions}</select></label>` : ""}${hasSave ? `<label class="nalfa-action-dialog__manual-row"><span class="field__label">JdS</span><select name="manual-save-outcome">${saveOptions}</select></label>` : ""}</div>`;
};

const getManualOutcomeDialogValue = ({ dialog, hasAttack, hasSave }) => {
	return {
		attackValue: hasAttack
			? String(
					dialog.element?.querySelector("[name='manual-attack-outcome']")?.value ?? "",
				).trim()
			: "",
		saveValue: hasSave
			? String(
					dialog.element?.querySelector("[name='manual-save-outcome']")?.value ?? "",
				).trim()
			: "",
	};
};

const actionHasHealingDamage = (actionData) => {
	const baseEntries = getActionDamageEntries(actionData?.jdd?.damage_formulas ?? []);
	const savedEntries = getSavedDamageEntries(actionData);
	return [...baseEntries, ...savedEntries].some((entry) => {
		return String(entry?.effect ?? "").trim() === "healing"
			|| String(entry?.damageType ?? "none").trim() === "soin";
	});
};

const sendManualOutcomeRequestToGM = async ({
	requesterName,
	targetName,
	actionName,
	sourceTokenUuid,
	targetTokenUuid,
	rollContext,
	attackValue,
	saveValue,
	defense,
	dc,
	casterTokenName,
}) => {
	const whisper = getGMWhisperIds();
	if (!whisper.length) return null;

	const parts = [];
	if (attackValue !== undefined) parts.push(`JdT: ${getAttackOutcomeLabel(attackValue)}`);
	if (saveValue !== undefined) parts.push(`JdS: ${getSaveOutcomeLabel(saveValue)}`);
	const attackAttrs =
		attackValue !== undefined
			? ` data-has-attack="true" data-attack-outcome="${escapeAttribute(attackValue)}" data-defense="${escapeAttribute(defense)}"`
			: "";
	const saveAttrs =
		saveValue !== undefined
			? ` data-has-save="true" data-save-outcome="${escapeAttribute(saveValue)}" data-dc="${escapeAttribute(dc)}" data-caster-token-name="${escapeAttribute(casterTokenName)}"`
			: "";
	const content = `<div class="nalfa-chat-card nalfa-roll-card nalfa-chat-card--prompt"><header class="nalfa-roll-header"><h3 class="nalfa-roll-title"><span class="nalfa-roll-label">Edition T/S</span>${actionName ? `<span class="nalfa-roll-separator">·</span><span class="nalfa-roll-name">${foundry.utils.escapeHTML(actionName)}</span>` : ""}</h3></header><div class="nalfa-roll-summary"><span>${foundry.utils.escapeHTML(requesterName)} demande une mise a jour pour ${foundry.utils.escapeHTML(targetName)}.</span></div><div class="nalfa-roll-details"><span class="nalfa-roll-formula">${foundry.utils.escapeHTML(parts.join(" | "))}</span></div><div class="nalfa-roll-action"><button type="button" class="nalfa-manual-outcome-apply" data-source-token-uuid="${escapeAttribute(sourceTokenUuid)}" data-target-token-uuid="${escapeAttribute(targetTokenUuid)}" data-context-id="${escapeAttribute(rollContext?.contextId)}" data-source-item-uuid="${escapeAttribute(rollContext?.sourceItemUuid)}" data-action-index="${escapeAttribute(rollContext?.actionIndex)}" data-action-name="${escapeAttribute(rollContext?.actionName)}"${attackAttrs}${saveAttrs}>Appliquer</button></div></div>`;

	return ChatMessage.create({
		user: game.user.id,
		content,
		whisper,
	});
};

const promptManualTargetOutcomeEdit = async ({
	actor,
	actionData,
	targetToken,
	rollContext,
	titleName,
}) => {
	const sourceToken = getSourceToken(actor);
	const sourceTokenUuid = String(
		sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "",
	).trim();
	const targetTokenUuid = String(
		targetToken?.document?.uuid ?? targetToken?.uuid ?? "",
	).trim();
	if (!sourceTokenUuid || !targetTokenUuid) {
		ui.notifications.warn("Impossible de retrouver la source ou la cible.");
		return null;
	}

	const targetName = getTokenDisplayName(targetToken);
	const { attackResult, saveResult } = getTargetOutcomeData({
		sourceToken,
		targetToken,
		actionData,
	});
	const hasAttack = actionData?.jdt?.enabled === true;
	const hasSave = actionData?.jds?.enabled === true;
	const currentAttackValue = getAttackOutcomeSelection(attackResult);
	const currentSaveValue = getSaveOutcomeSelection(saveResult);
	const defense = attackResult?.defense ?? getTargetDefense(targetToken);
	const dc = saveResult?.dc ?? Number(actionData?.jds?.dd ?? 0);
	const casterTokenName = String(sourceToken?.name ?? actor?.name ?? "").trim();
	const selection = await waitForActionDialog(
		{
			classes: [...ACTION_DIALOG_CLASSES, "nalfa-action-dialog--manual-edit"],
			window: {
				title: `Edition T/S - ${targetName}`,
			},
			content: getManualOutcomeDialogContent({
				targetName,
				attackValue: currentAttackValue,
				saveValue: currentSaveValue,
				hasAttack,
				hasSave,
			}),
			buttons: [
				{
					action: "cancel",
					label: "Annuler",
					callback: () => null,
				},
				{
					action: "confirm",
					label: game.user?.isGM ? "Appliquer" : "Envoyer au MJ",
					default: true,
					callback: (event, target, dialog) => {
						void event;
						void target;
						return getManualOutcomeDialogValue({ dialog, hasAttack, hasSave });
					},
				},
			],
		},
		{ closeValue: null },
	);
	if (!selection) return null;

	const attack = hasAttack
		? getManualAttackOutcomePayload({ value: selection.attackValue, defense })
		: undefined;
	const save = hasSave
		? getManualSaveOutcomePayload({
				value: selection.saveValue,
				dc,
				casterTokenName,
			})
		: undefined;

	if (game.user?.isGM) {
		return applyManualTargetOutcome({
			sourceTokenUuid,
			rollContext,
			targetTokenUuid,
			attack,
			save,
		});
	}

	const message = await sendManualOutcomeRequestToGM({
		requesterName: String(game.user?.name ?? actor?.name ?? "Joueur").trim() || "Joueur",
		targetName,
		actionName: String(titleName ?? actionData?.name ?? "").trim(),
		sourceTokenUuid,
		targetTokenUuid,
		rollContext,
		attackValue: hasAttack ? selection.attackValue : undefined,
		saveValue: hasSave ? selection.saveValue : undefined,
		defense,
		dc,
		casterTokenName,
	});
	if (!message) {
		ui.notifications.warn("Aucun MJ disponible pour recevoir la demande.");
		return null;
	}

	ui.notifications.info("Demande envoyee au MJ.");
	return message;
};

const getTokenDistance = (sourceToken, targetToken) => {
	const sourcePoint = getTokenCenter(sourceToken);
	const targetPoint = getTokenCenter(targetToken);
	if (!sourcePoint || !targetPoint || !canvas?.grid?.measurePath) return null;

	const measurement = canvas.grid.measurePath([sourcePoint, targetPoint]);
	if (Number.isFinite(measurement?.distance)) return measurement.distance;
	if (Number.isFinite(measurement?.cost)) return measurement.cost;

	const lastSegment = Array.isArray(measurement?.segments)
		? measurement.segments.at(-1)
		: null;
	if (Number.isFinite(lastSegment?.distance)) return lastSegment.distance;
	if (Number.isFinite(lastSegment?.cost)) return lastSegment.cost;

	return null;
};

const getPointDelta = (sourceToken, targetToken) => {
	const sourcePoint = getTokenCenter(sourceToken);
	const targetPoint = getTokenCenter(targetToken);
	if (!sourcePoint || !targetPoint) return null;

	return {
		x: targetPoint.x - sourcePoint.x,
		y: targetPoint.y - sourcePoint.y,
	};
};

const getSceneUnitsPerPixel = () => {
	const gridDistance = Number(canvas?.grid?.distance ?? 0);
	const gridSize = Number(canvas?.grid?.size ?? 0);
	if (!(gridDistance > 0) || !(gridSize > 0)) return null;
	return gridDistance / gridSize;
};

const getScenePixelsPerUnit = () => {
	const unitsPerPixel = getSceneUnitsPerPixel();
	if (!Number.isFinite(unitsPerPixel) || !(unitsPerPixel > 0)) return null;
	return 1 / unitsPerPixel;
};

const getShapeRelevantTargets = ({ sourceToken, targets }) => {
	return targets.filter((targetToken) => {
		const distance = getTokenDistance(sourceToken, targetToken);
		return !Number.isFinite(distance) || distance > 0;
	});
};

const getLineWidthAtAngle = ({ sourceToken, targets, angleDegrees }) => {
	const unitsPerPixel = getSceneUnitsPerPixel();
	if (!Number.isFinite(unitsPerPixel)) return null;

	const angleRadians = (angleDegrees * Math.PI) / 180;
	const directionX = Math.cos(angleRadians);
	const directionY = Math.sin(angleRadians);
	const normalX = -Math.sin(angleRadians);
	const normalY = Math.cos(angleRadians);
	let maxOffset = 0;

	for (const targetToken of targets) {
		const delta = getPointDelta(sourceToken, targetToken);
		if (!delta) return null;

		const forwardProjectionPixels = delta.x * directionX + delta.y * directionY;
		if (forwardProjectionPixels < 0) return null;

		const perpendicularOffsetPixels = Math.abs(delta.x * normalX + delta.y * normalY);
		const perpendicularOffset = perpendicularOffsetPixels * unitsPerPixel;
		if (perpendicularOffset > maxOffset) maxOffset = perpendicularOffset;
	}

	return maxOffset * 2;
};

const normalizeDirectionDegrees = (angleDegrees) => {
	let angle = angleDegrees % 360;
	if (angle < 0) angle += 360;
	return angle;
};

const getTargetAngleDegrees = (sourceToken, targetToken) => {
	const delta = getPointDelta(sourceToken, targetToken);
	if (!delta) return null;
	return (Math.atan2(delta.y, delta.x) * 180) / Math.PI;
};

const getCandidateLineAngles = ({ sourceToken, targets }) => {
	const rawAngles = targets
		.map((targetToken) => getTargetAngleDegrees(sourceToken, targetToken))
		.filter(Number.isFinite)
		.map((angle) => normalizeDirectionDegrees(angle))
		.sort((left, right) => left - right);

	if (rawAngles.length === 0) return [];

	const candidates = new Set(rawAngles.map((angle) => angle.toFixed(6)));
	for (let index = 0; index < rawAngles.length; index += 1) {
		const currentAngle = rawAngles[index];
		const nextAngle = rawAngles[(index + 1) % rawAngles.length];
		const wrappedNextAngle = index + 1 < rawAngles.length ? nextAngle : nextAngle + 360;
		const midpoint = normalizeDirectionDegrees((currentAngle + wrappedNextAngle) / 2);
		candidates.add(midpoint.toFixed(6));
	}

	return Array.from(candidates, (value) => Number(value));
};

const getBestLineFit = ({ sourceToken, targets }) => {
	const candidateAngles = getCandidateLineAngles({ sourceToken, targets });
	let bestFit = null;

	for (const angleDegrees of candidateAngles) {
		const width = getLineWidthAtAngle({ sourceToken, targets, angleDegrees });
		if (!Number.isFinite(width)) continue;
		if (!bestFit || width < bestFit.width) {
			bestFit = {
				angleDegrees,
				width,
			};
		}
	}

	return bestFit;
};

const getBestConeFit = ({ sourceToken, targets }) => {
	const targetAngles = targets
		.map((targetToken) => getTargetAngleDegrees(sourceToken, targetToken))
		.filter(Number.isFinite)
		.map((angle) => normalizeDirectionDegrees(angle))
		.sort((left, right) => left - right);

	if (targetAngles.length === 0) return null;
	if (targetAngles.length === 1) {
		return {
			directionDegrees: targetAngles[0],
			angle: 0,
		};
	}

	let largestGap = -1;
	let gapStartAngle = targetAngles[0];
	let gapEndAngle = targetAngles[0];

	for (let index = 0; index < targetAngles.length; index += 1) {
		const currentAngle = targetAngles[index];
		const nextAngle = targetAngles[(index + 1) % targetAngles.length];
		const wrappedNextAngle = index + 1 < targetAngles.length ? nextAngle : nextAngle + 360;
		const gap = wrappedNextAngle - currentAngle;
		if (gap > largestGap) {
			largestGap = gap;
			gapStartAngle = currentAngle;
			gapEndAngle = wrappedNextAngle;
		}
	}

	const requiredAngle = 360 - largestGap;
	const coveringStart = gapEndAngle;
	const directionDegrees = normalizeDirectionDegrees(coveringStart + requiredAngle / 2);

	return {
		directionDegrees,
		angle: requiredAngle,
		gapStartAngle,
		gapEndAngle,
	};
};

const getConeNote = ({ sourceToken, actionData, targets }) => {
	const shape = String(actionData?.selection?.zone?.shape ?? "circle");
	if (shape !== "cone") return "";

	const relevantTargets = getShapeRelevantTargets({ sourceToken, targets });
	if (relevantTargets.length < 2) return "";

	const maxAngle = Number(actionData?.selection?.zone?.range_secondary ?? 0);
	if (!(maxAngle > 0)) return "";

	const bestFit = getBestConeFit({ sourceToken, targets: relevantTargets });
	if (Number.isFinite(bestFit?.angle) && bestFit.angle > maxAngle) {
		return `Impossible : Cône trop large (${formatDistance(bestFit.angle)}deg > ${formatDistance(maxAngle)}deg) !`;
	}

	return "";
};

const getLineNote = ({ sourceToken, actionData, targets }) => {
	const shape = String(actionData?.selection?.zone?.shape ?? "circle");
	if (shape !== "line") return "";

	const relevantTargets = getShapeRelevantTargets({ sourceToken, targets });
	if (relevantTargets.length < 2) return "";

	const maxWidth = Number(actionData?.selection?.zone?.range_secondary ?? 0);
	if (!(maxWidth > 0)) return "";

	const bestFit = getBestLineFit({ sourceToken, targets: relevantTargets });
	if (!bestFit) {
		return "Impossible : Cibles trop écartées !";
	}

	if (Number.isFinite(bestFit?.width) && bestFit.width > maxWidth) {
		if (bestFit.width > maxWidth * 1.5 && bestFit.width > maxWidth + 2) {
			return "Impossible : Cibles trop écartées !";
		}

		return `Impossible : Ligne trop large (${formatDistance(bestFit.width)}m > ${formatDistance(maxWidth)}m) !`;
	}

	return "";
};

const getTargetStatus = (note) => {
	if (note.startsWith("Impossible")) return "impossible";
	if (note.startsWith("Désavantage")) return "disadvantage";
	return "ok";
};

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

const getActionMaxRange = (actionData) => {
	const zone = actionData?.selection?.zone ?? {};
	const range = Number(zone.range ?? 0);
	const hasLongRange = zone.has_long_range === true;
	const longRange = Number(zone.long_range ?? 0);
	if (hasLongRange && longRange > range) return longRange;
	return range;
};

const createPreviewContainer = () => {
	const container = new PIXI.Container();
	container.name = PREVIEW_LAYER_NAME;
	container.eventMode = "none";
	canvas.stage.addChild(container);
	return container;
};

const destroyPreviewContainer = (container) => {
	if (!container) return;
	container.removeChildren().forEach((child) => child.destroy?.());
	container.destroy({ children: true });
};

const drawTokenMarker = ({ graphics, token, color, thickness = 4, alpha = 1 }) => {
	const center = getTokenCenter(token);
	if (!center) return;
	const radius = Math.max(Number(token.w ?? 0), Number(token.h ?? 0), 24) * 0.4;
	graphics.lineStyle({ width: thickness, color, alpha });
	graphics.drawCircle(center.x, center.y, radius);
};

const drawTargetLinks = ({ graphics, sourceToken, targets }) => {
	const sourceCenter = getTokenCenter(sourceToken);
	if (!sourceCenter) return;

	for (const target of targets) {
		const targetCenter = getTokenCenter(target.token);
		if (!targetCenter) continue;

		graphics.lineStyle({
			color: TARGET_STATUS_COLORS[target.status],
			width: 2,
			alpha: 0.65,
		});
		graphics.moveTo(sourceCenter.x, sourceCenter.y);
		graphics.lineTo(targetCenter.x, targetCenter.y);
	}
};

const drawLinePreview = ({ graphics, sourceToken, actionData, lineFit, isInvalid }) => {
	if (!lineFit || !Number.isFinite(lineFit.angleDegrees)) return;
	const pixelsPerUnit = getScenePixelsPerUnit();
	if (!Number.isFinite(pixelsPerUnit)) return;

	const widthUnits = Number(actionData?.selection?.zone?.range_secondary ?? 0);
	const lengthUnits = getActionMaxRange(actionData);
	if (!(widthUnits > 0) || !(lengthUnits > 0)) return;

	const widthPixels = widthUnits * pixelsPerUnit;
	const lengthPixels = lengthUnits * pixelsPerUnit;
	const angleRadians = (lineFit.angleDegrees * Math.PI) / 180;
	const directionX = Math.cos(angleRadians);
	const directionY = Math.sin(angleRadians);
	const normalX = -directionY;
	const normalY = directionX;
	const start = sourceToken.center;
	const end = {
		x: start.x + directionX * lengthPixels,
		y: start.y + directionY * lengthPixels,
	};
	const halfWidth = widthPixels / 2;
	const points = [
		start.x + normalX * halfWidth,
		start.y + normalY * halfWidth,
		start.x - normalX * halfWidth,
		start.y - normalY * halfWidth,
		end.x - normalX * halfWidth,
		end.y - normalY * halfWidth,
		end.x + normalX * halfWidth,
		end.y + normalY * halfWidth,
	];
	const color = isInvalid ? TARGET_STATUS_COLORS.impossible : TARGET_STATUS_COLORS.ok;
	graphics.lineStyle({ color, width: 2.5, alpha: 0.75 });
	graphics.beginFill(color, 0.12);
	graphics.drawPolygon(points);
	graphics.endFill();
};

const drawConePreview = ({ graphics, sourceToken, actionData, coneFit, isInvalid }) => {
	if (!coneFit || !Number.isFinite(coneFit.directionDegrees)) return;
	const pixelsPerUnit = getScenePixelsPerUnit();
	if (!Number.isFinite(pixelsPerUnit)) return;

	const maxAngle = Number(actionData?.selection?.zone?.range_secondary ?? 0);
	const radiusUnits = getActionMaxRange(actionData);
	if (!(maxAngle > 0) || !(radiusUnits > 0)) return;

	const radiusPixels = radiusUnits * pixelsPerUnit;
	const halfAngleRadians = ((maxAngle / 2) * Math.PI) / 180;
	const directionRadians = (coneFit.directionDegrees * Math.PI) / 180;
	const startAngle = directionRadians - halfAngleRadians;
	const endAngle = directionRadians + halfAngleRadians;
	const color = isInvalid ? TARGET_STATUS_COLORS.impossible : TARGET_STATUS_COLORS.ok;
	const sourceCenter = getTokenCenter(sourceToken);
	if (!sourceCenter) return;
	graphics.lineStyle({ color, width: 2.5, alpha: 0.75 });
	graphics.beginFill(color, 0.12);
	graphics.moveTo(sourceCenter.x, sourceCenter.y);
	graphics.arc(sourceCenter.x, sourceCenter.y, radiusPixels, startAngle, endAngle);
	graphics.lineTo(sourceCenter.x, sourceCenter.y);
	graphics.endFill();
};

const createActionPreviewController = ({ actor, actionData }) => {
	let container = null;

	return {
		render() {
			this.cleanup();

			const sourceToken = getSourceToken(actor);
			const targetTokens = Array.from(game.user?.targets ?? []).filter(Boolean);
			if (!sourceToken || targetTokens.length === 0 || !canvas?.stage) return;

			container = createPreviewContainer();

			const targetStates = targetTokens.map((targetToken) => {
				const note = getDistanceNote({
					actor,
					actionData,
					distance: getTokenDistance(sourceToken, targetToken),
				});
				return {
					token: targetToken,
					note,
					status: getTargetStatus(note),
					markerStatus: getTargetOutcomeData({
						sourceToken,
						targetToken,
						actionData,
					}).markerStatus,
				};
			});

			const shapeRelevantTargets = getShapeRelevantTargets({
				sourceToken,
				targets: targetTokens,
			});
			const lineFit = getBestLineFit({
				sourceToken,
				targets: shapeRelevantTargets,
			});
			const coneFit = getBestConeFit({
				sourceToken,
				targets: shapeRelevantTargets,
			});
			const shape = String(actionData?.selection?.zone?.shape ?? "circle");
			const lineInvalid = Boolean(
				getLineNote({ sourceToken, actionData, targets: targetTokens }),
			);
			const coneInvalid = Boolean(
				getConeNote({ sourceToken, actionData, targets: targetTokens }),
			);

			if (shape === "line") {
				const shapeGraphics = new PIXI.Graphics();
				drawLinePreview({
					graphics: shapeGraphics,
					sourceToken,
					actionData,
					lineFit,
					isInvalid: lineInvalid,
				});
				container.addChild(shapeGraphics);
			}

			if (shape === "cone") {
				const shapeGraphics = new PIXI.Graphics();
				drawConePreview({
					graphics: shapeGraphics,
					sourceToken,
					actionData,
					coneFit,
					isInvalid: coneInvalid,
				});
				container.addChild(shapeGraphics);
			}

			const linkGraphics = new PIXI.Graphics();
			drawTargetLinks({ graphics: linkGraphics, sourceToken, targets: targetStates });
			container.addChild(linkGraphics);

			for (const targetState of targetStates) {
				const markerGraphics = new PIXI.Graphics();
				drawTokenMarker({
					graphics: markerGraphics,
					token: targetState.token,
					color: TARGET_STATUS_COLORS[targetState.markerStatus],
				});
				container.addChild(markerGraphics);
			}
		},
		cleanup() {
			destroyPreviewContainer(container);
			container = null;
		},
	};
};

const getDistanceNote = ({ actor, actionData, distance }) => {
	if (!Number.isFinite(distance)) return "";

	const rangeType = String(actionData?.range_type ?? "ranged");
	const zone = actionData?.selection?.zone ?? {};
	const reach = Number(actor?.system?.attributes?.reach?.value ?? 0);
	const range = Number(zone.range ?? 0);
	const minRange = Number(zone.min_range ?? 0);
	const hasLongRange = zone.has_long_range === true;
	const longRange = Number(zone.long_range ?? 0);
	const maxRange = hasLongRange ? longRange : range;

	if (rangeType === "melee") {
		if (reach > 0 && distance > reach) {
			return "Impossible : Trop loin !";
		}
		return "";
	}

	if (rangeType === "pure_ranged" && minRange > 0 && distance < minRange) {
		return "Impossible : Trop proche !";
	}

	if (maxRange > 0 && distance > maxRange) {
		return "Impossible : Trop loin !";
	}

	if (hasLongRange && longRange > range && distance > range) {
		return "Désavantage : Tir de loin";
	}

	if (rangeType === "ranged" && reach > 0 && distance <= reach) {
		return "Désavantage : Allonge";
	}

	return "";
};

const getSaveOutcomeStatus = ({ saveResult, actionData }) => {
	if (!saveResult) return null;
	if (saveResult.isSuccess) {
		return actionData?.jds?.fails_on_save === true ? "fail" : "warning";
	}
	return "success";
};

const getTargetOutcomeData = ({ sourceToken, targetToken, actionData }) => {
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

const buildTargetInfoHtml = ({ actor, actionData, rollContext, titleName }) => {
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
		const outcomeData = getTargetOutcomeData({ sourceToken, targetToken, actionData });
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
			markerStatus: outcomeData.markerStatus,
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

const waitForActionDialog = (
	dialogConfig,
	{ closeValue = null, onRender = null, onClose = null } = {},
) => {
	return new Promise((resolve) => {
		let settled = false;
		const settle = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		const dialog = new DialogV2({
			classes: ACTION_DIALOG_CLASSES,
			...dialogConfig,
			submit: (result) => {
				settle(result);
			},
		});

		if (onRender instanceof Function) {
			dialog.addEventListener("render", () => {
				onRender(dialog);
			});
		}

		dialog.addEventListener("close", () => {
			if (onClose instanceof Function) onClose(dialog);
			settle(closeValue);
		});

		dialog.render({ force: true });
	});
};

const getActionTitle = ({ actionData = {}, sourceItem = null, titleName = "" } = {}) => {
	const explicitTitle = String(titleName ?? "").trim();
	if (explicitTitle) return explicitTitle;

	const actionName = String(actionData?.name ?? "").trim();
	if (actionName) return actionName;

	const sourceName = String(sourceItem?.name ?? "").trim();
	if (sourceName) return sourceName;

	return "Action";
};

const renderActionDialogContent = async ({
	actor,
	actionData,
	sourceItem,
	rollContext,
	titleName,
}) => {
	if (!(sourceItem instanceof Item)) {
		return `<p>${foundry.utils.escapeHTML(titleName)}</p>`;
	}

	const targetInfoHtml = buildTargetInfoHtml({ actor, actionData, rollContext, titleName });

	const embeddedAction = buildEmbeddedActionRow({
		item: sourceItem,
		actionData,
		index: 0,
		config: CONFIG.nalfa,
	});

	const actionHtml = await foundry.applications.handlebars.renderTemplate(
		"systems/nalfa/templates/partials/item/integrated-action.hbs",
		{
			embeddedAction,
			item: sourceItem,
			itemImage: sourceItem.img,
			rollTargetInfoHtml: "",
			showIcon: true,
			enableDrag: false,
			readonly: true,
			rollable: false,
			isEditable: false,
		},
	);

	return `${actionHtml}<section class="panel-section nalfa-action-dialog__targets"><div class="nalfa-action-dialog__targets-content">${targetInfoHtml}</div></section>`;
};

const createActionDialogLiveController = ({
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
					if (!currentSourceTokenUuid || currentSourceTokenUuid !== sourceTokenUuid) return;
					refresh(dialog);
				}),
			);
		},
		cleanup() {
			for (const hookId of targetHookIds) Hooks.off("targetToken", hookId);
			for (const hookId of controlHookIds) Hooks.off("controlToken", hookId);
			for (const hookId of stateHookIds) Hooks.off("nalfaActionRollStateUpdated", hookId);
			targetHookIds.length = 0;
			controlHookIds.length = 0;
			stateHookIds.length = 0;
			previewController.cleanup();
		},
	};
};

const buildActionChatContext = ({
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

const getActionDamageEntries = (damageFormulas = []) => {
	return damageFormulas
		.map((entry) => ({
			formula: String(entry?.formula ?? "").trim(),
			statKey: String(entry?.stat ?? "none").trim() || "none",
			damageType: String(entry?.type ?? "none").trim() || "none",
			effect: String(entry?.effect ?? "damage").trim() || "damage",
		}))
		.filter((entry) => entry.formula || entry.statKey !== "none");
};

const getActionSavedDamageMode = (actionData) => {
	return String(actionData?.jdd_saved?.mode ?? "same");
};

const getSavedDamageEntries = (actionData) => {
	return getActionDamageEntries(actionData?.jdd_saved?.damage_formulas ?? []);
};

const buildDamageSummaryRows = ({ targets = [], damageResults = [], mode = "normal" }) => {
	return targets.map((targetToken) => {
		const summary = summarizeAppliedDamageForToken(targetToken, damageResults, { mode });
		return {
			targetToken,
			targetName: summary.targetName,
			targetActorUuid: summary.targetActorUuid,
			previousHp: summary.previousHp,
			nextHp: summary.nextHp,
			previousTempHp: summary.previousTempHp,
			nextTempHp: summary.nextTempHp,
			hpDelta: summary.hpDelta,
			tempHpDelta: summary.tempHpDelta,
			finalTempHp: summary.finalTempHp,
			summaryParts: summary.summaryParts,
			isKo: summary.isKo,
			isDead: summary.isDead,
			detailLines: summary.detailLines,
		};
	});
};

const applyDamageSummaryRowsToTargets = async (rows = []) => {
	for (const row of rows) {
		const actor = row?.targetToken?.actor;
		if (!actor?.update) continue;

		const hpDelta = Number(row?.hpDelta ?? 0);
		const tempHpDelta = Number(row?.tempHpDelta ?? 0);
		if (!hpDelta && !tempHpDelta) continue;

		const currentHp = Number(actor.system?.attributes?.hp?.value ?? 0);
		const currentMaxHp = Number(actor.system?.attributes?.hp?.max ?? NaN);
		let nextHp = currentHp + hpDelta;
		const nextTempHp = Math.max(0, Number(row?.finalTempHp ?? actor.system?.attributes?.hp?.abso ?? 0));

		if (Number.isFinite(currentMaxHp)) nextHp = Math.min(nextHp, currentMaxHp);

		await actor.update({
			"system.attributes.hp.value": nextHp,
			"system.attributes.hp.abso": nextTempHp,
		});
	}
};

const combineDamageResults = (baseResults = [], critResults = []) => {
	const combined = [];
	const normalizedBaseResults = Array.isArray(baseResults) ? baseResults : [];
	const normalizedCritResults = Array.isArray(critResults) ? critResults : [];
	const length = Math.max(normalizedBaseResults.length, normalizedCritResults.length);

	for (let index = 0; index < length; index += 1) {
		const baseResult = normalizedBaseResults[index];
		const critResult = normalizedCritResults[index];
		if (baseResult) combined.push(baseResult);
		if (critResult) combined.push(critResult);
	}

	return combined;
};

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

const resetActionOutcomeState = async ({ sourceToken, rollContext, targets = [] }) => {
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

const getApplicableDamageTargets = async ({
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

const executeActionAttackRoll = async ({
	actor,
	actionData,
	titleName,
	chatContext,
	rollContext,
}) => {
	const targets = getCurrentTargetTokens();
	if (!targets.length) {
		return rollAttackFromAction(actor, actionData, { titleName, chatContext });
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

const executeActionSavePromptRoll = async ({
	actor,
	actionData,
	titleName,
	chatContext,
	rollContext,
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
		return rollSavePromptFromAction(actor, actionData, { titleName, chatContext });
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
		targets: applicableTargets,
		sourceTokenUuid: String(sourceToken?.document?.uuid ?? sourceToken?.uuid ?? "").trim(),
		sourceTokenName: String(sourceToken?.name ?? actor.name ?? "").trim(),
		sourceTokenDocument: sourceToken?.document ?? null,
		rollContext,
	});
};

const executeActionDamageRoll = async ({
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
			baseResults = await rollDamageEntries(actor, baseDamageEntries);
		}

		if (hasSaveResults && savedDamageMode === "other" && savedTargets.length) {
			const savedDamageEntries = getSavedDamageEntries(actionData);
			savedResults = await rollDamageEntries(actor, savedDamageEntries);
		}

		if (hasCritDamageTargets) {
			console.log("nalfa | Crit damage debug | rolling crit bonus", {
				baseDamageEntries,
			});
			critResults = await rollDamageEntries(actor, baseDamageEntries, {
				includeStat: false,
				diceOnly: true,
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

const buildActionRollChoices = ({
	actor,
	actionData,
	titleName,
	chatContext,
	rollContext,
}) => {
	const choices = [];

	if (actionData?.jdt?.enabled) {
		choices.push({
			id: "attack",
			label: "JdT",
			run: () =>
				executeActionAttackRoll({
					actor,
					actionData,
					titleName,
					chatContext,
					rollContext,
				}),
		});
	}

	if (actionData?.jds?.enabled) {
		choices.push({
			id: "save",
			label: "JdS",
			run: () =>
				executeActionSavePromptRoll({
					actor,
					actionData,
					titleName,
					chatContext,
					rollContext,
				}),
		});
	}

	if (actionData?.jdd?.enabled) {
		choices.push({
			id: "damage",
			label: "JdD",
			run: () =>
				executeActionDamageRoll({
					actor,
					actionData,
					titleName,
					chatContext,
					rollContext,
				}),
		});
	}

	return choices;
};

const getConcentrationInputValue = (dialog, fallback = 0) => {
	const input = dialog.element?.querySelector("[name='enemy-attack-bonus']");
	return Number(input?.value ?? fallback ?? 0);
};

const renderConcentrationDialogContent = (defaultValue = 0) => {
	return `<div class="field field--column"><label class="field__label" for="nalfa-concentration-malus">Malus</label><input id="nalfa-concentration-malus" name="enemy-attack-bonus" type="number" value="${Number(defaultValue ?? 0)}" data-dtype="Number" /></div>`;
};

export const executeActionConcentrationPrompt = async ({
	actor,
	actionData,
	sourceItem = null,
	titleName = "",
	actionIndex = -1,
} = {}) => {
	if (!actor) {
		ui.notifications.warn("Aucun acteur sélectionné.");
		return null;
	}

	if (!actionData?.concentration?.enabled) {
		ui.notifications.warn("Cette action n'a pas de JdF.");
		return null;
	}

	const resolvedTitle = getActionTitle({ actionData, sourceItem, titleName });
	const chatContext = buildActionChatContext({
		sourceItem,
		titleName: resolvedTitle,
		actionIndex,
	});
	const defaultMalus = Number(actionData?.concentration?.enemy_attack_bonus ?? 0);
	const malus = await waitForActionDialog(
		{
			window: {
				title: `JdF - ${resolvedTitle}`,
			},
			content: renderConcentrationDialogContent(defaultMalus),
			buttons: [
				{
					action: "roll",
					label: "JdF",
					default: true,
					callback: (event, target, dialog) => {
						void event;
						void target;
						return getConcentrationInputValue(dialog, defaultMalus);
					},
				},
				{
					action: "cancel",
					label: "Annuler",
					callback: () => null,
				},
			],
		},
		{
			closeValue: null,
			onRender: (dialog) => {
				const input = dialog.element?.querySelector("#nalfa-concentration-malus");
				if (input instanceof HTMLElement) input.focus();
			},
		},
	);

	if (malus === null) return null;
	return rollConcentrationFromAction(actor, actionData, {
		titleName: resolvedTitle,
		chatContext,
		enemyAttackBonus: malus,
	});
};

export const executeActionPrompt = async ({
	actor,
	actionData,
	sourceItem = null,
	titleName = "",
	actionIndex = -1,
} = {}) => {
	if (!actor) {
		ui.notifications.warn("Aucun acteur sélectionné.");
		return null;
	}

	if (!actionData) {
		ui.notifications.warn("Action introuvable.");
		return null;
	}

	const resolvedTitle = getActionTitle({ actionData, sourceItem, titleName });
	const sourceToken = getSourceToken(actor);
	const chatContext = buildActionChatContext({
		sourceItem,
		titleName: resolvedTitle,
		actionIndex,
	});
	const rollContext = createActionRollContext({ chatContext, sourceToken });
	const choices = buildActionRollChoices({
		actor,
		actionData,
		titleName: resolvedTitle,
		chatContext,
		rollContext,
	});

	if (!choices.length) {
		ui.notifications.warn("Cette action n'a aucun jet activé.");
		return null;
	}

	if (choices.length === 1) {
		return choices[0].run();
	}

	const content = await renderActionDialogContent({
		actor,
		actionData,
		sourceItem,
		rollContext,
		titleName: resolvedTitle,
	});
	const previewController = createActionPreviewController({ actor, actionData });
	const liveController = createActionDialogLiveController({
		actor,
		actionData,
		previewController,
		rollContext,
		titleName: resolvedTitle,
	});

	const selectedChoice = await waitForActionDialog(
		{
			window: {
				title: `Action - ${resolvedTitle}`,
			},
			content,
			buttons: choices.map((choice, index) => {
				return {
					action: choice.id,
					label: choice.label,
					default: index === 0,
					callback: () => choice,
				};
			}),
		},
		{
			closeValue: null,
			onRender: (dialog) => liveController.activate(dialog),
			onClose: () => liveController.cleanup(),
		},
	);

	if (!selectedChoice) return null;
	return selectedChoice.run();
};
