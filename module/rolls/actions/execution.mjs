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
