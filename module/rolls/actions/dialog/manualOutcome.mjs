import { applyManualTargetOutcome } from "../context.mjs";
import { waitForActionDialog, ACTION_DIALOG_CLASSES } from "./core.mjs";
import { getTargetOutcomeData } from "../targeting/state.mjs";
import {
	escapeAttribute,
	getGMWhisperIds,
	getSourceToken,
	getTargetDefense,
	getTokenDisplayName,
} from "../internal/shared.mjs";

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

export const promptManualTargetOutcomeEdit = async ({
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
		requesterName:
			String(game.user?.name ?? actor?.name ?? "Joueur").trim() || "Joueur",
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
