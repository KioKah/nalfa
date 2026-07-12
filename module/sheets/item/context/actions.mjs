import {
	formatEmbeddedActionShorthand,
	MAX_EMBEDDED_ACTIONS,
	getDefaultEmbeddedActionName,
	getDefaultEmbeddedActionShorthand,
	renderEmbeddedActionShorthand,
	resolveEmbeddedActionShorthand,
} from "../../../actions/embedded.mjs";
import {
	formatSignedNumber,
	getActorStatValue,
	htmlToPlainText,
	toFiniteNumber,
} from "../utils.mjs";

const ACTION_RESOURCE_TOKEN_META = Object.freeze({
	main: {
		iconClass: "fa-light fa-sword",
		colorClass: "main",
		label: "main",
	},
	bonus: {
		iconClass: "fa-light fa-plus",
		colorClass: "bonus",
		label: "bonus",
	},
	reaction: {
		iconClass: "fa-light fa-rotate-left",
		colorClass: "reaction",
		label: "reaction",
	},
	concentration: {
		iconClass: "fa-light fa-bullseye",
		colorClass: "concentration",
		label: "concentration",
	},
	movement: {
		iconClass: "fa-light fa-person-running",
		colorClass: "movement",
		label: "movement",
	},
	nalfa: {
		iconClass: "fa-light fa-sparkle",
		colorClass: "nalfa",
		label: "nalfa",
	},
});

const DAMAGE_EFFECT_LABELS = Object.freeze({
	damage: "dégâts",
	healing: "soin",
	abso: "absorption",
	piercing: "perçant",
});

const DAMAGE_EFFECT_ABBR = Object.freeze({
	damage: "dgt",
	healing: "soin",
	abso: "abso",
	piercing: "perç",
});

const escapeHtml = (value) => foundry.utils.escapeHTML(String(value ?? ""));

const toDamageTypeClass = (type) => {
	const key = String(type ?? "none").trim() || "none";
	return key.replace(/[^a-z0-9_-]/gi, "");
};

const formatTooltipHtml = (tooltip = "") => {
	const text = String(tooltip ?? "").trim();
	if (!text) return "";
	const lines = text.split("\n");
	const firstLine = lines[0] ?? "";
	const firstLineHtml = firstLine.endsWith(":")
		? `<strong>${escapeHtml(firstLine)}</strong>`
		: escapeHtml(firstLine);
	return [firstLineHtml, ...lines.slice(1).map((line) => escapeHtml(line))].join("<br>");
};

const makeSummaryRow = (text = "", tooltip = "") => ({
	text,
	tooltip: tooltip || text,
	tooltipHtml: formatTooltipHtml(tooltip || text),
});

const tooltipAttrs = (tooltip = "") => {
	const tooltipHtml = formatTooltipHtml(tooltip);
	if (!tooltipHtml) return "";
	return ` data-tooltip="${tooltipHtml}" data-tooltip-class="nalfa-tooltip nalfa-tooltip--multiline"`;
};

const tooltipSpan = ({ text = "", tooltip = "", className = "" } = {}) => {
	const classAttr = className ? ` class="${escapeHtml(className)}"` : "";
	return `<span${classAttr}${tooltipAttrs(tooltip)}>${escapeHtml(text)}</span>`;
};

const tooltipSpanHtml = ({ text = "", tooltipHtml = "", className = "" } = {}) => {
	const classAttr = className ? ` class="${escapeHtml(className)}"` : "";
	const tooltipAttr = tooltipHtml
		? ` data-tooltip="${tooltipHtml}" data-tooltip-class="nalfa-tooltip nalfa-tooltip--multiline"`
		: "";
	return `<span${classAttr}${tooltipAttr}>${escapeHtml(text)}</span>`;
};

const tooltipHtmlSpan = ({ html = "", tooltip = "", className = "" } = {}) => {
	const classAttr = className ? ` class="${escapeHtml(className)}"` : "";
	return `<span${classAttr}${tooltipAttrs(tooltip)}>${html}</span>`;
};

const htmlToTooltipText = (html = "") => htmlToPlainText(html, { preserveLineBreaks: true });

const getActionStatLabel = (config, statKey) => {
	const key = String(statKey ?? "none");
	return (
		String(
			config.stats_optional_physical?.[key] ??
				config.stats_optional_incant?.[key] ??
				config.stats_optional?.[key] ??
				key,
		).trim() || "?"
	);
};

const makeActionResourceToken = ({
	type,
	amountLabel = "",
	showAmount = false,
	config,
}) => {
	const meta = ACTION_RESOURCE_TOKEN_META[type];
	if (!meta) return null;

	return {
		type,
		iconClass: meta.iconClass,
		colorClass: meta.colorClass,
		showAmount,
		amountLabel: showAmount ? String(amountLabel ?? "") : "",
		title: config.action_cost_hover_labels?.[meta.label] ?? "",
	};
};

const buildActionResourceOptionTokens = ({ option, config }) => {
	const values = {
		main: toFiniteNumber(option?.main, 0),
		bonus: toFiniteNumber(option?.bonus, 0),
		reaction: toFiniteNumber(option?.reaction, 0),
	};

	return Object.entries(values)
		.filter(([, amount]) => amount > 0)
		.map(([type, amount]) =>
			makeActionResourceToken({
				type,
				amountLabel: `×${amount}`,
				showAmount: amount !== 1,
				config,
			}),
		)
		.filter(Boolean);
};

const buildActionResourceSummary = ({ actionData, config }) => {
	const optionsSource = Array.isArray(actionData?.cost?.actions?.options)
		? actionData.cost.actions.options
		: [];
	const options = optionsSource
		.map((option) => {
			const tokens = buildActionResourceOptionTokens({ option, config });
			const condition = String(option?.condition ?? "").trim();

			return {
				tokens,
				hasCondition: condition.length > 0,
				condition,
			};
		})
		.filter((option) => option.tokens.length > 0);

	if (options.length === 0) {
		options.push({
			tokens: [
				makeActionResourceToken({
					type: "main",
					amountLabel: "1",
					showAmount: false,
					config,
				}),
			],
			hasCondition: false,
			condition: "",
		});
	}

	const additions = [];
	if (actionData?.concentration?.enabled) {
		const concentrationToken = makeActionResourceToken({
			type: "concentration",
			amountLabel: "1",
			showAmount: false,
			config,
		});
		if (concentrationToken) additions.push(concentrationToken);
	}

	const movementMode = String(actionData?.cost?.movement?.mode ?? "none");
	if (movementMode === "fixed") {
		const movementAmount = toFiniteNumber(actionData?.cost?.movement?.amount, 0);
		if (movementAmount > 0) {
			const movementToken = makeActionResourceToken({
				type: "movement",
				amountLabel: `${movementAmount}m`,
				showAmount: true,
				config,
			});
			if (movementToken) additions.push(movementToken);
		}
	} else if (movementMode === "variable") {
		const variableLabel = String(actionData?.cost?.movement?.variable ?? "").trim() || "X";
		const movementToken = makeActionResourceToken({
			type: "movement",
			amountLabel: `${variableLabel}m`,
			showAmount: true,
			config,
		});
		if (movementToken) additions.push(movementToken);
	}

	const nalfaAmount = toFiniteNumber(actionData?.cost?.nalfa?.amount, 0);
	if (nalfaAmount > 0) {
		const nalfaToken = makeActionResourceToken({
			type: "nalfa",
			amountLabel: `${nalfaAmount}`,
			showAmount: true,
			config,
		});
		if (nalfaToken) additions.push(nalfaToken);
	}

	return {
		options,
		additions,
		note: htmlToPlainText(actionData?.cost?.actions?.note ?? "", {
			preserveLineBreaks: true,
		}),
	};
};

function buildActionCoreSummary(item, actionData, config) {
	const mode = String(actionData?.mode ?? "none");
	const modeLabel = String(config.attack_mode?.[mode] ?? mode).trim();
	const weaponUsage = String(actionData?.weapon_usage ?? "normal");
	const weaponUsageLabel =
		weaponUsage === "thrown" ? String(config.weapon_usages?.[weaponUsage] ?? "").trim() : "";
	const nalfaAmount = toFiniteNumber(actionData?.cost?.nalfa?.amount, 0);
	const nalfaCategory = String(actionData?.cost?.nalfa?.category ?? "minor");
	const nalfaLabel =
		nalfaAmount > 0 || mode === "incant"
			? String(config.nalfa_cost_categories_short?.[nalfaCategory] ?? "").trim()
			: "";
	const modeWithTier = [modeLabel, weaponUsageLabel, nalfaLabel].filter(Boolean).join(" ");
	const jdParts = [];
	const jdHtmlParts = [];
	const getSavedDamageInlineHint = () => {
		if (!actionData?.jdd?.enabled) return "";

		const mode = String(actionData?.jdd_saved?.mode ?? "same");
		if (mode === "half") return "JdD /2";
		if (mode === "other") return "JdD modifié";
		return "";
	};

	if (actionData?.jdt?.enabled) {
		const statKey = String(actionData?.jdt?.stat ?? "none");
		const statValue = getActorStatValue(item, statKey);
		const bonus = toFiniteNumber(actionData?.jdt?.bonus, 0);
		const total = statValue + bonus;
		const statLabel = getActionStatLabel(config, statKey);
		const summary = `JdT ${formatSignedNumber(total)}`;
		const tooltip = [
			"JdT :",
			`Stat : ${statLabel}`,
			`Bonus : ${formatSignedNumber(bonus)}`,
			`Total : ${formatSignedNumber(total)}`,
		].join("\n");
		jdParts.push(summary);
		jdHtmlParts.push(tooltipSpan({ text: summary, tooltip }));
	}

	if (actionData?.jds?.enabled) {
		const dd = toFiniteNumber(actionData?.jds?.dd, 0);
		const stat = String(actionData?.jds?.stat ?? "none");
		const statLabel = getActionStatLabel(config, stat);
		const outcomeText = actionData?.jds?.fails_on_save
			? "Échoue"
			: String(actionData?.jds?.text ?? "").trim();
		const savedDamageHint = getSavedDamageInlineHint();
		const formattedOutcomeText =
			outcomeText && savedDamageHint ? `${outcomeText},` : outcomeText;
		const outcomeParts = [formattedOutcomeText, savedDamageHint].filter(Boolean);
		const outcomeSummary = outcomeParts.join(" ");
		const saveSummary = outcomeSummary
			? `JdS ${dd} ${statLabel} -> ${outcomeSummary}`
			: `JdS ${dd} ${statLabel}`;
		const saveTooltipParts = ["<strong>JdS :</strong>", `DD : ${dd}`, `Stat : ${statLabel}`];
		if (outcomeSummary) saveTooltipParts.push(`Réussite : ${outcomeSummary}`);
		const savedDamageTooltip = buildSavedDamageTooltip(item, actionData, config);
		if (savedDamageTooltip) saveTooltipParts.push(savedDamageTooltip);
		jdParts.push(saveSummary);
		jdHtmlParts.push(
			tooltipSpanHtml({ text: saveSummary, tooltipHtml: saveTooltipParts.join("<br>") }),
		);
	}

	const jdSummary = jdParts.join(" & ");
	const jdHtml = jdHtmlParts.join(" & ");
	const modeHtml = modeWithTier
		? tooltipSpan({ text: modeWithTier, tooltip: `Mode :\n${modeWithTier}` })
		: "";

	if (!jdSummary) return { text: modeWithTier, html: modeHtml };
	if (!modeWithTier) return { text: jdSummary, html: jdHtml };
	return {
		text: `${modeWithTier} : ${jdSummary}`,
		html: `${modeHtml} : ${jdHtml}`,
	};
}

const buildActionRequirementSummary = (actionData) => {
	return htmlToPlainText(actionData?.requires ?? "");
};

const getCooldownUnitShort = (unit) => {
	const key = String(unit ?? "none");
	if (key === "turns") return "t";
	if (key === "rounds") return "r";
	const fallback = key.trim().charAt(0).toLowerCase();
	return fallback || "";
};

const buildActionCdSummary = (actionData) => {
	const cooldown = actionData?.cost?.cooldown ?? {};
	const unit = String(cooldown.unit ?? "none");
	if (unit === "none") return "";

	const amount = toFiniteNumber(cooldown.amount, 0);
	const unitShort = getCooldownUnitShort(unit);
	if (!unitShort) return "";
	if (amount > 0) return `CD ${amount}${unitShort}`;
	return `CD ${unitShort}`;
};

const getUsesUnitShort = (unit) => {
	const key = String(unit ?? "none");
	if (key === "sr") return "CR";
	if (key === "lr") return "LR";
	if (key === "consumable") return "Consom.";
	return "";
};

const buildActionUsesSummary = (actionData) => {
	const uses = actionData?.cost?.uses ?? {};
	const unit = String(uses.unit ?? "none");
	if (unit === "none") return "";

	const hasValue = Number.isFinite(Number(uses.value));
	const hasMax = Number.isFinite(Number(uses.max));
	if (!hasValue && !hasMax) return "";

	const value = hasValue ? Number(uses.value) : null;
	const max = hasMax ? Number(uses.max) : null;
	const countLabel =
		value !== null && max !== null
			? `${value}/${max}`
			: (value !== null ? `${value}` : (max !== null ? `${max}` : ""));
	const unitLabel = getUsesUnitShort(unit);

	if (countLabel && unitLabel) return `${countLabel} (${unitLabel})`;
	if (countLabel) return countLabel;
	if (unitLabel) return unitLabel;
	return "";
};

const buildActionConcentrationSummary = (actionData, config) => {
	if (!actionData?.concentration?.enabled) return null;

	const concentration = actionData?.concentration ?? {};
	const statKey = String(concentration.stat ?? "none");
	const statLabel = getActionStatLabel(config, statKey);
	const dd = toFiniteNumber(concentration.dd, 0);
	const text = `JdF ${dd} ${statLabel}`;
	return {
		text,
		html: tooltipSpan({ text, tooltip: ["JdF :", `DD : ${dd}`, `Stat : ${statLabel}`].join("\n") }),
	};
};

const buildNalfaOverloadSummary = (actionData) => {
	const overload = actionData?.cost?.nalfa?.overload ?? {};
	if (overload.enabled !== true) return "";

	const amount = toFiniteNumber(overload.amount, 0);
	const effect = htmlToPlainText(overload.effect ?? "", { preserveLineBreaks: true });
	const amountLabel = amount > 0 ? `+${amount} Nalfa` : "Surcharge Nalfa";
	return effect ? `${amountLabel}: ${effect}` : amountLabel;
};

function buildNalfaOverloadTooltip(item, actionData, config) {
	const overload = actionData?.cost?.nalfa?.overload ?? {};
	if (overload.enabled !== true) return "";

	const parts = [];
	const amount = toFiniteNumber(overload.amount, 0);
	if (amount > 0) parts.push(`Coût : +${amount} Nalfa`);

	const effect = htmlToPlainText(overload.effect ?? "", { preserveLineBreaks: true });
	if (effect) parts.push(`Effet : ${effect}`);

	if (overload.jdd?.enabled) {
		const damageParts = buildDamageFormulaSummary(
			item,
			Array.isArray(overload.jdd?.damage_formulas) ? overload.jdd.damage_formulas : [],
			config,
		);
		if (damageParts.tooltip) parts.push(`JdD modifié :\n${damageParts.tooltip}`);
	}

	return parts.length ? `Surcharge Nalfa :\n${parts.join("\n")}` : "";
}

const buildRangeDetailSummary = (actionData, config) => {
	const rangeType = String(actionData?.range_type ?? "ranged");
	if (rangeType === "melee") {
		return {
			text: "Allonge",
			html: tooltipSpan({ text: "Allonge", tooltip: "Portée :\nAu CàC : Allonge" }),
			tooltip: "Au CàC : Allonge",
		};
	}

	const zone = actionData?.selection?.zone ?? {};
	const shape = String(zone.shape ?? "circle");
	const rangeTypeLabel = config.range_types?.[rangeType] ?? rangeType;
	const rangeParts = [];
	const tooltipParts = [];
	const reachDisadvantageIcon =
		'<span class="embedded-actions__reach-disadvantage">' +
		'<i class="fa-light fa-arrows-left-right embedded-actions__reach-disadvantage-base"></i>' +
		'<i class="fa-light fa-triangle-exclamation embedded-actions__reach-disadvantage-alert"></i>' +
		"</span>";

	if (rangeType === "pure_ranged") {
		const minRange = `${toFiniteNumber(zone.min_range, 0)} m`;
		rangeParts.push(minRange, "↔");
		tooltipParts.push(`Min : ${minRange}`);
	}

	if (rangeType === "ranged") {
		rangeParts.push(reachDisadvantageIcon);
		tooltipParts.push("Désavantage en portée d'Allonge");
	}

	const rangeLabel = `${toFiniteNumber(zone.range, 0)} m`;
	rangeParts.push(rangeLabel);
	tooltipParts.push(`Portée : ${rangeLabel}`);

	if (zone.has_long_range) {
		const longRange = `${toFiniteNumber(zone.long_range, 0)} m`;
		rangeParts.push(`~ ${longRange} (Longue)`);
		tooltipParts.push(`Longue : ${longRange}`);
	}

	const rangeText = rangeParts.join(" ");
	if (shape === "circle") {
		const tooltip = [`Portée :`, `${rangeTypeLabel} : ${tooltipParts.join(", ")}`].join("\n");
		return {
			text: htmlToTooltipText(rangeText),
			html: tooltipHtmlSpan({ html: rangeText, tooltip }),
			tooltip: `${rangeTypeLabel} : ${tooltipParts.join(", ")}`,
		};
	}

	const shapeLabel = config.area_shapes?.[shape] ?? shape;
	const secondary = toFiniteNumber(zone.range_secondary, 0);
	const secondaryLabel = shape === "line" ? `${secondary}m de large` : `${secondary}°`;
	const text = `${htmlToTooltipText(rangeText)} <${shapeLabel} ${secondaryLabel}>`;
	const html = `${rangeText} &lt;${escapeHtml(shapeLabel)} ${escapeHtml(secondaryLabel)}&gt;`;
	const tooltip = [
		"Portée :",
		`${rangeTypeLabel} : ${tooltipParts.join(", ")}`,
		`Zone : ${shapeLabel} ${secondaryLabel}`,
	].join("\n");
	return {
		text,
		html: tooltipHtmlSpan({ html, tooltip }),
		tooltip: `${rangeTypeLabel} : ${tooltipParts.join(", ")}\nZone : ${shapeLabel} ${secondaryLabel}`,
	};
};

const buildActionRangeSummary = (actionData, config) => {
	const rangeType = String(actionData?.range_type ?? "ranged");
	const rangeTypeLabel = config.range_types?.[rangeType] ?? rangeType;
	const rangeSummary = buildRangeDetailSummary(actionData, config);
	const typeHtml = tooltipSpan({
		text: rangeTypeLabel,
		tooltip: `Type de portée :\n${rangeTypeLabel}`,
	});

	if (!rangeSummary) return { text: rangeTypeLabel, html: typeHtml };
	return {
		text: `${rangeTypeLabel} : ${rangeSummary.text}`,
		html: `${typeHtml} : ${rangeSummary.html}`,
		tooltip: `${rangeTypeLabel} : ${rangeSummary.tooltip}`,
	};
};

const buildDamageFormulaEntry = (item, formulaData, config) => {
	const formulaText = String(formulaData?.formula ?? "").trim();
	const statKey = String(formulaData?.stat ?? "none");
	if (!formulaText && statKey === "none") return null;

	const effect = String(formulaData?.effect ?? "damage").trim() || "damage";
	const type = String(formulaData?.type ?? "none").trim() || "none";
	const statLabel = getActionStatLabel(config, statKey);
	const typeLabel = String(config.all_damage_types?.[type] ?? type).trim() || "?";
	const effectLabel = DAMAGE_EFFECT_LABELS[effect] ?? effect;
	let text = formulaText;
	let detailFormula = formulaText;

	if (statKey !== "none") {
		const statBonus = getActorStatValue(item, statKey);
		const statText = formatSignedNumber(statBonus);
		text = formulaText ? `${formulaText}${statText}` : statText;
		detailFormula = formulaText ? `${formulaText} + ${statLabel}` : statLabel;
	}

	const detailLine = [detailFormula, effectLabel, type === "none" ? "" : typeLabel.toLowerCase()]
		.filter(Boolean)
		.join(" ");

	return {
		text,
		detailLine,
		effect,
		effectLabel,
		type,
		typeLabel,
		typeClass: toDamageTypeClass(type),
	};
};

const buildDamageFormulaEffectSuffixes = (entries) => {
	const effects = [...new Set(entries.map((entry) => entry.effect))];
	const hasMultipleEffects = effects.length > 1;
	if (!hasMultipleEffects) {
		return new Map([[entries.length - 1, DAMAGE_EFFECT_LABELS[effects[0]] ?? effects[0]]]);
	}

	const suffixes = new Map();
	for (let index = 0; index < entries.length; index += 1) {
		const currentEffect = entries[index]?.effect;
		const nextEffect = entries[index + 1]?.effect;
		if (currentEffect === nextEffect) continue;
		suffixes.set(index, DAMAGE_EFFECT_ABBR[currentEffect] ?? currentEffect);
	}

	return suffixes;
};

function buildDamageFormulaSummary(item, formulas, config) {
	const entries = formulas
		.map((formulaData) => buildDamageFormulaEntry(item, formulaData, config))
		.filter(Boolean);

	if (!entries.length) {
		return {
			html: "",
			tooltip: "",
		};
	}

	const effectSuffixes = buildDamageFormulaEffectSuffixes(entries);
	const html = entries
		.map((entry, index) => {
			const suffix = effectSuffixes.get(index);
			const suffixHtml = suffix
				? ` <span class="embedded-actions__damage-effect">${escapeHtml(suffix)}</span>`
				: "";
			const tooltip = entry.detailLine;
			return [
				`<span class="embedded-actions__damage-formula color-${entry.typeClass}"${tooltipAttrs(tooltip)}>`,
				escapeHtml(entry.text),
				"</span>",
				suffixHtml,
			].join("");
		})
		.join(" + ");
	const tooltip = entries.map((entry) => entry.detailLine).join("\n");

	return { html, tooltip };
}

const buildActionDamageSummary = (item, actionData, config) => {
	if (!actionData?.jdd?.enabled) return "";

	const formulas = Array.isArray(actionData?.jdd?.damage_formulas)
		? actionData.jdd.damage_formulas
		: [];
	const damageParts = buildDamageFormulaSummary(item, formulas, config);

	return {
		html: damageParts.html
			? `${tooltipSpan({ text: "JdD", tooltip: `JdD :\n${damageParts.tooltip}` })} ${damageParts.html}`
			: tooltipSpan({ text: "JdD", tooltip: "JdD :" }),
		text: damageParts.html ? `JdD ${htmlToTooltipText(damageParts.html)}` : "JdD",
		tooltip: damageParts.tooltip ? `JdD :\n${damageParts.tooltip}` : "JdD :",
	};
};

function buildSavedDamageTooltip(item, actionData, config) {
	if (!actionData?.jdd?.enabled || !actionData?.jds?.enabled) return "";

	const mode = String(actionData?.jdd_saved?.mode ?? "same");
	if (mode === "same") return "";
	if (mode === "half") return "<br><strong>JdD sauvegardé :</strong><br>JdD /2";
	if (mode !== "other") return "";

	const damageParts = buildDamageFormulaSummary(
		item,
		Array.isArray(actionData?.jdd_saved?.damage_formulas)
			? actionData.jdd_saved.damage_formulas
			: [],
		config,
	);
	return damageParts.tooltip
		? `<br><strong>JdD sauvegardé :</strong><br>${formatTooltipHtml(damageParts.tooltip)}`
		: "";
}

const buildSavedDamageSummary = (item, actionData, config) => {
	void item;
	void actionData;
	void config;
	return "";
};

const buildActionRightSummaryRows = (item, actionData, config) => {
	const rows = [];
	const requirementSummary = buildActionRequirementSummary(actionData);
	if (requirementSummary) rows.push(makeSummaryRow(requirementSummary, `Prérequis :\n${requirementSummary}`));

	const cooldownSummary = buildActionCdSummary(actionData);
	const usesSummary = buildActionUsesSummary(actionData);
	const overloadSummary = buildNalfaOverloadSummary(actionData);
	const costRow = [cooldownSummary, usesSummary].filter(Boolean).join(", ");
	if (costRow) {
		const costTooltip = [costRow, overloadSummary ? `Surcharge : ${overloadSummary}` : ""]
			.filter(Boolean)
			.join("\n");
		rows.push(makeSummaryRow(costRow, costTooltip));
	}
	if (overloadSummary) {
		rows.push(makeSummaryRow(overloadSummary, buildNalfaOverloadTooltip(item, actionData, config)));
	}

	return rows;
};

const buildEmbeddedActionDetailRows = (item, actionData, config) => {
	const coreSummary = buildActionCoreSummary(item, actionData, config);
	const concentrationSummary = buildActionConcentrationSummary(actionData, config);
	const detailRow1Parts = [coreSummary?.text, concentrationSummary?.text].filter(Boolean);
	const detailRow1HtmlParts = [coreSummary?.html, concentrationSummary?.html].filter(Boolean);
	const detailRow1 = detailRow1Parts.join(" | ");
	const detailRow1Html = detailRow1HtmlParts.join(" | ");

	const rangeSummary = buildActionRangeSummary(actionData, config);
	const damageSummary = buildActionDamageSummary(item, actionData, config);
	const savedDamageSummary = buildSavedDamageSummary(item, actionData, config);
	const detailRow2Parts = [
		rangeSummary?.text,
		damageSummary?.text,
		savedDamageSummary ? htmlToTooltipText(savedDamageSummary) : "",
	].filter(Boolean);
	const detailRow2HtmlParts = [
		rangeSummary?.html,
		damageSummary?.html,
		savedDamageSummary,
	].filter(Boolean);

	const detailRow2 = detailRow2Parts.join(" | ");
	const detailRow2Html = detailRow2HtmlParts.join(" | ");
	return {
		detailRow1,
		detailRow1Html,
		detailRow2,
		detailRow2Html,
	};
};

export const buildEmbeddedActionRow = ({ item, actionData, index, config }) => {
	const trimmedName = String(actionData?.name ?? "").trim();
	const defaultName = getDefaultEmbeddedActionName(item.name, index);
	const actionName = trimmedName || defaultName;
	const sourceUuid = String(actionData?.source_uuid ?? "").trim();
	const sourceVersion = String(actionData?.source_version ?? "").trim();
	const hasSource = sourceUuid.length > 0;
	const alwaysRefresh = hasSource && actionData?.always_refresh === true;
	const resolvedShorthand = resolveEmbeddedActionShorthand({
		shorthand: actionData?.shorthand,
		actionName,
		preferGenerated: alwaysRefresh,
	});
	const defaultShorthand = getDefaultEmbeddedActionShorthand(actionName);
	const summaryRows = buildActionRightSummaryRows(item, actionData, config);
	const { detailRow1, detailRow1Html, detailRow2, detailRow2Html } =
		buildEmbeddedActionDetailRows(item, actionData, config);
	const effectText = htmlToPlainText(actionData?.effect?.text ?? "", {
		preserveLineBreaks: true,
	});
	const effectTooltipHtml = formatTooltipHtml(`Effet :\n${effectText}`);

	const hasPrimaryRolls =
		actionData?.jdt?.enabled === true ||
		actionData?.jds?.enabled === true ||
		actionData?.jdd?.enabled === true;
	const hasConcentrationRoll = actionData?.concentration?.enabled === true;

	return {
		index,
		defaultName,
		defaultShorthand,
		displayName: trimmedName || defaultName,
		displayNameTooltip: trimmedName || defaultName,
		effectText,
		effectTooltipHtml,
		hasEffectText: effectText.length > 0,
		displayShorthand: formatEmbeddedActionShorthand(resolvedShorthand),
		displayShorthandHtml: renderEmbeddedActionShorthand(resolvedShorthand),
		hasSource,
		sourceUuid,
		sourceVersion,
		alwaysRefresh,
		resourceSummary: buildActionResourceSummary({ actionData, config }),
		hasPrimaryRolls,
		hasConcentrationRoll,
		hasAnyRolls: hasPrimaryRolls || hasConcentrationRoll,
		summaryRows,
		detailRow1,
		detailRow1Html,
		detailRow2,
		detailRow2Html,
	};
};

const buildEmbeddedActionRows = ({ item, config }) => {
	const embeddedActions = Array.isArray(item.system?.actions) ? item.system.actions : [];

	return embeddedActions.map((actionData, index) => {
		return buildEmbeddedActionRow({ item, actionData, index, config });
	});
};

export const buildActionableContext = ({
	item,
	config,
	readonly = false,
	rollable = false,
	isEditable = false,
} = {}) => {
	const isActionItem = item.type === "Action";
	const hasEmbeddedActions = Array.isArray(item.system?.actions);
	const actionData = isActionItem ? item.system : null;
	const actionPath = isActionItem ? "" : "actions.0.";
	const actionDefaultName = String(actionData?.name ?? "").trim() || item.name;
	const defaultActionShorthand = getDefaultEmbeddedActionShorthand(actionDefaultName);
	const resolvedActionShorthand = resolveEmbeddedActionShorthand({
		shorthand: item.system?.shorthand,
		actionName: actionDefaultName,
	});
	const actionHeaderShorthand =
		formatEmbeddedActionShorthand(resolvedActionShorthand || defaultActionShorthand);
	const actionHeaderShorthandHtml = renderEmbeddedActionShorthand(
		resolvedActionShorthand || defaultActionShorthand,
	);
	const hasActionable = isActionItem ? actionData !== null : hasEmbeddedActions;
	const showEmbeddedActionsTab = hasEmbeddedActions && !isActionItem;
	const embeddedActions = showEmbeddedActionsTab
		? buildEmbeddedActionRows({ item, config })
		: [];
	const embeddedActionsCount = embeddedActions.length;
	const canAddEmbeddedAction = embeddedActionsCount < MAX_EMBEDDED_ACTIONS;
	const embeddedActionsTabLabel = embeddedActionsCount >= 2 ? "Actions" : "Action";
	const actionMode = actionData?.mode ?? "physical";
	const effectTextSource = actionData?.effect?.text ?? "";
	const noteTextSource = actionData?.cost?.actions?.note ?? "";
	const noteHasContent = htmlToPlainText(noteTextSource).length > 0;
	const effectNamePath = `system.${actionPath}effect.text`;
	const noteNamePath = `system.${actionPath}cost.actions.note`;

	return {
		isActionItem,
		actionData,
		actionPath,
		defaultActionShorthand,
		actionHeaderShorthand,
		actionHeaderShorthandHtml,
		hasActionable,
		showEmbeddedActionsTab,
		embeddedActions,
		embeddedActionsCount,
		showEmbeddedActionsHeader: true,
		showEmbeddedActionIcon: true,
		showEmbeddedActionControls: true,
		embeddedActionReadonly: readonly,
		enableEmbeddedActionDrop: !readonly && isEditable,
		enableEmbeddedActionDrag: rollable,
		canAddEmbeddedAction: !readonly && canAddEmbeddedAction,
		maxEmbeddedActions: MAX_EMBEDDED_ACTIONS,
		embeddedActionsTabLabel,
		isActionModeIncant: actionMode === "incant",
		isActionModePhysical: actionMode === "physical",
		effectTextSource,
		noteTextSource,
		noteHasContent,
		effectNamePath,
		noteNamePath,
	};
};
