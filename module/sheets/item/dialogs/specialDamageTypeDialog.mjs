const { DialogV2 } = foundry.applications.api;

const SPECIAL_DAMAGE_SENTINEL = "__special_damage_type__";

const escapeHtml = (value) => foundry.utils.escapeHTML(String(value ?? ""));

const getSelectedFusionComponents = (selectedType) => {
	const components = CONFIG.nalfa?.fusion_damage_type_components?.[selectedType];
	if (!Array.isArray(components) || components.length !== 2) {
		return ["none", "none"];
	}

	return components.map((component) => String(component ?? "none").trim() || "none");
};

const getBasicDamageTypeEntries = () => {
	const damageTypes = CONFIG.nalfa?.base_standard_damage_types ?? {};
	return Object.entries(damageTypes).filter(([type]) => type !== "none");
};

const buildDamageTypeOptions = (selectedType) => {
	const fusionTypes = CONFIG.nalfa?.fusion_damage_types ?? {};
	const entries = Object.entries(fusionTypes);
	const placeholderSelected = entries.some(([type]) => type === selectedType)
		? ""
		: " selected";

	const options = [
		`<option value="none"${placeholderSelected}>Aucun</option>`,
		...entries.map(([type, label]) => {
			const selected = type === selectedType ? " selected" : "";
			return `<option value="${escapeHtml(type)}"${selected}>${escapeHtml(label)}</option>`;
		}),
	];

	return options.join("");
};

const buildBasicDamageTypeOptions = (selectedType = "none") => {
	const entries = getBasicDamageTypeEntries();
	const hasSelected = entries.some(([type]) => type === selectedType);
	const placeholderSelected = hasSelected ? "" : " selected";

	const options = [
		`<option value="none"${placeholderSelected}>Aucun</option>`,
		...entries.map(([type, label]) => {
			const selected = type === selectedType ? " selected" : "";
			return `<option value="${escapeHtml(type)}"${selected}>${escapeHtml(label)}</option>`;
		}),
	];

	return options.join("");
};

const getSelectedMode = (dialog) => {
	const selectedMode = dialog.element?.querySelector("input[name='special-damage-mode']:checked");
	return selectedMode instanceof HTMLInputElement ? selectedMode.value : "list";
};

const getSelectedPair = (dialog) => {
	const firstSelect = dialog.element?.querySelector("[name='special-damage-part-a']");
	const secondSelect = dialog.element?.querySelector("[name='special-damage-part-b']");

	const firstType =
		firstSelect instanceof HTMLSelectElement
			? String(firstSelect.value ?? "none").trim() || "none"
			: "none";
	const secondType =
		secondSelect instanceof HTMLSelectElement
			? String(secondSelect.value ?? "none").trim() || "none"
			: "none";

	return [firstType, secondType];
};

const resolveFusionFromPair = (firstType, secondType) => {
	if (firstType === "none" || secondType === "none") return "none";

	const fusionTypes = CONFIG.nalfa?.fusion_damage_type_components ?? {};
	for (const [fusionType, components] of Object.entries(fusionTypes)) {
		if (!Array.isArray(components) || components.length !== 2) continue;

		const [left, right] = components.map(
			(component) => String(component ?? "none").trim() || "none",
		);
		if (
			(left === firstType && right === secondType) ||
			(left === secondType && right === firstType)
		) {
			return fusionType;
		}
	}

	return "none";
};

const getSelectedDamageType = (dialog) => {
	if (getSelectedMode(dialog) === "pair") {
		const [firstType, secondType] = getSelectedPair(dialog);
		return resolveFusionFromPair(firstType, secondType);
	}

	const select = dialog.element?.querySelector("[name='special-damage-type']");
	if (!(select instanceof HTMLSelectElement)) return "none";

	const selectedType = String(select.value ?? "none").trim() || "none";
	return CONFIG.nalfa?.fusion_damage_types?.[selectedType] ? selectedType : "none";
};

const updateResolvedPreview = (dialog) => {
	const preview = dialog.element?.querySelector("[data-special-damage-result]");
	if (!(preview instanceof HTMLElement)) return;

	const mode = getSelectedMode(dialog);
	const [firstType, secondType] = getSelectedPair(dialog);
	const resolvedType = getSelectedDamageType(dialog);
	const resolvedLabel =
		resolvedType !== "none"
			? (CONFIG.nalfa?.fusion_damage_types?.[resolvedType] ?? "")
			: firstType === "none" || secondType === "none"
				? ""
				: "Non reconnu";

	preview.hidden = mode !== "pair";
	preview.textContent = `Type spécial : ${resolvedLabel}`;

	const confirmButton = dialog.element?.querySelector("button[data-action='confirm']");
	if (confirmButton instanceof HTMLButtonElement) {
		confirmButton.disabled = resolvedType === "none";
	}
};

const updateModeState = (dialog) => {
	const mode = getSelectedMode(dialog);
	const listSections = dialog.element?.querySelectorAll(
		"[data-special-damage-section='list']",
	);
	const pairSections = dialog.element?.querySelectorAll(
		"[data-special-damage-section='pair']",
	);

	listSections?.forEach((section) => {
		if (section instanceof HTMLElement) {
			section.hidden = mode !== "list";
		}
	});

	pairSections?.forEach((section) => {
		if (section instanceof HTMLElement) {
			section.hidden = mode !== "pair";
		}
	});

	const focusSelector =
		mode === "pair"
			? "[name='special-damage-part-a']"
			: "[name='special-damage-type']";
	const focusTarget = dialog.element?.querySelector(focusSelector);
	if (focusTarget instanceof HTMLElement) {
		window.setTimeout(() => focusTarget.focus(), 0);
	}

	updateResolvedPreview(dialog);
};

export const getSpecialDamageTypeSentinel = () => SPECIAL_DAMAGE_SENTINEL;

export const chooseSpecialDamageType = async (selectedType = "none") => {
	const [selectedPartA, selectedPartB] = getSelectedFusionComponents(selectedType);
	const content = `
		<form class="nalfa-special-damage-type-dialog">
			<label class="field field--inline">
				<input type="radio" name="special-damage-mode" value="list" checked />
				<span class="field__label">Choisir dans la liste</span>
			</label>
			<div class="field field--inline" data-special-damage-section="list">
				<label class="field__label" for="nalfa-special-damage-type">Type spécial</label>
				<select id="nalfa-special-damage-type" name="special-damage-type">
					${buildDamageTypeOptions(selectedType)}
				</select>
			</div>
			<label class="field field--inline">
				<input type="radio" name="special-damage-mode" value="pair" />
				<span class="field__label">Composer avec 2 types</span>
			</label>
			<div class="field field--inline" data-special-damage-section="pair" hidden>
				<label class="field__label" for="nalfa-special-damage-part-a">Type 1</label>
				<select id="nalfa-special-damage-part-a" name="special-damage-part-a">
					${buildBasicDamageTypeOptions(selectedPartA)}
				</select>
			</div>
			<div class="field field--inline" data-special-damage-section="pair" hidden>
				<label class="field__label" for="nalfa-special-damage-part-b">Type 2</label>
				<select id="nalfa-special-damage-part-b" name="special-damage-part-b">
					${buildBasicDamageTypeOptions(selectedPartB)}
				</select>
			</div>
			<span data-special-damage-result hidden>Type spécial : </span>
		</form>
	`;

	return new Promise((resolve) => {
		let settled = false;
		const settle = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		const dialog = new DialogV2({
			classes: ["nalfa", "sheet", "nalfa-special-damage-type-dialog"],
			window: {
				title: "Choisir un type spécial",
			},
			content,
			buttons: [
				{
					action: "cancel",
					label: "Annuler",
					callback: () => "none",
				},
				{
					action: "confirm",
					label: "Choisir",
					default: true,
					callback: (event, target, dialogInstance) => {
						void event;
						void target;
						return getSelectedDamageType(dialogInstance);
					},
				},
			],
			submit: (result) => {
				const nextType = String(result ?? "none").trim() || "none";
				settle(nextType);
			},
		});

		dialog.addEventListener("close", () => settle("none"));
		dialog.addEventListener("render", () => {
			dialog.element
				?.querySelectorAll("input[name='special-damage-mode']")
				.forEach((input) => {
					input.addEventListener("change", () => updateModeState(dialog));
				});
			dialog.element
				?.querySelectorAll(
					"select[name='special-damage-type'], select[name='special-damage-part-a'], select[name='special-damage-part-b']",
				)
				.forEach((input) => {
					input.addEventListener("change", () => updateResolvedPreview(dialog));
				});

			updateModeState(dialog);
		});

		dialog.render({ force: true });
	});
};
