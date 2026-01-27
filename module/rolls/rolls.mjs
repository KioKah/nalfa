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
	const die =
		roll.dice?.find((item) => item.faces === 20) ?? roll.dice?.[0];
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

const postRollMessage = async (actor, templateKey, data) => {
	const templatePath = CHAT_TEMPLATES[templateKey];
	if (!templatePath) return null;

	const content = await foundry.applications.handlebars.renderTemplate(
		templatePath,
		data
	);
	console.log(ChatMessage.getSpeaker({ actor }));
	return ChatMessage.create({
		user: game.user.id,
		speaker: ChatMessage.getSpeaker({ actor }),
		content,
		rolls: [data.roll],
		sound: CONFIG.sounds.dice,
	});
};

export const normalizeDamageFormula = (formula = "") => {
	let normalized = String(formula ?? "").trim();
	const replacements = [
		{ sides: 12, min: 6 },
		{ sides: 10, min: 5 },
		{ sides: 8, min: 4 },
		{ sides: 6, min: 3 },
		{ sides: 4, min: 2 },
	];

	for (const { sides, min } of replacements) {
		const regex = new RegExp(`d${sides}(?!min)`, "g");
		normalized = normalized.replace(regex, `d${sides}min${min}`);
	}

	return normalized;
};

export const rollSkill = async (actor, skillKey) => {
	if (!actor) return null;
	const skillObj = actor.system?.attributes?.skills?.[skillKey] ?? {};
	const skillName = getLabel(CONFIG.nalfa.skills, skillKey, skillKey);
	const statKey = skillObj.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const modifier = getStatBasedValue(actor, skillObj);
	const roll = await evaluateRoll("1d20 + @modifier", { modifier });
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
	const titleLabel = "JdC";
	const statLabel = hasStat(statKey) ? ` (${statName})` : "";
	const titleName = `${skillName}${statLabel}`;
	const titleValue = roll.total;
	const skillTotal = Number(skillObj.value ?? modifier);
	const statTotal = hasStat(statKey) ? getStatTotal(actor, statKey) : 0;
	const baseSkill = hasStat(statKey) ? skillTotal - statTotal : skillTotal;
	const statDetail = hasStat(statKey)
		? ` + ${statName} (${statTotal})`
		: "";
	const formulaText =
		`d20 [${dieResult ?? "-"}] + ${skillName} (${baseSkill}${statDetail})`;

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

export const rollAttack = async (actor, mode = "weapon") => {
	if (!actor) return null;
	const attack = actor.system?.attack ?? {};
	const jdt = attack.jdt ?? {};
	const bonusKey = mode === "casting" ? "casting" : "weapon";
	const bonusObj = actor.system?.attributes?.bonuses?.[bonusKey] ?? {};
	const statKey = jdt.stat ?? bonusObj.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statValue = statKey ? getStatTotal(actor, statKey) : 0;
	const bonusValue = Number(jdt.bonus ?? 0);
	const modifier = statValue + bonusValue;
	const roll = await evaluateRoll("1d20 + @modifier", { modifier });
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
	const weapon = actor.system?.weapon ?? {};
	const attackName =
		(attack.name ?? weapon.name ?? "").trim() || "Attaque";
	const titleLabel = "JdT";
	const titleName = attackName;
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

export const rollDamage = async (actor, config = {}) => {
	if (!actor) return null;
	const rawFormula = (config.formula ?? "").trim();
	if (!rawFormula) return null;
	const normalizedFormula = normalizeDamageFormula(rawFormula);
	const shortFormula = normalizedFormula.replace(/d(\d+)min\d+/g, "d$1m");
	const statKey = config.statKey ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statValue = statKey ? getStatTotal(actor, statKey) : 0;
	const damageTypeKey = config.damageType ?? "none";
	const damageTypeLabel = getLabel(
		CONFIG.nalfa.all_damage_types,
		damageTypeKey,
		damageTypeKey
	);
	const roll = await evaluateRoll(`${normalizedFormula} + @stat`, {
		stat: statValue,
	});
	const dieResult = getFirstDieResult(roll);
	const attack = actor.system?.attack ?? {};
	const weapon = actor.system?.weapon ?? {};
	const titleName =
		(config.titleName ?? attack.name ?? weapon.name ?? "").trim() ||
		"Attaque";
	const titleLabel = config.titleLabel ?? "JdD";
	const titleValue = roll.total;
	const damageSuffix = hasStat(statKey)
		? ` + ${statName} (${statValue})`
		: "";
	const formulaText = `${shortFormula} [${dieResult ?? "-"}]${damageSuffix}`;

	await postRollMessage(actor, "damage", {
		actor,
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		damageTypeLabel,
	});

	return {
		roll,
		formulaText,
		damageTypeLabel,
	};
};

export const rollDamageSet = async (actor) => {
	if (!actor) return null;
	const attack = actor.system?.attack ?? {};
	const jdd = attack.jdd ?? {};
	const attackName = (attack.name ?? "").trim() || "Attaque";
	const entries = [
		{
			formula: jdd.formula1,
			statKey: jdd.stat1,
			damageType: jdd.damage_type1,
		},
		{
			formula: jdd.formula2,
			statKey: jdd.stat2,
			damageType: jdd.damage_type2,
		},
	];

	const results = [];
	for (const entry of entries) {
		const result = await rollDamage(actor, {
			...entry,
			titleLabel: "JdD",
			titleName: attackName,
		});
		if (result) results.push(result);
	}

	return results.length ? results : null;
};

export const rollSaveAttack = async (actor) => {
	if (!actor) return null;
	const attack = actor.system?.attack ?? {};
	const jds = attack.jds ?? {};
	const statKey = jds.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statObj = actor.system?.stats?.[statKey] ?? {};
	const modifier = getStatBasedValue(actor, statObj.save ?? {}, statKey);
	const targetDc = Number(jds.dd ?? 0);
	const roll = await evaluateRoll("1d20 + @modifier", { modifier });
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
	const isSuccess = Number(roll.total ?? 0) >= targetDc;
	const attackName = (attack.name ?? "").trim() || "Attaque";
	const titleLabel = "JdS";
	const titleName = attackName;
	const titleValue = roll.total;
	const saveSuffix = formatStatSuffix(statKey, statName, modifier, modifier);
	const formulaText =
		`d20 [${dieResult ?? "-"}]${saveSuffix} vs DD ${targetDc}`;

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
	});

	return {
		type: "save",
		roll,
		titleLabel,
		titleName,
		titleValue,
		formulaText,
		isSuccess,
	};
};

export const rollSavePrompt = async (actor) => {
	if (!actor) return null;
	const attack = actor.system?.attack ?? {};
	const jds = attack.jds ?? {};
	const statKey = jds.stat ?? "";
	const statName = getLabel(CONFIG.nalfa.stats, statKey, "");
	const statLabel =
		statName || (statKey && statKey !== "none" ? statKey.toUpperCase() : "");
	const dc = Number(jds.dd ?? 0);
	const titleName = (attack.name ?? "").trim() || "Attaque";
	const content = await foundry.applications.handlebars.renderTemplate(
		"systems/nalfa/templates/chat/roll/prompt-save.hbs",
		{
			titleName,
			statKey,
			statLabel,
			dc,
		}
	);
	return ChatMessage.create({
		user: game.user.id,
		speaker: ChatMessage.getSpeaker({ actor }),
		content,
	});
};

export const rollSaveTarget = async (actor, statKey, dc, titleName) => {
	if (!actor) return null;
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const statValue = statKey ? getStatTotal(actor, statKey) : 0;
	const targetDc = Number(dc ?? 0);
	const roll = await evaluateRoll("1d20 + @modifier", {
		modifier: statValue,
	});
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
	const isSuccess = Number(roll.total ?? 0) >= targetDc;
	const saveSuffix = formatStatSuffix(statKey, statName, statValue, statValue);
	const formulaText =
		`d20 [${dieResult ?? "-"}]${saveSuffix} vs DD ${targetDc}`;

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
	const roll = await evaluateRoll("1d20 + @modifier", { modifier });
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
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

export const rollSave = async (actor, statKey, dc) => {
	if (!actor) return null;
	const statObj = actor.system?.stats?.[statKey] ?? {};
	const statName = getLabel(CONFIG.nalfa.stats, statKey, statKey);
	const modifier = getStatBasedValue(actor, statObj.save ?? {}, statKey);
	const roll = await evaluateRoll("1d20 + @modifier", { modifier });
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
	const targetDc = Number(dc ?? 0);
	const isSuccess = Number(roll.total ?? 0) >= targetDc;
	const titleLabel = "Sauv";
	const titleName = statName;
	const titleValue = roll.total;
	const saveSuffix = formatStatSuffix(statKey, statName, modifier, modifier);
	const formulaText =
		`d20 [${dieResult ?? "-"}]${saveSuffix} vs DC ${targetDc}`;

	const rollData = {
		type: "save",
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
	});

	return rollData;
};

export const rollConcentration = async (actor, statKey, dc) => {
	if (!actor) return null;
	const bonusObj = actor.system?.attributes?.bonuses?.concentration ?? {};
	const resolvedStatKey = statKey ?? bonusObj.stat ?? "";
	const statName = getLabel(
		CONFIG.nalfa.stats,
		resolvedStatKey,
		resolvedStatKey
	);
	const modifier = getStatBasedValue(actor, {
		...bonusObj,
		stat: resolvedStatKey,
	});
	const roll = await evaluateRoll("1d20 + @modifier", { modifier });
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
	const targetDc = Number(dc ?? 0);
	const isSuccess = Number(roll.total ?? 0) >= targetDc;
	const titleLabel = "Concentr";
	const titleName = statName;
	const titleValue = roll.total;
	const concentrSuffix = formatStatSuffix(
		resolvedStatKey,
		statName,
		modifier,
		modifier
	);
	const formulaText =
		`d20 [${dieResult ?? "-"}]${concentrSuffix} vs DC ${targetDc}`;

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
	});

	return rollData;
};

export const rollInitiative = async (actor) => {
	if (!actor) return null;
	const initiativeObj = actor.system?.attributes?.initiative ?? {};
	const modifier = getStatBasedValue(actor, initiativeObj);
	const roll = await evaluateRoll("1d20 + @modifier", { modifier });
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
	const titleLabel = "Init";
	const titleValue = roll.total;
	const initSuffix = formatStatSuffix(
		initiativeObj.stat,
		getLabel(CONFIG.nalfa.stats, initiativeObj.stat, initiativeObj.stat),
		modifier,
		modifier
	);
	const formulaText = `d20 [${dieResult ?? "-"}]${initSuffix}`;

	const rollData = {
		type: "initiative",
		roll,
		titleLabel,
		titleValue,
		formulaText,
	};

	await postRollMessage(actor, "initiative", {
		actor,
		roll,
		titleLabel,
		titleValue,
		formulaText,
		isCrit,
		isFumble,
	});

	return rollData;
};
