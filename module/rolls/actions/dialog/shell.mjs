import { buildEmbeddedActionRow } from "../../../sheets/item/context/actions.mjs";
import { buildTargetInfoHtml } from "./targets.mjs";

export const renderActionDialogContent = async ({
	actor,
	actionData,
	sourceItem,
	rollContext,
	titleName,
}) => {
	if (!(sourceItem instanceof Item)) {
		return `<p>${foundry.utils.escapeHTML(titleName)}</p>`;
	}

	const targetInfoHtml = buildTargetInfoHtml({ actor, actionData, rollContext, titleName });

	const embeddedAction = buildEmbeddedActionRow({
		item: sourceItem,
		actionData,
		index: 0,
		config: CONFIG.nalfa,
	});

	const actionHtml = await foundry.applications.handlebars.renderTemplate(
		"systems/nalfa/templates/partials/item/integrated-action.hbs",
		{
			embeddedAction,
			item: sourceItem,
			itemImage: sourceItem.img,
			rollTargetInfoHtml: "",
			showIcon: true,
			enableDrag: false,
			readonly: true,
			rollable: false,
			isEditable: false,
		},
	);

	return `${actionHtml}<section class="panel-section nalfa-action-dialog__targets"><div class="nalfa-action-dialog__targets-content">${targetInfoHtml}</div></section>`;
};
