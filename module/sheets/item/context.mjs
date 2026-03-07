import {
	ITEM_TYPES_WITH_MODIFIERS,
	ITEM_TYPES_WITH_PHYSICAL,
	ITEM_TYPES_WITH_SPECIFIC,
	PRIMARY_TAB_GROUP,
} from "./constants.mjs";
import {
	MAX_EMBEDDED_ACTIONS,
	getDefaultEmbeddedActionName,
	getDefaultEmbeddedActionShorthand,
} from "../../embeddedActions.mjs";
import {
	getEquippedOptions,
	getEquippedSlotValue,
	isEquippedSlotLocked,
} from "./equipment.mjs";

const DEFAULT_ITEM_ICON = "icons/svg/item-bag.svg";

const buildVisibleTabs = ({
	embeddedActionsTabLabel,
	activeTab,
	hasSpecific,
	isIdentificationLocked,
	item,
	rawTabs,
	showModifiersTab,
	showEmbeddedActionsTab,
}) => {
	const tabIds = [];
	if (isIdentificationLocked) {
		tabIds.push("description");
	} else {
		if (hasSpecific) tabIds.push("specific");
		if (showEmbeddedActionsTab) tabIds.push("actionable");
		if (showModifiersTab) tabIds.push("modifiers");
		tabIds.push("description");
	}

	const resolvedActiveTab = tabIds.includes(activeTab) ? activeTab : tabIds[0];
	const specificTabLabel = item.type;
	const tabs = {};

	for (const tabId of tabIds) {
		const tab = rawTabs[tabId] ?? { id: tabId };
		const tabLabel =
			tabId === "specific"
				? specificTabLabel
				: tabId === "actionable"
					? embeddedActionsTabLabel
					: tab.label;
		tabs[tabId] = {
			...tab,
			label: tabLabel,
			cssClass: tabId === resolvedActiveTab ? "active" : "",
		};
	}

	return {
		tabs,
		activeTab: resolvedActiveTab,
	};
};

const getDescriptionData = (item) => {
	const descriptionData = item.system?.description ?? {};
	return {
		descriptionValue:
			typeof descriptionData === "string" ? descriptionData : (descriptionData.text ?? ""),
		loretextValue:
			typeof descriptionData === "string" ? "" : (descriptionData.loretext ?? ""),
	};
};

const getItemImage = (item) => {
	const defaultItemIcon = item.constructor?.DEFAULT_ICON ?? DEFAULT_ITEM_ICON;
	const defaultArtwork = item.constructor?.getDefaultArtwork?.(item.toObject()) ?? {};
	return item.img === defaultItemIcon ? (defaultArtwork.img ?? item.img) : item.img;
};

const resolveModifierCategory = ({
	category,
	modifierPath,
	pathCategories,
	pathsByCategory,
	defaultCategory,
}) => {
	if (category && Object.hasOwn(pathsByCategory, category)) {
		return category;
	}

	for (const [categoryKey, groupPaths] of Object.entries(pathsByCategory)) {
		if (Object.hasOwn(groupPaths, modifierPath)) {
			return categoryKey;
		}
	}

	if (Object.hasOwn(pathsByCategory, defaultCategory)) {
		return defaultCategory;
	}

	const firstCategory = Object.keys(pathCategories)[0] ?? "";
	return Object.hasOwn(pathsByCategory, firstCategory) ? firstCategory : "";
};

const buildModifierRows = ({ modifiers, config }) => {
	const pathCategories = config.modifier_path_categories ?? {};
	const pathsByCategory = config.modifier_base_paths_by_category ?? {};
	const defaultCategory = Object.keys(pathCategories)[0] ?? "";

	return modifiers.map((modifier) => {
		const selectedPath = String(modifier.path ?? "").trim();
		const category = resolveModifierCategory({
			category: modifier.category,
			modifierPath: selectedPath,
			pathCategories,
			pathsByCategory,
			defaultCategory,
		});

		const categoryPaths = pathsByCategory[category] ?? {};
		const resolvedPath = Object.hasOwn(categoryPaths, selectedPath) ? selectedPath : "";

		return {
			...modifier,
			resolvedCategory: category,
			resolvedPath,
		};
	});
};

const htmlToPlainText = (value, { preserveLineBreaks = false } = {}) => {
	const html = String(value ?? "");
	if (!html) return "";

	const container = document.createElement("div");
	container.innerHTML = html;

	if (!preserveLineBreaks) {
		return String(container.textContent ?? "")
			.replace(/\s+/g, " ")
			.trim();
	}

	for (const element of container.querySelectorAll("br")) {
		element.replaceWith(document.createTextNode("\n"));
	}

	for (const element of container.querySelectorAll("p, div, li")) {
		if (element.lastChild?.nodeType !== Node.TEXT_NODE) {
			element.append(document.createTextNode("\n"));
			continue;
		}

		const text = element.lastChild.textContent ?? "";
		if (!text.endsWith("\n")) {
			element.lastChild.textContent = `${text}\n`;
		}
	}

	return String(container.textContent ?? "")
		.replace(/\r/g, "")
		.replace(/[ \t\f\v]+/g, " ")
		.replace(/[ \t\f\v]*\n[ \t\f\v]*/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
};

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

const toFiniteNumber = (value, fallback = 0) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

const formatSignedNumber = (value) => {
	const number = toFiniteNumber(value, 0);
	return number >= 0 ? `+${number}` : `${number}`;
};

const getActorStatValue = (item, statKey) => {
	if (!statKey || statKey === "none") return 0;

	const actor = item.actor ?? item.parent ?? null;
	const actorSystem = actor?.system ?? {};
	const rollStatValue = actorSystem?.roll_stats?.[statKey]?.value;
	if (Number.isFinite(Number(rollStatValue))) return Number(rollStatValue);

	const statValue = actorSystem?.stats?.[statKey]?.value;
	if (Number.isFinite(Number(statValue))) return Number(statValue);

	return 0;
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
	const requiresText = htmlToPlainText(actionData?.requires ?? "");
	if (!requiresText) return "";
	return requiresText;
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
	return `(JdF ${dd} ${statLabel}-StatAttaquant)`;
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
		const storedName = String(actionData?.name ?? "");
		const trimmedName = storedName.trim();
		const defaultName = getDefaultEmbeddedActionName(item.name, index);
		const storedShorthand = String(actionData?.shorthand ?? "");
		const trimmedShorthand = storedShorthand.trim();
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

export const buildItemSheetContext = async ({ baseData, config, sheet, textEditor }) => {
	const item = baseData.document;
	const rawTabs = sheet._prepareTabs(PRIMARY_TAB_GROUP);
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
	const isCurrencyItem = item.type === "Currency";
	const hasSpecific = ITEM_TYPES_WITH_SPECIFIC.has(item.type);
	const hasModifiers = ITEM_TYPES_WITH_MODIFIERS.has(item.type);
	const hasPhysical = ITEM_TYPES_WITH_PHYSICAL.has(item.type);
	const showModifiersTab = hasModifiers && Array.isArray(item.system?.modifiers);
	const identificationData = isCurrencyItem ? undefined : item.system?.identification;
	const needsIdentification = identificationData?.needs_identification ?? false;
	const isIdentificationLocked =
		needsIdentification === true && identificationData?.identified !== true;

	const { tabs, activeTab } = buildVisibleTabs({
		embeddedActionsTabLabel,
		activeTab: sheet.tabGroups?.[PRIMARY_TAB_GROUP],
		hasSpecific,
		isIdentificationLocked,
		item,
		rawTabs,
		showModifiersTab,
		showEmbeddedActionsTab,
	});

	const { descriptionValue, loretextValue } = getDescriptionData(item);
	const unidentifiedDescription =
		item.system?.identification?.unidentified?.description ?? "";
	const unidentifiedLoretext = item.system?.identification?.unidentified?.loretext ?? "";
	const useUnidentifiedPresentation =
		needsIdentification === true && identificationData?.identified !== true;
	const currentDescriptionNamePath = useUnidentifiedPresentation
		? "system.identification.unidentified.description"
		: "system.description.text";
	const currentDescriptionEnriched = useUnidentifiedPresentation
		? await textEditor.enrichHTML(unidentifiedDescription, { async: true })
		: await textEditor.enrichHTML(descriptionValue, { async: true });
	const currentDescriptionLabel = "Description";
	const currentLoretextNamePath = useUnidentifiedPresentation
		? "system.identification.unidentified.loretext"
		: "system.description.loretext";
	const currentLoretextEnriched = useUnidentifiedPresentation
		? await textEditor.enrichHTML(unidentifiedLoretext, { async: true })
		: await textEditor.enrichHTML(loretextValue, { async: true });
	const currentLoretextLabel = "Loretext";

	const actionMode = actionData?.mode ?? "physical";
	const isActionModeIncant = actionMode === "incant";
	const isActionModePhysical = actionMode === "physical";
	const effectTextSource = actionData?.effect?.text ?? "";
	const noteTextSource = actionData?.cost?.actions?.note ?? "";
	const noteHasContent = htmlToPlainText(noteTextSource).length > 0;
	const equippableState = item.system?.equippable ?? {};
	const equippedState = item.system?.equipped ?? {};
	const equippedSlot = getEquippedSlotValue(equippedState, equippableState);
	const equippedOptions = getEquippedOptions(equippableState);
	const isEquipLocked = isEquippedSlotLocked(item.system);
	const modifiers = Array.isArray(item.system?.modifiers) ? item.system.modifiers : [];
	const modifierRows = buildModifierRows({ modifiers, config });

	return {
		activeTab,
		sheetData: {
			isOwner: sheet.item.isOwner,
			isEditable: sheet.isEditable,
			item,
			itemImage: getItemImage(item),
			sysData: item.system,
			isActionItem,
			tabs,
			hasActionable,
			showEmbeddedActionsTab,
			embeddedActions,
			embeddedActionsCount,
			canAddEmbeddedAction,
			maxEmbeddedActions: MAX_EMBEDDED_ACTIONS,
			hasModifiers,
			showModifiersTab,
			modifierRows,
			actionData,
			actionPath,
			defaultActionShorthand,
			actionHeaderShorthand,
			isCurrencyItem,
			isActionModeIncant,
			isActionModePhysical,
			hasSpecific,
			hasPhysical,
			hasRarity: item.system?.rarity !== undefined,
			hasIdentification: !isCurrencyItem && item.system?.identification !== undefined,
			hasRecommendedLevel: item.system?.recommended_level !== undefined,
			isIdentificationLocked,
			useUnidentifiedPresentation,
			currentDescriptionNamePath,
			currentDescriptionEnriched,
			currentDescriptionLabel,
			currentLoretextNamePath,
			currentLoretextEnriched,
			currentLoretextLabel,
			equippedSlot,
			equippedOptions,
			isEquipLocked,
			descriptionValue,
			loretextValue,
			config,
			noteHasContent,
			enrichedHTML: {
				description: {
					loretext: await textEditor.enrichHTML(loretextValue, {
						async: true,
					}),
				},
				effect: {
					text: await textEditor.enrichHTML(effectTextSource, {
						async: true,
					}),
				},
				note: await textEditor.enrichHTML(noteTextSource, {
					async: true,
				}),
			},
		},
	};
};
