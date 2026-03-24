import { formatDistance } from "../internal/shared.mjs";

export const getTokenCenter = (token) => {
	const center = token?.center;
	if (!center) return null;
	if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return null;
	return center;
};

export const getTokenDistance = (sourceToken, targetToken) => {
	const sourcePoint = getTokenCenter(sourceToken);
	const targetPoint = getTokenCenter(targetToken);
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
	const sourcePoint = getTokenCenter(sourceToken);
	const targetPoint = getTokenCenter(targetToken);
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

export const getScenePixelsPerUnit = () => {
	const unitsPerPixel = getSceneUnitsPerPixel();
	if (!Number.isFinite(unitsPerPixel) || !(unitsPerPixel > 0)) return null;
	return 1 / unitsPerPixel;
};

export const getShapeRelevantTargets = ({ sourceToken, targets }) => {
	return targets.filter((targetToken) => {
		const distance = getTokenDistance(sourceToken, targetToken);
		return !Number.isFinite(distance) || distance > 0;
	});
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

		const perpendicularOffsetPixels = Math.abs(delta.x * normalX + delta.y * normalY);
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

export const getBestLineFit = ({ sourceToken, targets }) => {
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

export const getBestConeFit = ({ sourceToken, targets }) => {
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

export const getConeNote = ({ sourceToken, actionData, targets }) => {
	const shape = String(actionData?.selection?.zone?.shape ?? "circle");
	if (shape !== "cone") return "";

	const relevantTargets = getShapeRelevantTargets({ sourceToken, targets });
	if (relevantTargets.length < 2) return "";

	const maxAngle = Number(actionData?.selection?.zone?.range_secondary ?? 0);
	if (!(maxAngle > 0)) return "";

	const bestFit = getBestConeFit({ sourceToken, targets: relevantTargets });
	if (Number.isFinite(bestFit?.angle) && bestFit.angle > maxAngle) {
		return `Impossible : Cône trop large (${formatDistance(bestFit.angle)}deg > ${formatDistance(maxAngle)}deg) !`;
	}

	return "";
};

export const getLineNote = ({ sourceToken, actionData, targets }) => {
	const shape = String(actionData?.selection?.zone?.shape ?? "circle");
	if (shape !== "line") return "";

	const relevantTargets = getShapeRelevantTargets({ sourceToken, targets });
	if (relevantTargets.length < 2) return "";

	const maxWidth = Number(actionData?.selection?.zone?.range_secondary ?? 0);
	if (!(maxWidth > 0)) return "";

	const bestFit = getBestLineFit({ sourceToken, targets: relevantTargets });
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

export const getActionMaxRange = (actionData) => {
	const zone = actionData?.selection?.zone ?? {};
	const range = Number(zone.range ?? 0);
	const hasLongRange = zone.has_long_range === true;
	const longRange = Number(zone.long_range ?? 0);
	if (hasLongRange && longRange > range) return longRange;
	return range;
};

export const getDistanceNote = ({ actor, actionData, distance }) => {
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
