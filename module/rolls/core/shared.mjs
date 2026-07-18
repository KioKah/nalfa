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

const getActorDamageDieVariable = (actor, variableName) => {
	if (variableName.toLowerCase() === "da") return getActorDamageDie(actor);
	if (variableName.toLowerCase() === "dap") {
		return String(actor?.system?.da?.primary ?? "").trim();
	}
	if (variableName.toLowerCase() === "das") {
		return String(actor?.system?.da?.secondary ?? "").trim();
	}
	return "";
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
	let missingVariable = "";
	const formulaText = String(formula ?? "").replace(/\bdA[pPsS]?\b/g, (match) => {
		const damageDie = getActorDamageDieVariable(actor, match);
		if (!damageDie && match.toLowerCase() !== "da") missingVariable = match;
		return damageDie ? `(${damageDie})` : match;
	});

	return {
		formula: formulaText,
		missingVariable,
	};
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

const ROLL_MODE_LABELS = {
	normal: "Normal",
	advantage: "Avantage",
	disadvantage: "Désavantage",
};

export const getD20RollDetail = (
	roll,
	suffix = "",
	{ isCrit = false, isFumble = false, modifier = 0, comparison = "" } = {},
) => {
	const die = roll?.dice?.find((item) => item.faces === 20) ?? roll?.dice?.[0];
	const modifiers = die?.modifiers ?? [];
	const isAdvantage = modifiers.some((modifier) => modifier.startsWith("kh"));
	const isDisadvantage = modifiers.some((modifier) => modifier.startsWith("kl"));
	const automaticOutcome = isCrit
		? "Réussite automatique"
		: (isFumble ? "Échec automatique" : "");
	if (!automaticOutcome && !isAdvantage && !isDisadvantage) return null;
	const results = die?.results ?? [];
	const discardedResult = results.find((result) => result.active === false);
	const normalizedModifier = Number(modifier) || 0;
	const orderedResults = [...results].sort((left, right) => {
		const leftDiscarded = left === discardedResult || left.active === false;
		const rightDiscarded = right === discardedResult || right.active === false;
		if (leftDiscarded === rightDiscarded) return 0;
		return isAdvantage
			? (leftDiscarded ? 1 : -1)
			: (leftDiscarded ? -1 : 1);
	});

	return {
		label: isAdvantage ? "d20Av" : (isDisadvantage ? "d20Dav" : "d20"),
		results: orderedResults.map((result) => ({
			value: result.result,
			isDiscarded: result === discardedResult || result.active === false,
		})),
		keptValue: results.find((result) => result.active !== false)?.result ?? null,
		discardedValue:
			discardedResult === undefined ? null : discardedResult.result + normalizedModifier,
		showDiscardedInTotal: Boolean(discardedResult) && !automaticOutcome,
		prefix: suffix,
		comparison: automaticOutcome ? "" : comparison,
		suffix: automaticOutcome || suffix,
		separator: Boolean(automaticOutcome),
	};
};

export const formatRollAdjustment = (value) => {
	const adjustment = Number(value ?? 0);
	if (!Number.isFinite(adjustment) || adjustment === 0) return "";
	if (adjustment > 0) return ` + Bonus (${adjustment})`;
	return ` - Malus (${Math.abs(adjustment)})`;
};

const getD20RollFormula = (mode) => {
	if (mode === "advantage") return "2d20kh + @modifier";
	if (mode === "disadvantage") return "2d20kl + @modifier";
	return "1d20 + @modifier";
};

export const promptD20RollOptions = async ({
	typeLabel,
	baseModifier = 0,
	includeDifficulty = false,
} = {}) => {
	const { DialogV2 } = foundry.applications.api;
	const inputId = foundry.utils.randomID();
	const modeId = foundry.utils.randomID();
	const difficultyId = foundry.utils.randomID();
	const normalizedBaseModifier = Number(baseModifier) || 0;

	return new Promise((resolve) => {
		let settled = false;
		const settle = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};
		const dialog = new DialogV2({
			classes: ["nalfa", "sheet", "nalfa-action-dialog"],
			window: { title: `${typeLabel} - Ajustements du jet` },
			content: `
				<section class="panel-section nalfa-action-dialog__roll-adjustments">
					<p class="hint">${foundry.utils.escapeHTML(typeLabel)} · Modificateur de base : ${normalizedBaseModifier}</p>
					<label class="field field--inline">
						<span class="field__label">Bonus / malus</span>
						<input id="${inputId}" name="roll-bonus" type="number" value="0" data-dtype="Number" />
					</label>
					<label class="field field--inline">
						<span class="field__label">Avantage</span>
						<select id="${modeId}" name="roll-mode">
							<option value="normal">${ROLL_MODE_LABELS.normal}</option>
							<option value="advantage">${ROLL_MODE_LABELS.advantage}</option>
							<option value="disadvantage">${ROLL_MODE_LABELS.disadvantage}</option>
						</select>
					</label>
					${includeDifficulty ? `
						<label class="field field--inline">
							<span class="field__label">DD</span>
							<input id="${difficultyId}" name="roll-difficulty" type="number" placeholder="Aucune" />
						</label>
					` : ""}
				</section>
			`,
			buttons: [
				{
					action: "cancel",
					label: "Annuler",
					callback: () => settle(null),
				},
				{
					action: "roll",
					label: "Lancer",
					default: true,
					callback: (_event, _target, currentDialog) => {
						const bonus = Number(
							currentDialog.element?.querySelector(`[name='roll-bonus']`)?.value ?? 0,
						);
						const mode = currentDialog.element?.querySelector(`[name='roll-mode']`)?.value;
						const difficultyInput = currentDialog.element?.querySelector(
							`[name='roll-difficulty']`,
						);
						const difficultyText = String(difficultyInput?.value ?? "").trim();
						const difficulty = difficultyText === "" ? null : Number(difficultyText);
						settle({
							bonus: Number.isFinite(bonus) ? bonus : 0,
							mode: mode in ROLL_MODE_LABELS ? mode : "normal",
							difficulty: Number.isFinite(difficulty) ? difficulty : null,
						});
					},
				},
			],
		});
		dialog.addEventListener("close", () => settle(null));
		dialog.render({ force: true });
	});
};

export const rollD20WithModifier = async (modifier, options = {}) => {
	let rollOptions = {
		bonus: 0,
		mode: "normal",
	};
	if (options.adjustments) {
		rollOptions = options.adjustments;
	} else if (options.promptAdjustments) {
		rollOptions = await promptD20RollOptions({
			typeLabel: options.typeLabel ?? "Jet",
			baseModifier: modifier,
			includeDifficulty: options.includeDifficulty,
		});
		if (!rollOptions) return null;
	}
	if (!ROLL_MODE_LABELS[rollOptions.mode]) rollOptions.mode = "normal";
	const customBonus = Number(rollOptions.bonus ?? 0);
	const totalModifier = Number(modifier ?? 0) + customBonus;
	const roll = await evaluateRoll(getD20RollFormula(rollOptions.mode), {
		modifier: totalModifier,
	});
	const dieResult = getD20Result(roll);
	const { isCrit, isFumble } = getCritState(dieResult);
	return {
		roll,
		dieResult,
		isCrit,
		isFumble,
		modifier: totalModifier,
		customBonus,
		rollMode: rollOptions.mode,
		adjustments: rollOptions,
	};
};
