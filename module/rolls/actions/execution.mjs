import {
	rollAttackFromAction,
	rollConcentrationFromAction,
	rollDamageSetFromAction,
	rollSavePromptFromAction,
} from "../index.mjs";
import { buildEmbeddedActionRow } from "../../sheets/item/context/actions.mjs";

const { DialogV2 } = foundry.applications.api;

const ACTION_DIALOG_CLASSES = ["nalfa", "sheet", "nalfa-action-dialog"];
const PREVIEW_LAYER_NAME = "nalfa-action-preview";
const TARGET_STATUS_COLORS = Object.freeze({
	ok: 0x3fb950,
	disadvantage: 0xd29922,
	impossible: 0xf85149,
	source: 0x58a6ff,
});

const formatDistance = (distance) => {
	if (!Number.isFinite(distance)) return "?";
	return `${Number(distance.toFixed(2))}`;
};

const getSourceToken = (actor) => {
	const controlledTokens = Array.isArray(canvas?.tokens?.controlled)
		? canvas.tokens.controlled
		: [];
	const controlledToken = controlledTokens.find((token) => token?.actor === actor);
	if (controlledToken) return controlledToken;

	if (actor?.getActiveTokens instanceof Function) {
		const activeTokens = actor.getActiveTokens(false, true);
		if (Array.isArray(activeTokens) && activeTokens.length > 0) {
			return activeTokens[0];
		}
	}

	return controlledTokens[0] ?? null;
};

const getTokenDistance = (sourceToken, targetToken) => {
	const sourcePoint = sourceToken?.center;
	const targetPoint = targetToken?.center;
	if (!sourcePoint || !targetPoint || !canvas?.grid?.measurePath) return null;

	const measurement = canvas.grid.measurePath([sourcePoint, targetPoint]);
	if (Number.isFinite(measurement?.distance)) return measurement.distance;
	if (Number.isFinite(measurement?.cost)) return measurement.cost;

	const lastSegment = Array.isArray(measurement?.segments)
		? measurement.segments.at(-1)
		: null;
	if (Number.isFinite(lastSegment?.distance)) return lastSegment.distance;
	if (Number.isFinite(lastSegment?.cost)) return lastSegment.cost;

	return null;
};

const getPointDelta = (sourceToken, targetToken) => {
	const sourcePoint = sourceToken?.center;
	const targetPoint = targetToken?.center;
	if (!sourcePoint || !targetPoint) return null;

	return {
		x: targetPoint.x - sourcePoint.x,
		y: targetPoint.y - sourcePoint.y,
	};
};

const getSceneUnitsPerPixel = () => {
	const gridDistance = Number(canvas?.grid?.distance ?? 0);
	const gridSize = Number(canvas?.grid?.size ?? 0);
	if (!(gridDistance > 0) || !(gridSize > 0)) return null;
	return gridDistance / gridSize;
};

const getScenePixelsPerUnit = () => {
	const unitsPerPixel = getSceneUnitsPerPixel();
	if (!Number.isFinite(unitsPerPixel) || !(unitsPerPixel > 0)) return null;
	return 1 / unitsPerPixel;
};

const getLineWidthAtAngle = ({ sourceToken, targets, angleDegrees }) => {
	const unitsPerPixel = getSceneUnitsPerPixel();
	if (!Number.isFinite(unitsPerPixel)) return null;

	const angleRadians = (angleDegrees * Math.PI) / 180;
	const directionX = Math.cos(angleRadians);
	const directionY = Math.sin(angleRadians);
	const normalX = -Math.sin(angleRadians);
	const normalY = Math.cos(angleRadians);
	let maxOffset = 0;

	for (const targetToken of targets) {
		const delta = getPointDelta(sourceToken, targetToken);
		if (!delta) return null;

		const forwardProjectionPixels = delta.x * directionX + delta.y * directionY;
		if (forwardProjectionPixels < 0) return null;

		const perpendicularOffsetPixels = Math.abs(
			delta.x * normalX + delta.y * normalY,
		);
		const perpendicularOffset = perpendicularOffsetPixels * unitsPerPixel;
		if (perpendicularOffset > maxOffset) maxOffset = perpendicularOffset;
	}

	return maxOffset * 2;
};

const normalizeDirectionDegrees = (angleDegrees) => {
	let angle = angleDegrees % 360;
	if (angle < 0) angle += 360;
	return angle;
};

const getTargetAngleDegrees = (sourceToken, targetToken) => {
	const delta = getPointDelta(sourceToken, targetToken);
	if (!delta) return null;
	return (Math.atan2(delta.y, delta.x) * 180) / Math.PI;
};

const getCandidateLineAngles = ({ sourceToken, targets }) => {
	const rawAngles = targets
		.map((targetToken) => getTargetAngleDegrees(sourceToken, targetToken))
		.filter(Number.isFinite)
		.map((angle) => normalizeDirectionDegrees(angle))
		.sort((left, right) => left - right);

	if (rawAngles.length === 0) return [];

	const candidates = new Set(rawAngles.map((angle) => angle.toFixed(6)));
	for (let index = 0; index < rawAngles.length; index += 1) {
		const currentAngle = rawAngles[index];
		const nextAngle = rawAngles[(index + 1) % rawAngles.length];
		const wrappedNextAngle = index + 1 < rawAngles.length ? nextAngle : nextAngle + 360;
		const midpoint = normalizeDirectionDegrees((currentAngle + wrappedNextAngle) / 2);
		candidates.add(midpoint.toFixed(6));
	}

	return Array.from(candidates, (value) => Number(value));
};

const getBestLineFit = ({ sourceToken, targets }) => {
	const candidateAngles = getCandidateLineAngles({ sourceToken, targets });
	let bestFit = null;

	for (const angleDegrees of candidateAngles) {
		const width = getLineWidthAtAngle({ sourceToken, targets, angleDegrees });
		if (!Number.isFinite(width)) continue;
		if (!bestFit || width < bestFit.width) {
			bestFit = {
				angleDegrees,
				width,
			};
		}
	}

	return bestFit;
};

const getBestConeFit = ({ sourceToken, targets }) => {
	const targetAngles = targets
		.map((targetToken) => getTargetAngleDegrees(sourceToken, targetToken))
		.filter(Number.isFinite)
		.map((angle) => normalizeDirectionDegrees(angle))
		.sort((left, right) => left - right);

	if (targetAngles.length === 0) return null;
	if (targetAngles.length === 1) {
		return {
			directionDegrees: targetAngles[0],
			angle: 0,
		};
	}

	let largestGap = -1;
	let gapStartAngle = targetAngles[0];
	let gapEndAngle = targetAngles[0];

	for (let index = 0; index < targetAngles.length; index += 1) {
		const currentAngle = targetAngles[index];
		const nextAngle = targetAngles[(index + 1) % targetAngles.length];
		const wrappedNextAngle = index + 1 < targetAngles.length ? nextAngle : nextAngle + 360;
		const gap = wrappedNextAngle - currentAngle;
		if (gap > largestGap) {
			largestGap = gap;
			gapStartAngle = currentAngle;
			gapEndAngle = wrappedNextAngle;
		}
	}

	const requiredAngle = 360 - largestGap;
	const coveringStart = gapEndAngle;
	const directionDegrees = normalizeDirectionDegrees(coveringStart + requiredAngle / 2);

	return {
		directionDegrees,
		angle: requiredAngle,
		gapStartAngle,
		gapEndAngle,
	};
};

const getConeNote = ({ sourceToken, actionData, targets }) => {
	if (targets.length < 2) return "";

	const shape = String(actionData?.selection?.zone?.shape ?? "circle");
	if (shape !== "cone") return "";

	const maxAngle = Number(actionData?.selection?.zone?.range_secondary ?? 0);
	if (!(maxAngle > 0)) return "";

	const bestFit = getBestConeFit({ sourceToken, targets });
	if (Number.isFinite(bestFit?.angle) && bestFit.angle > maxAngle) {
		return `Impossible : Cône trop large (${formatDistance(bestFit.angle)}deg > ${formatDistance(maxAngle)}deg) !`;
	}

	return "";
};

const getLineNote = ({ sourceToken, actionData, targets }) => {
	if (targets.length < 2) return "";

	const shape = String(actionData?.selection?.zone?.shape ?? "circle");
	if (shape !== "line") return "";

	const maxWidth = Number(actionData?.selection?.zone?.range_secondary ?? 0);
	if (!(maxWidth > 0)) return "";

	const bestFit = getBestLineFit({ sourceToken, targets });
	if (!bestFit) {
		return "Impossible : Cibles trop écartées !";
	}

	if (Number.isFinite(bestFit?.width) && bestFit.width > maxWidth) {
		if (bestFit.width > maxWidth * 1.5 && bestFit.width > maxWidth + 2) {
			return "Impossible : Cibles trop écartées !";
		}

		return `Impossible : Ligne trop large (${formatDistance(bestFit.width)}m > ${formatDistance(maxWidth)}m) !`;
	}

	return "";
};

const getTargetStatus = (note) => {
	if (note.startsWith("Impossible")) return "impossible";
	if (note.startsWith("Désavantage")) return "disadvantage";
	return "ok";
};

const getActionMaxRange = (actionData) => {
	const zone = actionData?.selection?.zone ?? {};
	const range = Number(zone.range ?? 0);
	const hasLongRange = zone.has_long_range === true;
	const longRange = Number(zone.long_range ?? 0);
	if (hasLongRange && longRange > range) return longRange;
	return range;
};

const createPreviewContainer = () => {
	const container = new PIXI.Container();
	container.name = PREVIEW_LAYER_NAME;
	container.eventMode = "none";
	canvas.stage.addChild(container);
	return container;
};

const destroyPreviewContainer = (container) => {
	if (!container) return;
	container.removeChildren().forEach((child) => child.destroy?.());
	container.destroy({ children: true });
};

const drawTokenMarker = ({ graphics, token, color, thickness = 4, alpha = 1 }) => {
	if (!token) return;
	const radius = Math.max(Number(token.w ?? 0), Number(token.h ?? 0), 24) * 0.4;
	graphics.circle(token.center.x, token.center.y, radius);
	graphics.stroke({ color, width: thickness, alpha });
};

const drawTargetLinks = ({ graphics, sourceToken, targets }) => {
	for (const target of targets) {
		graphics.moveTo(sourceToken.center.x, sourceToken.center.y);
		graphics.lineTo(target.token.center.x, target.token.center.y);
		graphics.stroke({
			color: TARGET_STATUS_COLORS[target.status],
			width: 2,
			alpha: 0.65,
		});
	}
};

const drawLinePreview = ({ graphics, sourceToken, actionData, lineFit, isInvalid }) => {
	if (!lineFit || !Number.isFinite(lineFit.angleDegrees)) return;
	const pixelsPerUnit = getScenePixelsPerUnit();
	if (!Number.isFinite(pixelsPerUnit)) return;

	const widthUnits = Number(actionData?.selection?.zone?.range_secondary ?? 0);
	const lengthUnits = getActionMaxRange(actionData);
	if (!(widthUnits > 0) || !(lengthUnits > 0)) return;

	const widthPixels = widthUnits * pixelsPerUnit;
	const lengthPixels = lengthUnits * pixelsPerUnit;
	const angleRadians = (lineFit.angleDegrees * Math.PI) / 180;
	const directionX = Math.cos(angleRadians);
	const directionY = Math.sin(angleRadians);
	const normalX = -directionY;
	const normalY = directionX;
	const start = sourceToken.center;
	const end = {
		x: start.x + directionX * lengthPixels,
		y: start.y + directionY * lengthPixels,
	};
	const halfWidth = widthPixels / 2;
	const points = [
		start.x + normalX * halfWidth,
		start.y + normalY * halfWidth,
		start.x - normalX * halfWidth,
		start.y - normalY * halfWidth,
		end.x - normalX * halfWidth,
		end.y - normalY * halfWidth,
		end.x + normalX * halfWidth,
		end.y + normalY * halfWidth,
	];
	const color = isInvalid ? TARGET_STATUS_COLORS.impossible : TARGET_STATUS_COLORS.ok;
	graphics.poly(points);
	graphics.fill({ color, alpha: 0.12 });
	graphics.stroke({ color, width: 2.5, alpha: 0.75 });
};

const drawConePreview = ({ graphics, sourceToken, actionData, coneFit, isInvalid }) => {
	if (!coneFit || !Number.isFinite(coneFit.directionDegrees)) return;
	const pixelsPerUnit = getScenePixelsPerUnit();
	if (!Number.isFinite(pixelsPerUnit)) return;

	const maxAngle = Number(actionData?.selection?.zone?.range_secondary ?? 0);
	const radiusUnits = getActionMaxRange(actionData);
	if (!(maxAngle > 0) || !(radiusUnits > 0)) return;

	const radiusPixels = radiusUnits * pixelsPerUnit;
	const halfAngleRadians = ((maxAngle / 2) * Math.PI) / 180;
	const directionRadians = (coneFit.directionDegrees * Math.PI) / 180;
	const startAngle = directionRadians - halfAngleRadians;
	const endAngle = directionRadians + halfAngleRadians;
	const color = isInvalid ? TARGET_STATUS_COLORS.impossible : TARGET_STATUS_COLORS.ok;
	graphics.moveTo(sourceToken.center.x, sourceToken.center.y);
	graphics.arc(sourceToken.center.x, sourceToken.center.y, radiusPixels, startAngle, endAngle);
	graphics.lineTo(sourceToken.center.x, sourceToken.center.y);
	graphics.fill({ color, alpha: 0.12 });
	graphics.stroke({ color, width: 2.5, alpha: 0.75 });
};

const createActionPreviewController = ({ actor, actionData }) => {
	let container = null;

	return {
		render() {
			this.cleanup();

			const sourceToken = getSourceToken(actor);
			const targetTokens = Array.from(game.user?.targets ?? []).filter(Boolean);
			if (!sourceToken || targetTokens.length === 0 || !canvas?.stage) return;

			container = createPreviewContainer();
			const sourceGraphics = new PIXI.Graphics();
			drawTokenMarker({
				graphics: sourceGraphics,
				token: sourceToken,
				color: TARGET_STATUS_COLORS.source,
				thickness: 5,
			});
			container.addChild(sourceGraphics);

			const targetStates = targetTokens.map((targetToken) => {
				const note = getDistanceNote({
					actor,
					actionData,
					distance: getTokenDistance(sourceToken, targetToken),
				});
				return {
					token: targetToken,
					note,
					status: getTargetStatus(note),
				};
			});

			const lineFit = getBestLineFit({ sourceToken, targets: targetTokens });
			const coneFit = getBestConeFit({ sourceToken, targets: targetTokens });
			const shape = String(actionData?.selection?.zone?.shape ?? "circle");
			const lineInvalid = Boolean(getLineNote({ sourceToken, actionData, targets: targetTokens }));
			const coneInvalid = Boolean(getConeNote({ sourceToken, actionData, targets: targetTokens }));

			if (shape === "line") {
				const shapeGraphics = new PIXI.Graphics();
				drawLinePreview({
					graphics: shapeGraphics,
					sourceToken,
					actionData,
					lineFit,
					isInvalid: lineInvalid,
				});
				container.addChild(shapeGraphics);
			}

			if (shape === "cone") {
				const shapeGraphics = new PIXI.Graphics();
				drawConePreview({
					graphics: shapeGraphics,
					sourceToken,
					actionData,
					coneFit,
					isInvalid: coneInvalid,
				});
				container.addChild(shapeGraphics);
			}

			const linkGraphics = new PIXI.Graphics();
			drawTargetLinks({ graphics: linkGraphics, sourceToken, targets: targetStates });
			container.addChild(linkGraphics);

			for (const targetState of targetStates) {
				const markerGraphics = new PIXI.Graphics();
				drawTokenMarker({
					graphics: markerGraphics,
					token: targetState.token,
					color: TARGET_STATUS_COLORS[targetState.status],
				});
				container.addChild(markerGraphics);
			}
		},
		cleanup() {
			destroyPreviewContainer(container);
			container = null;
		},
	};
};

const getDistanceNote = ({ actor, actionData, distance }) => {
	if (!Number.isFinite(distance)) return "";

	const rangeType = String(actionData?.range_type ?? "ranged");
	const zone = actionData?.selection?.zone ?? {};
	const reach = Number(actor?.system?.attributes?.reach?.value ?? 0);
	const range = Number(zone.range ?? 0);
	const minRange = Number(zone.min_range ?? 0);
	const hasLongRange = zone.has_long_range === true;
	const longRange = Number(zone.long_range ?? 0);
	const maxRange = hasLongRange ? longRange : range;

	if (rangeType === "melee") {
		if (reach > 0 && distance > reach) {
			return "Impossible : Trop loin !";
		}
		return "";
	}

	if (rangeType === "pure_ranged" && minRange > 0 && distance < minRange) {
		return "Impossible : Trop proche !";
	}

	if (maxRange > 0 && distance > maxRange) {
		return "Impossible : Trop loin !";
	}

	if (hasLongRange && longRange > range && distance > range) {
		return "Désavantage : Tir de loin";
	}

	if (rangeType === "ranged" && reach > 0 && distance <= reach) {
		return "Désavantage : Allonge";
	}

	return "";
};

const buildTargetInfoHtml = ({ actor, actionData }) => {
	const sourceToken = getSourceToken(actor);
	if (!sourceToken) {
		return "<p>Aucun token source sélectionné.</p>";
	}

	const targets = Array.from(game.user?.targets ?? []).filter(Boolean);
	if (targets.length === 0) {
		return "<p>Aucune cible sélectionnée.</p>";
	}

	const coneNote = foundry.utils.escapeHTML(
		getConeNote({ sourceToken, actionData, targets }),
	);
	const lineNote = foundry.utils.escapeHTML(
		getLineNote({ sourceToken, actionData, targets }),
	);

	const targetLines = targets.map((targetToken) => {
		const name = foundry.utils.escapeHTML(targetToken.name ?? "Cible");
		const distance = getTokenDistance(sourceToken, targetToken);
		const distanceLabel = formatDistance(distance);
		const note = getDistanceNote({ actor, actionData, distance });
		return {
			name,
			distanceLabel,
			note: foundry.utils.escapeHTML(note),
		};
	});

	if (targetLines.length === 1) {
		const [target] = targetLines;
		const noteSuffix = target.note ? ` ${target.note}` : "";
		const extraNotes = [coneNote, lineNote]
			.filter(Boolean)
			.map((note) => `<p>${note}</p>`)
			.join("");
		return `<p>Cible sélectionnée : ${target.name}, à ${target.distanceLabel}m.${noteSuffix}</p>${extraNotes}`;
	}

	const itemsHtml = targetLines
		.map((target) => {
			const noteSuffix = target.note ? ` ${target.note}` : "";
			return `<li>${target.name}, à ${target.distanceLabel}m.${noteSuffix}</li>`;
		})
		.join("");

	const extraNotes = [coneNote, lineNote]
		.filter(Boolean)
		.map((note) => `<p>${note}</p>`)
		.join("");
	return `<p>Cibles sélectionnées :</p><ul>${itemsHtml}</ul>${extraNotes}`;
};

const waitForActionDialog = (
	dialogConfig,
	{ closeValue = null, onRender = null, onClose = null } = {},
) => {
	return new Promise((resolve) => {
		let settled = false;
		const settle = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		const dialog = new DialogV2({
			classes: ACTION_DIALOG_CLASSES,
			...dialogConfig,
			submit: (result) => {
				settle(result);
			},
		});

		if (onRender instanceof Function) {
			dialog.addEventListener("render", () => {
				onRender(dialog);
			});
		}

		dialog.addEventListener("close", () => {
			if (onClose instanceof Function) onClose(dialog);
			settle(closeValue);
		});

		dialog.render({ force: true });
	});
};

const getActionTitle = ({ actionData = {}, sourceItem = null, titleName = "" } = {}) => {
	const explicitTitle = String(titleName ?? "").trim();
	if (explicitTitle) return explicitTitle;

	const actionName = String(actionData?.name ?? "").trim();
	if (actionName) return actionName;

	const sourceName = String(sourceItem?.name ?? "").trim();
	if (sourceName) return sourceName;

	return "Action";
};

const renderActionDialogContent = async ({ actor, actionData, sourceItem, titleName }) => {
	if (!(sourceItem instanceof Item)) {
		return `<p>${foundry.utils.escapeHTML(titleName)}</p>`;
	}

	const embeddedAction = buildEmbeddedActionRow({
		item: sourceItem,
		actionData,
		index: 0,
		config: CONFIG.nalfa,
	});

	return renderTemplate("systems/nalfa/templates/partials/item/integrated-action.hbs", {
		embeddedAction,
		item: sourceItem,
		itemImage: sourceItem.img,
		rollTargetInfoHtml: buildTargetInfoHtml({ actor, actionData }),
		showIcon: true,
		enableDrag: false,
		readonly: true,
		rollable: false,
		isEditable: false,
	});
};

const buildActionChatContext = ({ sourceItem = null, titleName = "", actionIndex = -1 }) => {
	if (!(sourceItem instanceof Item)) return null;

	const sourceItemUuid = String(sourceItem.uuid ?? "").trim();
	if (!sourceItemUuid) return null;

	const actionName = String(titleName ?? "").trim();
	const context = {
		sourceItemUuid,
	};

	if (actionName) context.actionName = actionName;
	if (Number.isInteger(actionIndex) && actionIndex >= 0) {
		context.actionIndex = actionIndex;
	}

	return context;
};

const buildActionRollChoices = ({ actor, actionData, titleName, chatContext }) => {
	const choices = [];

	if (actionData?.jdt?.enabled) {
		choices.push({
			id: "attack",
			label: "JdT",
			run: () => rollAttackFromAction(actor, actionData, { titleName, chatContext }),
		});
	}

	if (actionData?.jdd?.enabled) {
		choices.push({
			id: "damage",
			label: "JdD",
			run: () => rollDamageSetFromAction(actor, actionData, { titleName, chatContext }),
		});
	}

	if (actionData?.jds?.enabled) {
		choices.push({
			id: "save",
			label: "JdS",
			run: () => rollSavePromptFromAction(actor, actionData, { titleName, chatContext }),
		});
	}

	if (actionData?.concentration?.enabled) {
		choices.push({
			id: "concentration",
			label: "JdF",
			run: () =>
				rollConcentrationFromAction(actor, actionData, {
					titleName,
					chatContext,
				}),
		});
	}

	return choices;
};

export const executeActionPrompt = async ({
	actor,
	actionData,
	sourceItem = null,
	titleName = "",
	actionIndex = -1,
} = {}) => {
	if (!actor) {
		ui.notifications.warn("Aucun acteur sélectionné.");
		return null;
	}

	if (!actionData) {
		ui.notifications.warn("Action introuvable.");
		return null;
	}

	const resolvedTitle = getActionTitle({ actionData, sourceItem, titleName });
	const chatContext = buildActionChatContext({
		sourceItem,
		titleName: resolvedTitle,
		actionIndex,
	});
	const choices = buildActionRollChoices({
		actor,
		actionData,
		titleName: resolvedTitle,
		chatContext,
	});

	if (!choices.length) {
		ui.notifications.warn("Cette action n'a aucun jet activé.");
		return null;
	}

	if (choices.length === 1) {
		return choices[0].run();
	}

	const content = await renderActionDialogContent({
		actor,
		actionData,
		sourceItem,
		titleName: resolvedTitle,
	});
	const previewController = createActionPreviewController({ actor, actionData });

	const selectedChoice = await waitForActionDialog(
		{
			window: {
				title: `Action - ${resolvedTitle}`,
			},
			content,
			buttons: choices.map((choice, index) => {
				return {
					action: choice.id,
					label: choice.label,
					default: index === 0,
					callback: () => choice,
				};
			}),
		},
		{
			closeValue: null,
			onRender: () => previewController.render(),
			onClose: () => previewController.cleanup(),
		},
	);

	if (!selectedChoice) return null;
	return selectedChoice.run();
};
