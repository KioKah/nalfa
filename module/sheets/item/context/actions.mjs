import {
	MAX_EMBEDDED_ACTIONS,
	getDefaultEmbeddedActionName,
	getDefaultEmbeddedActionShorthand,
} from "../../../embeddedActions.mjs";
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
});

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

	return {
		options,
		additions,
		note: htmlToPlainText(actionData?.cost?.actions?.note ?? "", {
			preserveLineBreaks: true,
		}),
	};
};

const buildActionCoreSummary = (item, actionData, config) => {
	const mode = String(actionData?.mode ?? "physical");
	const modeLabel = config.attack_mode?.[mode] ?? mode;
	const esterUnit = String(actionData?.cost?.ester?.unit ?? "none");
	const esterLabel = String(config.ester_levels_short?.[esterUnit] ?? "").trim();
	const modeWithTier = esterLabel ? `${modeLabel} ${esterLabel}` : modeLabel;
	const jdParts = [];

	if (actionData?.jdt?.enabled) {
		const statKey = String(actionData?.jdt?.stat ?? "none");
		const statValue = getActorStatValue(item, statKey);
		const bonus = toFiniteNumber(actionData?.jdt?.bonus, 0);
		const total = statValue + bonus;
		jdParts.push(`JdT ${formatSignedNumber(total)}`);
	}

	if (actionData?.jds?.enabled) {
		const dd = toFiniteNumber(actionData?.jds?.dd, 0);
		const stat = String(actionData?.jds?.stat ?? "none");
		const statLabel = (config.stats_optional?.[stat] ?? stat) || "?";
		jdParts.push(`JdS ${dd} ${statLabel}`);
	}

	if (jdParts.length === 0) return modeWithTier;
	return `${modeWithTier} : ${jdParts.join(" & ")}`;
};

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
	if (!actionData?.concentration?.enabled) return "";

	const concentration = actionData?.concentration ?? {};
	const statKey = String(concentration.stat ?? "none");
	const statLabel = String(config.stats_optional?.[statKey] ?? statKey).trim() || "?";
	const dd = toFiniteNumber(concentration.dd, 0);
	return `(JdF ${dd} ${statLabel})`;
};

const buildRangeDetailSummary = (actionData, config) => {
	const rangeType = String(actionData?.range_type ?? "ranged");
	if (rangeType === "melee") return "Allonge";

	const zone = actionData?.selection?.zone ?? {};
	const shape = String(zone.shape ?? "circle");
	const rangeParts = [];
	const reachDisadvantageIcon =
		'<span class="embedded-actions__reach-disadvantage" data-tooltip="Désavantage en portée d\'Allonge">' +
		'<i class="fa-light fa-arrows-left-right embedded-actions__reach-disadvantage-base"></i>' +
		'<i class="fa-light fa-triangle-exclamation embedded-actions__reach-disadvantage-alert"></i>' +
		"</span>";

	if (rangeType === "pure_ranged") {
		rangeParts.push(`${toFiniteNumber(zone.min_range, 0)} m`, "↔");
	}

	if (rangeType === "ranged") {
		rangeParts.push(reachDisadvantageIcon);
	}

	rangeParts.push(`${toFiniteNumber(zone.range, 0)} m`);

	if (zone.has_long_range) {
		rangeParts.push(`~ ${toFiniteNumber(zone.long_range, 0)} m (Longue)`);
	}

	const rangeText = rangeParts.join(" ");
	if (shape === "circle") return rangeText;

	const shapeLabel = config.area_shapes?.[shape] ?? shape;
	const secondary = toFiniteNumber(zone.range_secondary, 0);
	const secondaryLabel = shape === "line" ? `${secondary}m de large` : `${secondary}°`;
	return `${rangeText} &lt;${shapeLabel} ${secondaryLabel}&gt;`;
};

const buildActionRangeSummary = (actionData, config) => {
	const rangeType = String(actionData?.range_type ?? "ranged");
	const rangeTypeLabel = config.range_types?.[rangeType] ?? rangeType;
	const rangeSummary = buildRangeDetailSummary(actionData, config);

	if (!rangeSummary) return rangeTypeLabel;
	return `${rangeTypeLabel} : ${rangeSummary}`;
};

const buildActionDamageSummary = (item, actionData) => {
	if (!actionData?.jdd?.enabled) return "";

	const formulas = Array.isArray(actionData?.jdd?.damage_formulas)
		? actionData.jdd.damage_formulas
		: [];
	const damageParts = formulas
		.map((formulaData) => {
			const formulaText = String(formulaData?.formula ?? "").trim();
			const statKey = String(formulaData?.stat ?? "none");
			if (!formulaText && statKey === "none") return "";

			if (statKey === "none") return formulaText;

			const statBonus = getActorStatValue(item, statKey);
			const statText = formatSignedNumber(statBonus);
			if (!formulaText) return statText;
			return `${formulaText}${statText}`;
		})
		.filter(Boolean)
		.join(" + ");

	return damageParts ? `JdD ${damageParts}` : "JdD";
};

const buildActionRightSummaryRows = (actionData) => {
	const rows = [];
	const requirementSummary = buildActionRequirementSummary(actionData);
	if (requirementSummary) rows.push(requirementSummary);

	const cooldownSummary = buildActionCdSummary(actionData);
	const usesSummary = buildActionUsesSummary(actionData);
	const costRow = [cooldownSummary, usesSummary].filter(Boolean).join(", ");
	if (costRow) rows.push(costRow);

	return rows;
};

const buildEmbeddedActionDetailRows = (item, actionData, config) => {
	const coreSummary = buildActionCoreSummary(item, actionData, config);
	const concentrationSummary = buildActionConcentrationSummary(actionData, config);
	const detailRow1 = concentrationSummary
		? (coreSummary ? `${coreSummary} ${concentrationSummary}` : concentrationSummary)
		: coreSummary;

	const detailRow2Parts = [
		buildActionRangeSummary(actionData, config),
		buildActionDamageSummary(item, actionData),
	].filter(Boolean);

	const detailRow2 = detailRow2Parts.join(" | ");
	return { detailRow1, detailRow2 };
};

const buildEmbeddedActionRows = ({ item, config }) => {
	const embeddedActions = Array.isArray(item.system?.actions) ? item.system.actions : [];

	return embeddedActions.map((actionData, index) => {
		const trimmedName = String(actionData?.name ?? "").trim();
		const defaultName = getDefaultEmbeddedActionName(item.name, index);
		const trimmedShorthand = String(actionData?.shorthand ?? "").trim();
		const defaultShorthand = getDefaultEmbeddedActionShorthand(index);
		const sourceUuid = String(actionData?.source_uuid ?? "").trim();
		const sourceVersion = String(actionData?.source_version ?? "").trim();
		const hasSource = sourceUuid.length > 0;
		const alwaysRefresh = hasSource && actionData?.always_refresh === true;
		const summaryRows = buildActionRightSummaryRows(actionData);
		const { detailRow1, detailRow2 } = buildEmbeddedActionDetailRows(
			item,
			actionData,
			config,
		);

		return {
			index,
			defaultName,
			defaultShorthand,
			displayName: trimmedName || defaultName,
			displayShorthand: trimmedShorthand || defaultShorthand,
			hasSource,
			sourceUuid,
			sourceVersion,
			alwaysRefresh,
			resourceSummary: buildActionResourceSummary({ actionData, config }),
			summaryRows,
			detailRow1,
			detailRow2,
		};
	});
};

export const buildActionableContext = ({ item, config }) => {
	const isActionItem = item.type === "Action";
	const hasEmbeddedActions = Array.isArray(item.system?.actions);
	const actionData = isActionItem ? item.system : null;
	const actionPath = isActionItem ? "" : "actions.0.";
	const defaultActionShorthand = getDefaultEmbeddedActionShorthand(0);
	const actionHeaderShorthand =
		String(item.system?.shorthand ?? "").trim() || defaultActionShorthand;
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

	return {
		isActionItem,
		actionData,
		actionPath,
		defaultActionShorthand,
		actionHeaderShorthand,
		hasActionable,
		showEmbeddedActionsTab,
		embeddedActions,
		embeddedActionsCount,
		canAddEmbeddedAction,
		maxEmbeddedActions: MAX_EMBEDDED_ACTIONS,
		embeddedActionsTabLabel,
		isActionModeIncant: actionMode === "incant",
		isActionModePhysical: actionMode === "physical",
		effectTextSource,
		noteTextSource,
		noteHasContent,
	};
};
