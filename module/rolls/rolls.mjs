import {
	normalizeHalfMinimumFormula,
	toShortHalfMinimumFormula,
} from "./diceModifiers.mjs";

const CHAT_TEMPLATES = {
	skill: "systems/nalfa/templates/chat/roll/skill.hbs",
	attack: "systems/nalfa/templates/chat/roll/attack.hbs",
	damage: "systems/nalfa/templates/chat/roll/damage.hbs",
	save: "systems/nalfa/templates/chat/roll/save.hbs",
	initiative: "systems/nalfa/templates/chat/roll/initiative.hbs",
};

const getLabel = (list, key, fallback = "") => {
	return list?.[key] ?? fallback ?? "";
};

const getStatTotal = (actor, statKey) => {
	const statObj = actor.system?.stats?.[statKey] ?? {};
	const base = Number(statObj.base ?? 0);
	const alt = Number(statObj.alt ?? 0);
	return base + alt;
};

const getStatBasedValue = (actor, source = {}, fallbackStat) => {
	const statKey = source.stat ?? fallbackStat;
	const statValue = statKey ? getStatTotal(actor, statKey) : 0;
	const statCoef = Number(source.stat_coef ?? 1);
	const base = Number(source.base ?? 0);
	const alt = Number(source.alt ?? 0);
	return statValue * statCoef + base + alt;
};

const hasStat = (statKey) => {
	return Boolean(statKey) && statKey !== "none";
};

const formatStatSuffix = (statKey, statName, value, fallbackValue) => {
	if (hasStat(statKey)) return ` + ${statName} (${value})`;
	if (fallbackValue === undefined || fallbackValue === null) return "";
	if (fallbackValue === 0) return "";
	return ` + ${fallbackValue}`;
};

const getD20Result = (roll) => {
	const die = roll.dice?.find((item) => item.faces === 20) ?? roll.dice?.[0];
	return die?.total ?? null;
};

const getFirstDieResult = (roll) => {
	return roll.dice?.[0]?.total ?? null;
};

const getCritState = (dieResult) => {
	return {
		isCrit: dieResult === 20,
		isFumble: dieResult === 1,
	};
};

const evaluateRoll = async (formula, data) => {
	const roll = new Roll(formula, data);
	await roll.evaluate();
	return roll;
};

const getAttackName = (attack, weapon) => {
	return (attack?.name ?? weapon?.name ?? "").trim() || "Attaque";
};

const getCompareSymbol = (isGreaterOrEqualThan) => {
	return isGreaterOrEqualThan ? "⩾" : "＜";
};

const promptEnemyAttackBonus = async (defaultValue = 0) => {
	return new Promise((resolve) => {
		const inputId = foundry.utils.randomID();
		new Dialog({
			title: "JdF - Stat attaquant",
			content: `
				<div class="form-group">
					<label for="${inputId}">Stat Physique / Stat Incant de l'attaquant</label>
					<input id="${inputId}" type="number" value="${Number(defaultValue ?? 0)}" />
				</div>
			`,
			buttons: {
				confirm: {
					label: "Lancer",
					callback: (html) => {
						const input = html[0]?.querySelector(`#${inputId}`);
						resolve(Number(input?.value ?? defaultValue ?? 0));
					},
				},
				cancel: {
					label: "Annuler",
					callback: () => resolve(null),
				},
			},
			default: "confirm",
			close: () => resolve(null),
		}).render(true);
	});
};

const DEFAULT_ACTOR_DAMAGE_DIE = "d2+1";
const DEFAULT_ACTOR_DAMAGE_TYPE = "none";

const getActorDamageDie = (actor) => {
	const actorDamageDie = String(actor?.system?.da?.value ?? "").trim();
	return actorDamageDie || DEFAULT_ACTOR_DAMAGE_DIE;
};

const getActorDamageType = (actor) => {
	const actorDamageType = String(actor?.system?.damage_type ?? "").trim();
	return actorDamageType || DEFAULT_ACTOR_DAMAGE_TYPE;
};

const resolveDamageFormula = (formula = "", actor) => {
	const damageDie = getActorDamageDie(actor);
	return String(formula ?? "").replace(/\bdA\b/gi, `(${damageDie})`);
};

const resolveDamageType = (damageType, actor) => {
	const rawType = String(damageType ?? "none").trim() || "none";
	if (rawType !== "arme") return rawType;

	return getActorDamageType(actor);
};

const postRollMessage = async (actor, templateKey, data, messageOptions = {}) => {
	const templatePath = CHAT_TEMPLATES[templateKey];
	if (!templatePath) return null;

	const content = await foundry.applications.handlebars.renderTemplate(templatePath, data);
	return ChatMessage.create({
		user: game.user.id,
		speaker: ChatMessage.getSpeaker({ actor }),
		content,
		rolls: [data.roll],
		sound: CONFIG.sounds.dice,
		...messageOptions,
	});
};

const withActionSheetFlag = (messageOptions = {}, chatContext = null) => {
	const sourceItemUuid = String(chatContext?.sourceItemUuid ?? "").trim();
	if (!sourceItemUuid) return messageOptions;

	const actionSheetFlag = {
		sourceItemUuid,
	};

	if (Number.isInteger(chatContext?.actionIndex) && chatContext.actionIndex >= 0) {
		actionSheetFlag.actionIndex = chatContext.actionIndex;
	}

	const actionName = String(chatContext?.actionName ?? "").trim();
	if (actionName) actionSheetFlag.actionName = actionName;

	return {
		...messageOptions,
		flags: {
			...(messageOptions.flags ?? {}),
			nalfa: {
				...(messageOptions.flags?.nalfa ?? {}),
				actionSheet: actionSheetFlag,
			},
		},
	};
};

const rollD20WithModifier = async (modifier) => {
	const roll = await evaluateRoll("1d20 + @modifier", { modifier });
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
	return { roll, dieResult, isCrit, isFumble };
};

export const normalizeDamageFormula = (formula = "") => {
	return normalizeHalfMinimumFormula(formula);
};

export const rollSkill = async (actor, skillKey) => {
	if (!actor) return null;
	const skillObj = actor.system?.attributes?.skills?.[skillKey] ?? {};
	const skillName = getLabel(CONFIG.nalfa.skills, skillKey, skillKey);
	const statKey = skillObj.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const modifier = getStatBasedValue(actor, skillObj);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(modifier);
	const titleLabel = "JdC";
	const statLabel = hasStat(statKey) ? ` (${statName})` : "";
	const titleName = `${skillName}${statLabel}`;
	const titleValue = roll.total;
	const skillTotal = Number(skillObj.value ?? modifier);
	const statTotal = hasStat(statKey) ? getStatTotal(actor, statKey) : 0;
	const baseSkill = hasStat(statKey) ? skillTotal - statTotal : skillTotal;
	const statDetail = hasStat(statKey) ? ` + ${statName} (${statTotal})` : "";
	const formulaText = `d20 [${dieResult ?? "-"}] + ${skillName} (${baseSkill}${statDetail})`;

	const rollData = {
		type: "skill",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
	};

	await postRollMessage(actor, "skill", {
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

export const rollAttackFromAction = async (actor, actionData = {}, options = {}) => {
	if (!actor) return null;
	const messageOptions = withActionSheetFlag(
		options.messageOptions ?? {},
		options.chatContext,
	);

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
	}, messageOptions);

	return rollData;
};

export const rollAttack = async (actor, mode = "physical") => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const weapon = actor.system?.weapon ?? {};
	const titleName = getAttackName(attack, weapon);
	return rollAttackFromAction(actor, attack, { mode, titleName });
};

export const rollDamage = async (actor, config = {}) => {
	if (!actor) return null;
	const messageOptions = withActionSheetFlag(
		config.messageOptions ?? {},
		config.chatContext,
	);
	const rawFormula = (config.formula ?? "").trim();
	if (!rawFormula) return null;
	const resolvedFormula = resolveDamageFormula(rawFormula, actor);
	const normalizedFormula = normalizeDamageFormula(resolvedFormula);
	const shortFormula = toShortHalfMinimumFormula(normalizedFormula);
	const statKey = config.statKey ?? "";
	const statName =
		statKey === "physical"
			? getLabel(CONFIG.nalfa.attack_mode, "physical", "Physique")
			: getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statValue =
		statKey === "physical"
			? Number(actor.system?.roll_stats?.physical?.value ?? 0)
			: (statKey ? getStatTotal(actor, statKey) : 0);
	const damageTypeKey = resolveDamageType(config.damageType, actor);
	const damageTypeLabel = getLabel(
		CONFIG.nalfa.all_damage_types,
		damageTypeKey,
		damageTypeKey,
	);
	const roll = await evaluateRoll(`${normalizedFormula} + @stat`, {
		stat: statValue,
	});
	const dieResult = getFirstDieResult(roll);
	const attack = actor.system?.attack ?? {};
	const weapon = actor.system?.weapon ?? {};
	const titleName = (config.titleName ?? getAttackName(attack, weapon)).trim() || "Attaque";
	const titleLabel = config.titleLabel ?? "JdD";
	const titleValue = roll.total;
	const damageSuffix = hasStat(statKey) ? ` + ${statName} (${statValue})` : "";
	const formulaText = `${shortFormula} [${dieResult ?? "-"}]${damageSuffix}`;

	await postRollMessage(actor, "damage", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		damageTypeLabel,
	}, messageOptions);

	return {
		roll,
		formulaText,
		damageTypeLabel,
	};
};

export const rollDamageSetFromAction = async (actor, actionData = {}, options = {}) => {
	if (!actor) return null;

	const jdd = actionData?.jdd ?? {};
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const entries = (jdd.damage_formulas ?? []).map((entry) => ({
		formula: entry?.formula,
		statKey: entry?.stat,
		damageType: entry?.type,
	}));

	const results = [];
	for (const entry of entries) {
		const result = await rollDamage(actor, {
			...entry,
			titleLabel: "JdD",
			titleName,
			messageOptions: options.messageOptions,
			chatContext: options.chatContext,
		});
		if (result) results.push(result);
	}

	return results.length ? results : null;
};

export const rollDamageSet = async (actor) => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const titleName = getAttackName(attack);
	return rollDamageSetFromAction(actor, attack, { titleName });
};

export const rollSavePromptFromAction = async (actor, actionData = {}, options = {}) => {
	if (!actor) return null;
	const messageOptions = withActionSheetFlag(
		options.messageOptions ?? {},
		options.chatContext,
	);

	const jds = actionData?.jds ?? {};
	const statKey = jds.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, "");
	const statLabel =
		statName || (statKey && statKey !== "none" ? statKey.toUpperCase() : "");
	const dc = Number(options.dc ?? jds.dd ?? 0);
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const content = await foundry.applications.handlebars.renderTemplate(
		"systems/nalfa/templates/chat/roll/prompt-save.hbs",
		{
			titleName,
			statKey,
			statLabel,
			dc,
		},
	);

	return ChatMessage.create({
		user: game.user.id,
		speaker: ChatMessage.getSpeaker({ actor }),
		content,
		...messageOptions,
	});
};

export const rollSavePrompt = async (actor) => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const titleName = getAttackName(attack);
	return rollSavePromptFromAction(actor, attack, { titleName });
};

export const rollSaveTarget = async (actor, statKey, dc, titleName) => {
	if (!actor) return null;
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statValue = statKey ? getStatTotal(actor, statKey) : 0;
	const targetDc = Number(dc ?? 0);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(statValue);
	const isSuccess = Number(roll.total ?? 0) >= targetDc;
	const saveSuffix = formatStatSuffix(statKey, statName, statValue, statValue);
	const compareSymbol = getCompareSymbol(isSuccess);
	const formulaText = `d20 [${dieResult ?? "-"}]${saveSuffix} ${compareSymbol} DD ${targetDc}`;

	await postRollMessage(actor, "save", {
		actor,
		roll,
		titleLabel: "JdS",
		titleName: titleName ?? "",
		titleValue: roll.total,
		formulaText,
		hasTarget: true,
		isSuccess,
		isCrit,
		isFumble,
	});

	return {
		type: "save",
		roll,
		formulaText,
		isSuccess,
	};
};

export const rollStatSave = async (actor, statKey) => {
	if (!actor) return null;
	const statObj = actor.system?.stats?.[statKey] ?? {};
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const modifier = getStatBasedValue(actor, statObj.save ?? {}, statKey);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(modifier);
	const titleLabel = "JdS";
	const titleName = statName;
	const titleValue = roll.total;
	const saveSuffix = formatStatSuffix(statKey, statName, modifier, modifier);
	const formulaText = `d20 [${dieResult ?? "-"}]${saveSuffix}`;

	await postRollMessage(actor, "save", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		hasTarget: false,
		isCrit,
		isFumble,
	});

	return {
		type: "save",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
	};
};

export const rollConcentrationFromAction = async (
	actor,
	actionData = {},
	options = {},
) => {
	if (!actor) return null;
	const messageOptions = withActionSheetFlag(
		options.messageOptions ?? {},
		options.chatContext,
	);

	const concentration = actionData?.concentration ?? {};
	const resolvedStatKey = options.statKey ?? concentration.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, resolvedStatKey, resolvedStatKey);
	const attackerStatValue = await promptEnemyAttackBonus(
		options.enemyAttackBonus ?? concentration.enemy_attack_bonus ?? 0,
	);
	if (attackerStatValue === null) return null;

	const actorStatValue = resolvedStatKey ? getStatTotal(actor, resolvedStatKey) : 0;
	const modifier = actorStatValue - Number(attackerStatValue ?? 0);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(modifier);
	const targetDc = Number(options.dc ?? concentration.dd ?? 0);
	const isSuccess = Number(roll.total ?? 0) >= targetDc;
	const titleLabel = "JdF";
	const fallbackName = String(actionData?.name ?? "").trim() || "Action";
	const titleName = String(options.titleName ?? fallbackName).trim() || "Action";
	const titleValue = roll.total;
	const compareSymbol = getCompareSymbol(isSuccess);
	const attackerStatNumber = Math.max(0, Number(attackerStatValue ?? 0));
	const statPart = resolvedStatKey ? `${statName} (${actorStatValue})` : "Stat (?)";
	const formulaText =
		`d20 [${dieResult ?? "-"}] - ${attackerStatNumber} + ${statPart} ` +
		`${compareSymbol} DD ${targetDc}`;

	const rollData = {
		type: "concentration",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
	};

	await postRollMessage(actor, "save", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		hasTarget: true,
		isSuccess,
		isCrit,
		isFumble,
	}, messageOptions);

	return rollData;
};

export const rollConcentration = async (actor, statKey, dc) => {
	if (!actor) return null;

	const attack = actor.system?.attack ?? {};
	const titleName = getAttackName(attack);
	return rollConcentrationFromAction(actor, attack, {
		statKey,
		dc,
		titleName,
	});
};

export const rollInitiative = async (actor, options = {}) => {
	if (!actor) return null;
	const { titleName = "", messageOptions = {} } = options;
	const initiativeObj = actor.system?.attributes?.initiative ?? {};
	const modifier = getStatBasedValue(actor, initiativeObj);
	const { roll, dieResult, isCrit, isFumble } = await rollD20WithModifier(modifier);
	const titleLabel = "Init";
	const titleValue = roll.total;
	const formulaText = `d20 [${dieResult ?? "-"}] + Init (${modifier})`;

	const rollData = {
		type: "initiative",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
	};

	await postRollMessage(
		actor,
		"initiative",
		{
			actor,
			roll,
			titleLabel,
			titleName,
			titleValue,
			formulaText,
			isCrit,
			isFumble,
		},
		messageOptions,
	);

	return rollData;
};
