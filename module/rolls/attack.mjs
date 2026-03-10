import {
	formatStatSuffix,
	getAttackName,
	getLabel,
	getStatTotal,
	postRollMessage,
	rollD20WithModifier,
} from "./shared.mjs";

export const rollAttackFromAction = async (actor, actionData = {}, options = {}) => {
	if (!actor) return null;

	const jdt = actionData?.jdt ?? {};
	const requestedMode = options.mode ?? actionData?.mode ?? "physical";
	const resolvedMode =
		requestedMode === "incant" ||
		requestedMode === "physical" ||
		requestedMode === "none"
			? requestedMode
			: "none";
	const rollStats = actor.system?.roll_stats ?? {};
	const physicalStats = rollStats.physical ?? {};
	const incantStats = rollStats.incant ?? {};
	const physicalStatKey = physicalStats.default_stat ?? "";
	const incantStatKey = incantStats.stat ?? "";
	const statKey =
		resolvedMode === "incant"
			? incantStatKey
			: resolvedMode === "physical"
				? (jdt.stat ?? physicalStatKey ?? "")
				: (jdt.stat ?? "");
	const statName =
		statKey === "physical"
			? getLabel(CONFIG.nalfa.attack_mode, "physical", "Physique")
			: getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statValue = statKey ? getStatTotal(actor, statKey) : 0;
	const physicalValue = Number(
		physicalStats.value ??
			(physicalStatKey ? getStatTotal(actor, physicalStatKey) : 0) +
				(physicalStats.base ?? 0) +
				(physicalStats.alt ?? 0),
	);
	const incantValue = Number(
		incantStats.value ??
			(incantStatKey ? getStatTotal(actor, incantStatKey) : 0) +
				(incantStats.base ?? 0) +
				(incantStats.alt ?? 0),
	);
	const bonusValue =
		resolvedMode === "incant"
			? incantValue
			: (resolvedMode === "physical" ? physicalValue : 0);
	const modifier = statValue + bonusValue;
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(modifier);
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleLabel = "JdT";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const titleValue = roll.total;
	const attackSuffix = formatStatSuffix(statKey, statName, modifier, bonusValue);
	const formulaText = `d20 [${dieResult ?? "-"}]${attackSuffix}`;

	const rollData = {
		type: "attack",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
	};

	await postRollMessage(actor, "attack", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		isCrit,
		isFumble,
	});

	return rollData;
};

export const rollAttack = async (actor, mode = "physical") => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const weapon = actor.system?.weapon ?? {};
	const titleName = getAttackName(attack, weapon);
	return rollAttackFromAction(actor, attack, { mode, titleName });
};
