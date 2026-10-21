import { getActorStateProfile } from "../rules/states.mjs";

const ACTION_RESOURCE_KEYS = ["main", "secondary", "reaction", "interaction"];
const actorQueues = new WeakMap();

const withActorLock = (actor, operation) => {
	const previous = actorQueues.get(actor) ?? Promise.resolve();
	const next = previous.catch(() => undefined).then(operation);
	actorQueues.set(actor, next);
	return next.finally(() => {
		if (actorQueues.get(actor) === next) actorQueues.delete(actor);
	});
};

const toAmount = (value) => {
	const amount = Number(value ?? 0);
	return Number.isFinite(amount) ? Math.max(0, amount) : 0;
};

const getActionOptions = (actionData) => {
	const options = actionData?.cost?.actions?.options;
	return Array.isArray(options) && options.length ? options : [{}];
};

const getMovementCost = (actionData) => {
	const movement = actionData?.cost?.movement ?? {};
	return movement.mode === "fixed" ? toAmount(movement.amount) : 0;
};

const getActionSourceUpdate = ({ sourceItem, actionIndex, mutate } = {}) => {
	if (!(sourceItem instanceof Item) || !sourceItem.isOwner) return null;
	if (sourceItem.type === "Action") {
		const actionData = foundry.utils.deepClone(sourceItem.system);
		mutate(actionData);
		return sourceItem.update({ system: actionData });
	}

	if (!Number.isInteger(actionIndex) || actionIndex < 0) return null;
	const actions = foundry.utils.deepClone(sourceItem.system?.actions ?? []);
	if (!actions[actionIndex]) return null;
	mutate(actions[actionIndex]);
	return sourceItem.update({ "system.actions": actions });
};

const actionTracksOwnState = (actionData) => {
	const uses = actionData?.cost?.uses ?? {};
	const cooldown = actionData?.cost?.cooldown ?? {};
	return toAmount(uses.max) > 0 || (toAmount(cooldown.amount) > 0 && cooldown.unit !== "none");
};

const canUpdateActionSource = ({ sourceItem, actionIndex } = {}) => {
	if (!(sourceItem instanceof Item) || !sourceItem.isOwner) return false;
	return sourceItem.type === "Action" || (Number.isInteger(actionIndex) && actionIndex >= 0);
};

export const getActionCooldownRemaining = (actionData = {}) =>
	toAmount(actionData?.cost?.cooldown?.remaining);

export const getActionResourceAvailability = (
	actor,
	actionData = {},
	{ useOverload = false } = {},
) => {
	const resources = actor?.system?.actions ?? {};
	const movementCost = getMovementCost(actionData);
	const overload = actionData?.cost?.nalfa?.overload ?? {};
	const nalfaCost =
		toAmount(actionData?.cost?.nalfa?.amount) +
		(useOverload && overload.enabled === true ? toAmount(overload.amount) : 0);
	const uses = actionData?.cost?.uses ?? {};
	const reasons = [];
	const stateProfile = getActorStateProfile(actor);
	if (stateProfile.blocksTurn) reasons.push("Un état empêche d'agir ce tour.");
	const option = getActionOptions(actionData).find((candidate) =>
		(!stateProfile.blocksReaction || toAmount(candidate?.reaction) === 0) &&
		ACTION_RESOURCE_KEYS.every(
			(key) => toAmount(candidate?.[key]) <= toAmount(resources?.[key]?.value),
		),
	);
	if (!option) reasons.push("Actions du tour insuffisantes.");
	if (movementCost > toAmount(resources?.movement?.value)) {
		reasons.push("Déplacement insuffisant.");
	}
	if (nalfaCost > toAmount(actor?.system?.nalfa?.value)) reasons.push("Nalfa insuffisant.");
	if (toAmount(uses.max) > 0 && toAmount(uses.value) < 1) {
		reasons.push("Aucune utilisation restante.");
	}
	if (getActionCooldownRemaining(actionData) > 0) reasons.push("Action en recharge.");
	return { available: reasons.length === 0, reason: reasons.join(" "), option };
};

export const consumeActionResources = async ({
	actor,
	actionData,
	sourceItem = null,
	actionIndex = -1,
	useOverload = false,
} = {}) => {
	if (!(actor instanceof Actor)) return false;
	return withActorLock(actor, async () => {
	const stateProfile = getActorStateProfile(actor);
	if (stateProfile.blocksTurn) {
		ui.notifications.warn("Un état empêche ce personnage d'agir ce tour.");
		return false;
	}
	if (stateProfile.blocksAction) {
		ui.notifications.warn("Un état empêche ce personnage d'agir.");
		return false;
	}
	if (stateProfile.blocksAttack && actionData?.jdt?.enabled) {
		ui.notifications.warn("Un état empêche ce personnage d'attaquer.");
		return false;
	}
	if (stateProfile.blocksMovement && getMovementCost(actionData) > 0) {
		ui.notifications.warn("Un état empêche ce personnage de se déplacer.");
		return false;
	}
	if (stateProfile.blocksConcentration && actionData?.concentration?.enabled) {
		ui.notifications.warn("Un état empêche ce personnage de se concentrer.");
		return false;
	}
	const availability = getActionResourceAvailability(actor, actionData, { useOverload });
	if (!availability.available) {
		ui.notifications.warn(availability.reason);
		return false;
	}
	if (stateProfile.blocksReaction && toAmount(availability.option?.reaction) > 0) {
		ui.notifications.warn("Un état empêche ce personnage de réagir.");
		return false;
	}
	if (actionTracksOwnState(actionData) && !canUpdateActionSource({ sourceItem, actionIndex })) {
		ui.notifications.warn("L'action doit etre possedee pour consommer ses utilisations.");
		return false;
	}

	const resources = actor.system?.actions ?? {};
	const updates = {};
	for (const key of ACTION_RESOURCE_KEYS) {
		const cost = toAmount(availability.option?.[key]);
		if (cost) updates[`system.actions.${key}.value`] = toAmount(resources?.[key]?.value) - cost;
	}
	const movementCost = getMovementCost(actionData);
	if (movementCost) {
		updates["system.actions.movement.value"] = toAmount(resources?.movement?.value) - movementCost;
	}
	const overload = actionData?.cost?.nalfa?.overload ?? {};
	const nalfaCost =
		toAmount(actionData?.cost?.nalfa?.amount) +
		(useOverload && overload.enabled === true ? toAmount(overload.amount) : 0);
	if (nalfaCost) updates["system.nalfa.value"] = toAmount(actor.system?.nalfa?.value) - nalfaCost;

	const previousValues = Object.fromEntries(
		Object.keys(updates).map((path) => [path, foundry.utils.getProperty(actor, path)]),
	);
	await actor.update(updates);
	try {
		const sourceUpdate = getActionSourceUpdate({
			sourceItem,
			actionIndex,
			mutate: (sourceAction) => {
				const uses = sourceAction.cost?.uses ?? {};
				if (toAmount(uses.max) > 0) uses.value = Math.max(0, toAmount(uses.value) - 1);
				const cooldown = sourceAction.cost?.cooldown ?? {};
				if (toAmount(cooldown.amount) > 0 && cooldown.unit !== "none") {
					cooldown.remaining = toAmount(cooldown.amount);
				}
			},
		});
		if (sourceUpdate) await sourceUpdate;
	} catch (error) {
		await actor.update(previousValues);
		console.error("nalfa | Action resource rollback", error);
		ui.notifications.error("La consommation de l'action a échoué.");
		return false;
	}
	return {
		option: availability.option,
		movement: movementCost,
		nalfa: nalfaCost,
		uses: toAmount(actionData?.cost?.uses?.max) > 0,
		cooldown: toAmount(actionData?.cost?.cooldown?.amount),
		cooldownUnit: String(actionData?.cost?.cooldown?.unit ?? "none"),
	};
	});
};

export const startConcentration = async ({ actor, actionData, sourceItem, actionIndex, titleName }) => {
	if (!(actor instanceof Actor) || actionData?.concentration?.enabled !== true) return;
	const previousName = String(actor.system?.actions?.concentration?.active?.name ?? "").trim();
	await actor.update({
		"system.actions.concentration.active": {
			name: String(titleName ?? actionData.name ?? "Action").trim() || "Action",
			stat: String(actionData.concentration.stat ?? "vig"),
			dd: toAmount(actionData.concentration.dd),
			source_item_uuid: String(sourceItem?.uuid ?? ""),
			action_index: Number.isInteger(actionIndex) ? actionIndex : -1,
		},
	});
	return previousName;
};

export const stopConcentration = async (actor) => {
	if (!(actor instanceof Actor)) return;
	await actor.update({
		"system.actions.concentration.active": {
			name: "",
			stat: "vig",
			dd: 0,
			source_item_uuid: "",
			action_index: -1,
		},
	});
};

const tickItemCooldowns = async (item, unit) => {
	const tick = (action) => {
		const cooldown = action?.cost?.cooldown;
		if (!cooldown || cooldown.unit !== unit || toAmount(cooldown.remaining) < 1) return false;
		cooldown.remaining = Math.max(0, toAmount(cooldown.remaining) - 1);
		return true;
	};
	if (item.type === "Action") {
		const action = foundry.utils.deepClone(item.system);
		if (tick(action)) await item.update({ system: action });
		return;
	}
	const actions = foundry.utils.deepClone(item.system?.actions ?? []);
	if (!actions.some(tick)) return;
	await item.update({ "system.actions": actions });
};

export const refreshActorTurnResources = async (actor, { cooldownUnit = "turns" } = {}) => {
	if (!(actor instanceof Actor)) return;
	return withActorLock(actor, async () => {
		const updates = {};
		const stateProfile = getActorStateProfile(actor);
		for (const key of [...ACTION_RESOURCE_KEYS, "movement"]) {
			updates[`system.actions.${key}.value`] =
				key === "reaction" && stateProfile.blocksReaction
					? 0
					: toAmount(actor.system?.actions?.[key]?.max);
		}
		await actor.update(updates);
		for (const item of actor.items ?? []) await tickItemCooldowns(item, cooldownUnit);
	});
};

export const syncActorStateRestrictions = async (actor, { options = {}, userId = null } = {}) => {
	if (!(actor instanceof Actor)) return;
	if (userId && userId !== game.user?.id) return;
	if (options.nalfaStateSync) return;
	const profile = getActorStateProfile(actor);
	const updates = {};
	if (profile.blocksReaction && toAmount(actor.system?.actions?.reaction?.value) > 0) {
		updates["system.actions.reaction.value"] = 0;
	}
	const active = actor.system?.actions?.concentration?.active ?? {};
	if (profile.blocksConcentration && String(active.name ?? "").trim()) {
		updates["system.actions.concentration.active"] = {
			name: "",
			stat: "vig",
			dd: 0,
			source_item_uuid: "",
			action_index: -1,
		};
	}
	if (Object.keys(updates).length) await actor.update(updates, { nalfaStateSync: true });
};

export const tickActorRoundCooldowns = async (actor) => {
	if (!(actor instanceof Actor)) return;
	return withActorLock(actor, async () => {
		for (const item of actor.items ?? []) await tickItemCooldowns(item, "rounds");
	});
};
