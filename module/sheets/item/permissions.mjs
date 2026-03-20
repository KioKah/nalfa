export const canManageItemSheetRules = (sheet) => {
	return Boolean(sheet?.isEditable) && game.user?.isGM === true;
};

export const canRollItemSheet = (item) => {
	return item?.isOwner === true;
};

export const applyReadonlyItemSections = (root) => {
	root?.querySelectorAll("[data-readonly-section='true']").forEach((section) => {
		section.querySelectorAll("button, input, select, textarea").forEach((element) => {
			element.disabled = true;
		});

		section.querySelectorAll("img[data-edit]").forEach((image) => {
			image.classList.add("disabled");
		});
	});
};
