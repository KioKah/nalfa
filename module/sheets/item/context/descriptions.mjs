export const getDescriptionData = (item) => {
	const descriptionData = item.system?.description ?? {};
	return {
		descriptionValue:
			typeof descriptionData === "string"
				? descriptionData
				: (descriptionData.text ?? ""),
		loretextValue:
			typeof descriptionData === "string" ? "" : (descriptionData.loretext ?? ""),
	};
};

export const buildDescriptionContext = async ({
	item,
	textEditor,
	descriptionValue,
	loretextValue,
	identificationData,
	needsIdentification,
}) => {
	const unidentifiedDescription =
		item.system?.identification?.unidentified?.description ?? "";
	const unidentifiedLoretext = item.system?.identification?.unidentified?.loretext ?? "";
	const useUnidentifiedPresentation =
		needsIdentification === true && identificationData?.identified !== true;
	const currentDescriptionNamePath = useUnidentifiedPresentation
		? "system.identification.unidentified.description"
		: "system.description.text";
	const currentLoretextNamePath = useUnidentifiedPresentation
		? "system.identification.unidentified.loretext"
		: "system.description.loretext";
	const [currentDescriptionEnriched, currentLoretextEnriched] = await Promise.all([
		textEditor.enrichHTML(
			useUnidentifiedPresentation ? unidentifiedDescription : descriptionValue,
			{ async: true },
		),
		textEditor.enrichHTML(useUnidentifiedPresentation ? unidentifiedLoretext : loretextValue, {
			async: true,
		}),
	]);

	return {
		useUnidentifiedPresentation,
		currentDescriptionNamePath,
		currentDescriptionEnriched,
		currentDescriptionLabel: "Description",
		currentDescriptionEditTooltip: "Modifier la description",
		currentLoretextNamePath,
		currentLoretextEnriched,
		currentLoretextLabel: "Loretext",
		currentLoretextEditTooltip: "Modifier le loretext",
	};
};
