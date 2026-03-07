import {
	rollAttackFromAction,
	rollConcentrationFromAction,
	rollDamageSetFromAction,
	rollSavePromptFromAction,
} from "./rolls.mjs";

const getActionTitle = ({ actionData = {}, sourceItem = null, titleName = "" } = {}) => {
	const explicitTitle = String(titleName ?? "").trim();
	if (explicitTitle) return explicitTitle;

	const actionName = String(actionData?.name ?? "").trim();
	if (actionName) return actionName;

	const sourceName = String(sourceItem?.name ?? "").trim();
	if (sourceName) return sourceName;

	return "Action";
};

const buildActionRollChoices = ({ actor, actionData, titleName }) => {
	const choices = [];

	if (actionData?.jdt?.enabled) {
		choices.push({
			id: "attack",
			label: "JdT",
			run: () => rollAttackFromAction(actor, actionData, { titleName }),
		});
	}

	if (actionData?.jdd?.enabled) {
		choices.push({
			id: "damage",
			label: "JdD",
			run: () => rollDamageSetFromAction(actor, actionData, { titleName }),
		});
	}

	if (actionData?.jds?.enabled) {
		choices.push({
			id: "save",
			label: "JdS",
			run: () => rollSavePromptFromAction(actor, actionData, { titleName }),
		});
	}

	if (actionData?.concentration?.enabled) {
		choices.push({
			id: "concentration",
			label: "JdF",
			run: () => rollConcentrationFromAction(actor, actionData, { titleName }),
		});
	}

	return choices;
};

export const executeActionPrompt = async ({
	actor,
	actionData,
	sourceItem = null,
	titleName = "",
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
	const choices = buildActionRollChoices({
		actor,
		actionData,
		titleName: resolvedTitle,
	});

	if (!choices.length) {
		ui.notifications.warn("Cette action n'a aucun jet activé.");
		return null;
	}

	if (choices.length === 1) {
		return choices[0].run();
	}

	return new Promise((resolve) => {
		const buttons = {};

		for (const choice of choices) {
			buttons[choice.id] = {
				label: choice.label,
				callback: () => {
					void choice.run().then((result) => resolve(result));
				},
			};
		}

		new Dialog({
			title: `Action - ${resolvedTitle}`,
			content: `<p>Quel jet veux-tu lancer ?</p>`,
			buttons,
			default: choices[0].id,
			close: () => resolve(null),
		}).render(true);
	});
};
