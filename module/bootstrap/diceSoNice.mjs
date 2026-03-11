export const registerDiceSoNiceHook = () => {
	Hooks.once("diceSoNiceReady", async (dice3d) => {
		let DiceSystem;
		try {
			({ DiceSystem } = await import("/modules/dice-so-nice/api.js"));
		} catch (error) {
			console.warn("nalfa | Dice So Nice API unavailable, skipping integration.", error);
			return;
		}

		const mySystem = new DiceSystem("nalfa", "Nalfa", "preferred");
		dice3d.addSystem(mySystem);
		dice3d.addDicePreset({
			type: "d4",
			labels: ["2", "2", "3", "4"],
			system: "nalfa",
		});
		dice3d.addDicePreset({
			type: "d6",
			labels: ["3", "3", "3", "4", "5", "6"],
			system: "nalfa",
		});
		dice3d.addDicePreset({
			type: "d8",
			labels: ["4", "4", "4", "4", "5", "6", "7", "8"],
			system: "nalfa",
		});
		dice3d.addDicePreset({
			type: "d10",
			labels: ["5", "5", "5", "5", "5", "6", "7", "8", "9", "10"],
			system: "nalfa",
		});
		dice3d.addDicePreset({
			type: "d12",
			labels: ["6", "6", "6", "6", "6", "6", "7", "8", "9", "10", "11", "12"],
			system: "nalfa",
		});
	});
};
