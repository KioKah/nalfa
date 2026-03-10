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

export const buildModifierRows = ({ modifiers, config }) => {
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
