const CHAT_TEMPLATES = {
	skill: "systems/nalfa/templates/chat/roll/skill.hbs",
	attack: "systems/nalfa/templates/chat/roll/attack.hbs",
	damage: "systems/nalfa/templates/chat/roll/damage.hbs",
	save: "systems/nalfa/templates/chat/roll/save.hbs",
	initiative: "systems/nalfa/templates/chat/roll/initiative.hbs",
};

const getD20Result = (roll) => {
	const die = roll.dice?.find((item) => item.faces === 20) ?? roll.dice?.[0];
	return die?.total ?? null;
};

const getCritState = (dieResult) => {
	return {
		isCrit: dieResult === 20,
		isFumble: dieResult === 1,
	};
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

export const getLabel = (list, key, fallback = "") => {
	return list?.[key] ?? fallback ?? "";
};

export const getStatTotal = (actor, statKey) => {
	const statObj = actor.system?.stats?.[statKey] ?? {};
	const base = Number(statObj.base ?? 0);
	const alt = Number(statObj.alt ?? 0);
	return base + alt;
};

export const getStatBasedValue = (actor, source = {}, fallbackStat) => {
	const statKey = source.stat ?? fallbackStat;
	const statValue = statKey ? getStatTotal(actor, statKey) : 0;
	const statCoef = Number(source.stat_coef ?? 1);
	const base = Number(source.base ?? 0);
	const alt = Number(source.alt ?? 0);
	return statValue * statCoef + base + alt;
};

export const hasStat = (statKey) => {
	return Boolean(statKey) && statKey !== "none";
};

export const formatStatSuffix = (statKey, statName, value, fallbackValue) => {
	if (hasStat(statKey)) return ` + ${statName} (${value})`;
	if (fallbackValue === undefined || fallbackValue === null) return "";
	if (fallbackValue === 0) return "";
	return ` + ${fallbackValue}`;
};

export const getFirstDieResult = (roll) => {
	return roll.dice?.[0]?.total ?? null;
};

export const evaluateRoll = async (formula, data) => {
	const roll = new Roll(formula, data);
	await roll.evaluate();
	return roll;
};

export const getAttackName = (attack, weapon) => {
	return (attack?.name ?? weapon?.name ?? "").trim() || "Attaque";
};

export const getCompareSymbol = (isGreaterOrEqualThan) => {
	return isGreaterOrEqualThan ? "⩾" : "＜";
};

export const promptEnemyAttackBonus = async (defaultValue = 0) => {
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

export const resolveDamageFormula = (formula = "", actor) => {
	const damageDie = getActorDamageDie(actor);
	return String(formula ?? "").replace(/\bdA\b/gi, `(${damageDie})`);
};

export const resolveDamageType = (damageType, actor) => {
	const rawType = String(damageType ?? "none").trim() || "none";
	if (rawType !== "arme") return rawType;

	return getActorDamageType(actor);
};

export const postRollMessage = async (actor, templateKey, data, messageOptions = {}) => {
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

export const withActionSheetFlag = (messageOptions = {}, chatContext = null) => {
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

export const rollD20WithModifier = async (modifier) => {
	const roll = await evaluateRoll("1d20 + @modifier", { modifier });
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
	return { roll, dieResult, isCrit, isFumble };
};
