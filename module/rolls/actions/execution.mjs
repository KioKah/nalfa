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
import { getActorStateProfile } from "../../rules/states.mjs";
import { consumeActionResources, startConcentration } from "../../actions/turnResources.mjs";
import { withActionSheetFlag } from "../core/shared.mjs";

const toCostAmount = (value) => {
	const amount = Number(value ?? 0);
	return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const hasNalfaOverload = (actionData) => {
	const overload = actionData?.cost?.nalfa?.overload ?? {};
	if (overload.enabled !== true) return false;
	return toCostAmount(overload.amount) > 0 || String(overload.effect ?? "").trim().length > 0;
};

const requiresReactionCost = (actionData) => {
	const options = Array.isArray(actionData?.cost?.actions?.options)
		? actionData.cost.actions.options
		: [];
	return (
		options.length > 0 &&
		options.every((option) => Number(option?.reaction ?? 0) > 0)
	);
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

const postActionExecutionCard = async ({
	actor,
	titleName,
	receipt,
	concentrationReplaced = "",
	chatContext,
} = {}) => {
	const actionLabels = {
		main: "Action principale",
		secondary: "Action secondaire",
		reaction: "Reaction",
		interaction: "Interaction simple",
	};
	const costs = Object.entries(receipt?.option ?? {})
		.filter(([key, value]) => actionLabels[key] && Number(value) > 0)
		.map(([key, value]) => ({ label: `${actionLabels[key]} x${value}` }));
	if (Number(receipt?.movement) > 0) costs.push({ label: `Deplacement ${receipt.movement} m` });
	if (Number(receipt?.nalfa) > 0) costs.push({ label: `Nalfa ${receipt.nalfa}` });
	if (receipt?.uses) costs.push({ label: "1 utilisation" });
	if (Number(receipt?.cooldown) > 0 && receipt.cooldownUnit !== "none") {
		costs.push({ label: `Recharge ${receipt.cooldown} ${receipt.cooldownUnit}` });
	}
	const concentrationName = concentrationReplaced === null ? "" : titleName;
	const content = await foundry.applications.handlebars.renderTemplate(
		"systems/nalfa/templates/chat/roll/action-execution.hbs",
		{ titleName, costs, concentrationName, concentrationReplaced },
	);
	return ChatMessage.create({
		user: game.user.id,
		speaker: ChatMessage.getSpeaker({ actor }),
		content,
		...withActionSheetFlag({}, chatContext),
	});
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
			run: ({ promptAdjustments: runPromptAdjustments = false } = {}) =>
				executeActionAttackRoll({
					actor,
					actionData,
					titleName,
					chatContext,
					rollContext,
					promptAdjustments: runPromptAdjustments,
				}),
		});
	}

	if (actionData?.jds?.enabled) {
		choices.push({
			id: "save",
			label: "JdS",
			run: ({ promptAdjustments: runPromptAdjustments = false } = {}) =>
				executeActionSavePromptRoll({
					actor,
					actionData,
					titleName,
					chatContext,
					rollContext,
					promptAdjustments: runPromptAdjustments,
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
	const stateProfile = getActorStateProfile(actor);
	if (stateProfile.blocksTurn) {
		ui.notifications.warn("Un état empêche ce personnage d'agir ce tour.");
		return null;
	}
	if (stateProfile.blocksAction) {
		ui.notifications.warn("Un état empêche ce personnage d'agir.");
		return null;
	}
	if (stateProfile.blocksConcentration) {
		ui.notifications.warn("Un état empêche ce personnage de se concentrer.");
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
	return rollConcentrationFromAction(actor, actionData, {
		titleName: resolvedTitle,
		chatContext,
		promptAdjustments: false,
	});
};

export const executeActionPrompt = async ({
	actor,
	actionData,
	sourceItem = null,
	titleName = "",
	actionIndex = -1,
	forcePrompt = false,
	actionAvailabilityWarning = "",
} = {}) => {
	if (!actor) {
		ui.notifications.warn("Aucun acteur sélectionné.");
		return null;
	}
	const stateProfile = getActorStateProfile(actor);
	if (stateProfile.blocksTurn) {
		ui.notifications.warn("Un état empêche ce personnage d'agir ce tour.");
		return null;
	}
	if (stateProfile.blocksAction) {
		ui.notifications.warn("Un état empêche ce personnage d'agir.");
		return null;
	}
	if (stateProfile.blocksReaction && requiresReactionCost(actionData)) {
		ui.notifications.warn("Un état empêche ce personnage de réagir.");
		return null;
	}
	if (stateProfile.blocksAttack && actionData?.jdt?.enabled) {
		ui.notifications.warn("Un état empêche ce personnage d'attaquer.");
		return null;
	}
	if (
		stateProfile.blocksMovement &&
		String(actionData?.cost?.movement?.mode ?? "none") !== "none"
	) {
		ui.notifications.warn("Un état empêche ce personnage de se déplacer.");
		return null;
	}
	if (stateProfile.blocksConcentration && actionData?.concentration?.enabled) {
		ui.notifications.warn("Un état empêche ce personnage de se concentrer.");
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
	if (
		choices.length === 1 &&
		!overloadAvailable &&
		!forcePrompt &&
		!String(actionAvailabilityWarning ?? "").trim()
	) {
		const receipt = await consumeActionResources({
			actor,
			actionData,
			sourceItem,
			actionIndex,
		});
		if (!receipt) return null;
		const concentrationReplaced = actionData?.concentration?.enabled
			? await startConcentration({ actor, actionData, sourceItem, actionIndex, titleName: resolvedTitle })
			: null;
		await postActionExecutionCard({
			actor,
			titleName: resolvedTitle,
			receipt,
			concentrationReplaced,
			chatContext,
		});
		return choices[0].run();
	}

	const content = await renderActionExecutionContent({
		actor,
		actionData,
		sourceItem,
		rollContext,
		titleName: resolvedTitle,
		actionAvailabilityWarning,
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
						void target;
						return {
							choice,
							useOverload: getUseOverloadValue(dialog),
							promptAdjustments: event.altKey,
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

	const receipt = await consumeActionResources({
		actor,
		actionData,
		sourceItem,
		actionIndex,
		useOverload: selectedExecution.useOverload === true,
	});
	if (!receipt) return null;
	const concentrationReplaced = actionData?.concentration?.enabled
		? await startConcentration({ actor, actionData, sourceItem, actionIndex, titleName: resolvedTitle })
		: null;
	await postActionExecutionCard({
		actor,
		titleName: resolvedTitle,
		receipt,
		concentrationReplaced,
		chatContext,
	});

	return selectedChoice.run({
		promptAdjustments: selectedExecution.promptAdjustments,
	});
};
