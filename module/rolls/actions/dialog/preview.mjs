import {
	getActionMaxRange,
	getBestConeFit,
	getBestLineFit,
	getConeNote,
	getDistanceNote,
	getLineNote,
	getScenePixelsPerUnit,
	getShapeRelevantTargets,
	getTokenCenter,
	getTokenDistance,
} from "../targeting/geometry.mjs";
import { getTargetOutcomeData } from "../targeting/state.mjs";
import { getSourceToken } from "../internal/shared.mjs";

const PREVIEW_LAYER_NAME = "nalfa-action-preview";
const TARGET_STATUS_COLORS = Object.freeze({
	ok: 0x3fb950,
	success: 0x3fb950,
	disadvantage: 0xd29922,
	fail: 0xf85149,
	impossible: 0xf85149,
	source: 0x58a6ff,
	warning: 0xd29922,
});

const getTargetStatus = (note) => {
	if (note.startsWith("Impossible")) return "impossible";
	if (note.startsWith("Désavantage")) return "disadvantage";
	return "ok";
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
	const center = getTokenCenter(token);
	if (!center) return;
	const radius = Math.max(Number(token.w ?? 0), Number(token.h ?? 0), 24) * 0.4;
	graphics.lineStyle({ width: thickness, color, alpha });
	graphics.drawCircle(center.x, center.y, radius);
};

const drawTargetLinks = ({ graphics, sourceToken, targets }) => {
	const sourceCenter = getTokenCenter(sourceToken);
	if (!sourceCenter) return;

	for (const target of targets) {
		const targetCenter = getTokenCenter(target.token);
		if (!targetCenter) continue;

		graphics.lineStyle({
			color: TARGET_STATUS_COLORS[target.status],
			width: 2,
			alpha: 0.65,
		});
		graphics.moveTo(sourceCenter.x, sourceCenter.y);
		graphics.lineTo(targetCenter.x, targetCenter.y);
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
	graphics.lineStyle({ color, width: 2.5, alpha: 0.75 });
	graphics.beginFill(color, 0.12);
	graphics.drawPolygon(points);
	graphics.endFill();
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
	const sourceCenter = getTokenCenter(sourceToken);
	if (!sourceCenter) return;
	graphics.lineStyle({ color, width: 2.5, alpha: 0.75 });
	graphics.beginFill(color, 0.12);
	graphics.moveTo(sourceCenter.x, sourceCenter.y);
	graphics.arc(sourceCenter.x, sourceCenter.y, radiusPixels, startAngle, endAngle);
	graphics.lineTo(sourceCenter.x, sourceCenter.y);
	graphics.endFill();
};

export const createActionPreviewController = ({ actor, actionData }) => {
	let container = null;

	return {
		render() {
			this.cleanup();

			const sourceToken = getSourceToken(actor);
			const targetTokens = Array.from(game.user?.targets ?? []).filter(Boolean);
			if (!sourceToken || targetTokens.length === 0 || !canvas?.stage) return;

			container = createPreviewContainer();

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
					markerStatus: getTargetOutcomeData({
						sourceToken,
						targetToken,
						actionData,
					}).markerStatus,
				};
			});

			const shapeRelevantTargets = getShapeRelevantTargets({
				sourceToken,
				targets: targetTokens,
			});
			const lineFit = getBestLineFit({
				sourceToken,
				targets: shapeRelevantTargets,
			});
			const coneFit = getBestConeFit({
				sourceToken,
				targets: shapeRelevantTargets,
			});
			const shape = String(actionData?.selection?.zone?.shape ?? "circle");
			const lineInvalid = Boolean(
				getLineNote({ sourceToken, actionData, targets: targetTokens }),
			);
			const coneInvalid = Boolean(
				getConeNote({ sourceToken, actionData, targets: targetTokens }),
			);

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
					color: TARGET_STATUS_COLORS[targetState.markerStatus],
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
