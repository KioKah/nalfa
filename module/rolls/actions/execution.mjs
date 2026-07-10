import { rollConcentrationFromAction } from "../index.mjs";
import { createActionRollContext } from "./context.mjs";
import {
	createActionDialogLiveController,
	createActionPreviewController,
	renderActionDialogContent,
	waitForActionDialog,
} from "./dialog/index.mjs";
import { executeActionDamageRoll } from "./damage/index.mjs";
import {
	buildActionChatContext,
	getActionTitle,
	getSourceToken,
} from "./internal/shared.mjs";
import {
	executeActionAttackRoll,
	executeActionSavePromptRoll,
} from "./targeting/index.mjs";

const getConcentrationInputValue = (dialog, fallback = 0) => {
	const input = dialog.element?.querySelector("[name='enemy-attack-bonus']");
	return Number(input?.value ?? fallback ?? 0);
};

const renderConcentrationDialogContent = (defaultValue = 0) => {
	return `<div class="field field--column"><label class="field__label" for="nalfa-concentration-malus">Malus</label><input id="nalfa-concentration-malus" name="enemy-attack-bonus" type="number" value="${Number(defaultValue ?? 0)}" data-dtype="Number" /></div>`;
};

const toCostAmount = (value) => {
	const amount = Number(value ?? 0);
	return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const hasNalfaOverload = (actionData) => {
	const overload = actionData?.cost?.nalfa?.overload ?? {};
	if (overload.enabled !== true) return false;
	return toCostAmount(overload.amount) > 0 || String(overload.effect ?? "").trim().length > 0;
};

const getNalfaCost = (actionData, { useOverload = false } = {}) => {
	const baseAmount = toCostAmount(actionData?.cost?.nalfa?.amount);
	const overload = actionData?.cost?.nalfa?.overload ?? {};
	const overloadAmount =
		useOverload && overload.enabled === true ? toCostAmount(overload.amount) : 0;
	return baseAmount + overloadAmount;
};

const consumeNalfaCost = async ({ actor, actionData, useOverload = false } = {}) => {
	const requiredNalfa = getNalfaCost(actionData, { useOverload });
	if (!(requiredNalfa > 0)) return true;

	const availableNalfa = Number(actor?.system?.nalfa?.value ?? 0);
	if (!Number.isFinite(availableNalfa) || availableNalfa < requiredNalfa) {
		ui.notifications.warn(
			`Nalfa insuffisant : ${Number.isFinite(availableNalfa) ? availableNalfa : 0}/${requiredNalfa}.`,
		);
		return false;
	}

	await actor.update({ "system.nalfa.value": availableNalfa - requiredNalfa });
	return true;
};

const getUseOverloadValue = (dialog) => {
	const input = dialog.element?.querySelector("[name='use-nalfa-overload']");
	return input instanceof HTMLInputElement ? input.checked : false;
};

const renderNalfaOverloadContent = (actionData) => {
	if (!hasNalfaOverload(actionData)) return "";

	const overload = actionData?.cost?.nalfa?.overload ?? {};
	const amount = toCostAmount(overload.amount);
	const effect = String(overload.effect ?? "").trim();
	const effectHtml = effect
		? `<p class="hint">${foundry.utils.escapeHTML(effect)}</p>`
		: "";
	return [
		'<section class="panel-section nalfa-action-dialog__nalfa-overload">',
		'<label class="field field--inline">',
		'<input type="checkbox" name="use-nalfa-overload" />',
		`<span>Surcharge Nalfa${amount > 0 ? ` (+${amount})` : ""}</span>`,
		"</label>",
		effectHtml,
		"</section>",
	].join("");
};

const renderActionExecutionContent = async ({
	actor,
	actionData,
	sourceItem,
	rollContext,
	titleName,
}) => {
	const actionHtml = await renderActionDialogContent({
		actor,
		actionData,
		sourceItem,
		rollContext,
		titleName,
	});
	return `${actionHtml}${renderNalfaOverloadContent(actionData)}`;
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

	const overloadAvailable = hasNalfaOverload(actionData);
	if (choices.length === 1 && !overloadAvailable) {
		const canPayNalfa = await consumeNalfaCost({ actor, actionData });
		if (!canPayNalfa) return null;
		return choices[0].run();
	}

	const content = await renderActionExecutionContent({
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

	const selectedExecution = await waitForActionDialog(
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
					callback: (event, target, dialog) => {
						void event;
						void target;
						return {
							choice,
							useOverload: getUseOverloadValue(dialog),
						};
					},
				};
			}),
		},
		{
			closeValue: null,
			onRender: (dialog) => liveController.activate(dialog),
			onClose: () => liveController.cleanup(),
		},
	);

	const selectedChoice = selectedExecution?.choice;
	if (!selectedChoice) return null;

	const canPayNalfa = await consumeNalfaCost({
		actor,
		actionData,
		useOverload: selectedExecution.useOverload === true,
	});
	if (!canPayNalfa) return null;

	return selectedChoice.run();
};
