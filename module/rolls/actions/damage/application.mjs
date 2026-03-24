export const applyDamageSummaryRowsToTargets = async (rows = []) => {
	for (const row of rows) {
		const actor = row?.targetToken?.actor;
		if (!actor?.update) continue;

		const hpDelta = Number(row?.hpDelta ?? 0);
		const tempHpDelta = Number(row?.tempHpDelta ?? 0);
		if (!hpDelta && !tempHpDelta) continue;

		const currentHp = Number(actor.system?.attributes?.hp?.value ?? 0);
		const currentMaxHp = Number(actor.system?.attributes?.hp?.max ?? NaN);
		let nextHp = currentHp + hpDelta;
		const nextTempHp = Math.max(
			0,
			Number(row?.finalTempHp ?? actor.system?.attributes?.hp?.abso ?? 0),
		);

		if (Number.isFinite(currentMaxHp)) nextHp = Math.min(nextHp, currentMaxHp);

		await actor.update({
			"system.attributes.hp.value": nextHp,
			"system.attributes.hp.abso": nextTempHp,
		});
	}
};
