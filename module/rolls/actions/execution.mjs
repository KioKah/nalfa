import {
	rollAttackFromAction,
	rollConcentrationFromAction,
	rollDamageSetFromAction,
	rollSavePromptFromAction,
} from "../index.mjs";
import { buildEmbeddedActionRow } from "../../sheets/item/context/actions.mjs";

const { DialogV2 } = foundry.applications.api;

const ACTION_DIALOG_CLASSES = ["nalfa", "sheet", "nalfa-action-dialog"];

const waitForActionDialog = (dialogConfig, { closeValue = null } = {}) => {
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

		dialog.addEventListener("close", () => {
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

const renderActionDialogContent = async ({ actionData, sourceItem, titleName }) => {
	if (!(sourceItem instanceof Item)) {
		return `<p>${foundry.utils.escapeHTML(titleName)}</p>`;
	}

	const embeddedAction = buildEmbeddedActionRow({
		item: sourceItem,
		actionData,
		index: 0,
		config: CONFIG.nalfa,
	});

	return renderTemplate("systems/nalfa/templates/partials/item/integrated-action.hbs", {
		embeddedAction,
		item: sourceItem,
		itemImage: sourceItem.img,
		showIcon: true,
		enableDrag: false,
		readonly: true,
		rollable: false,
		isEditable: false,
	});
};

const buildActionChatContext = ({ sourceItem = null, titleName = "", actionIndex = -1 }) => {
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

const buildActionRollChoices = ({ actor, actionData, titleName, chatContext }) => {
	const choices = [];

	if (actionData?.jdt?.enabled) {
		choices.push({
			id: "attack",
			label: "JdT",
			run: () => rollAttackFromAction(actor, actionData, { titleName, chatContext }),
		});
	}

	if (actionData?.jdd?.enabled) {
		choices.push({
			id: "damage",
			label: "JdD",
			run: () => rollDamageSetFromAction(actor, actionData, { titleName, chatContext }),
		});
	}

	if (actionData?.jds?.enabled) {
		choices.push({
			id: "save",
			label: "JdS",
			run: () => rollSavePromptFromAction(actor, actionData, { titleName, chatContext }),
		});
	}

	if (actionData?.concentration?.enabled) {
		choices.push({
			id: "concentration",
			label: "JdF",
			run: () =>
				rollConcentrationFromAction(actor, actionData, {
					titleName,
					chatContext,
				}),
		});
	}

	return choices;
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
	const chatContext = buildActionChatContext({
		sourceItem,
		titleName: resolvedTitle,
		actionIndex,
	});
	const choices = buildActionRollChoices({
		actor,
		actionData,
		titleName: resolvedTitle,
		chatContext,
	});

	if (!choices.length) {
		ui.notifications.warn("Cette action n'a aucun jet activé.");
		return null;
	}

	if (choices.length === 1) {
		return choices[0].run();
	}

	const content = await renderActionDialogContent({
		actionData,
		sourceItem,
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
		{ closeValue: null },
	);

	if (!selectedChoice) return null;
	return selectedChoice.run();
};
