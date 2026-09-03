"use strict";

function getTrainerMons(trainer) {
    const team = window.frontierTrainerTeams[trainer.poolId];

    if (!team) {
        return [];
    }

    return team.setIds
        .map((setId) => window.frontierMons[setId])
        .filter(Boolean);
}

function createTrainerBattleMon(mon, trainer) {
    return {
        ...mon,
        sourceSetId: mon.id,
        battleIv: trainer.ivTier
    };
}

function getTrainerBattlePokemonSource(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const trainer = getTrainerBattleState(sourceIndex).trainer;

    if (!trainer) {
        return null;
    }

    const mons = getTrainerMonsForLevel(trainer, getSelectedLevel())
        .map((mon) => createTrainerBattleMon(mon, trainer));

    return {
        type: "trainer",
        mons
    };
}

function createFactoryBattleMon(entry) {
    const mon = window.frontierMons[entry.setId];

    if (!mon) {
        console.warn(`Factory set not found in frontier_mons.js: ${entry.setId}`);
        return null;
    }

    return {
        ...mon,
        id: `${entry.setId}__iv_${entry.iv}`,
        sourceSetId: entry.setId,
        battleIv: entry.iv,
        factoryAvailability: [...(entry.availability ?? [])]
    };
}

function getFactoryPoolLevelKey() {
    return getSelectedLevel() === 100 ? "level100" : "level50";
}

function getFactoryBattle7Phase(series) {
    if (battleState.format === "singles") {
        return series.battle7 ?? null;
    }

    if (battleState.format === "doubles" || battleState.format === "multi") {
        return series.battle7DoublesMulti ?? null;
    }

    return null;
}

function mergeFactoryPhaseEntries(battles1To6, battle7) {
    const mergedEntries = new Map();

    const appendEntries = (entries, availability) => {
        for (const entry of entries ?? []) {
            const identity = `${entry.setId}__iv_${entry.iv}`;

            if (!mergedEntries.has(identity)) {
                mergedEntries.set(identity, {
                    setId: entry.setId,
                    iv: entry.iv,
                    availability: []
                });
            }

            const mergedEntry = mergedEntries.get(identity);

            if (!mergedEntry.availability.includes(availability)) {
                mergedEntry.availability.push(availability);
            }
        }
    };

    appendEntries(battles1To6?.entries, "battles1To6");
    appendEntries(battle7?.entries, "battle7");

    return [...mergedEntries.values()];
}

function getFactoryBattlePokemonSource() {
    const levelKey = getFactoryPoolLevelKey();
    const series = window.factoryPools?.[levelKey]?.series?.[selectedFactorySeriesId];

    if (!series) {
        return null;
    }

    const battles1To6 = series.battles1To6 ?? null;
    const battle7 = getFactoryBattle7Phase(series);

    if (!battles1To6 || !battle7) {
        console.warn(`Factory phase data missing for ${levelKey}.${selectedFactorySeriesId} in ${battleState.format} format.`);
        return null;
    }

    const entries = mergeFactoryPhaseEntries(battles1To6, battle7);

    return {
        type: "factory",
        levelKey,
        seriesId: selectedFactorySeriesId,
        format: battleState.format,

        factoryPhases: { battles1To6, battle7 },

        mons: entries.map((entry) => createFactoryBattleMon(entry)).filter(Boolean)
    };
}

function getFactoryMonBattleGroupId(mon) {
    const availability = mon.factoryAvailability ?? [];
    const isAvailableDuringBattles1To6 = availability.includes("battles1To6");
    const isAvailableDuringBattle7 = availability.includes("battle7");

    if (isAvailableDuringBattles1To6 && isAvailableDuringBattle7) {
        return "battles1To7";
    }

    if (isAvailableDuringBattle7) {
        return "battle7";
    }

    return "battles1To6";
}

function getFactoryBattleGroupTranslationKey(group) {
    if (group.id === "battles1To7") {
        return "factoryBattles1To7";
    }

    if (group.id === "battle7") {
        return group.boss ? "factoryBattle7Boss" : "factoryBattle7";
    }

    return "factoryBattles1To6";
}

function groupFactoryMonsByIv(mons) {
    const groupsByIv = new Map();

    for (const mon of mons) {
        const iv = getBattlePokemonIv(mon);

        if (!groupsByIv.has(iv)) {
            groupsByIv.set(iv, []);
        }

        groupsByIv.get(iv).push(mon);
    }

    return [...groupsByIv.entries()].map(([iv, groupedMons]) => ({
        iv,
        mons: groupedMons
    }));
}

function getFactoryBattleGroups(mons, source = getFactoryBattlePokemonSource()) {
    const monsByGroup = {
        battles1To6: [],
        battle7: [],
        battles1To7: []
    };

    for (const mon of mons) {
        monsByGroup[getFactoryMonBattleGroupId(mon)].push(mon);
    }

    const battle7Boss = source?.factoryPhases?.battle7?.boss ?? null;

    return [
        {
            id: "battles1To6",
            boss: null,
            mons: monsByGroup.battles1To6
        },
        {
            id: "battle7",
            boss: battle7Boss,
            mons: monsByGroup.battle7
        },
        {
            id: "battles1To7",
            boss: null,
            mons: monsByGroup.battles1To7
        }
    ]
        .filter((group) => group.mons.length > 0)
        .map((group) => ({
            ...group,
            ivGroups: groupFactoryMonsByIv(group.mons)
        }));
}

function getBattlePokemonSource(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    if (isFactoryMode()) {
        return sourceIndex === PRIMARY_TRAINER_SLOT_INDEX
            ? getFactoryBattlePokemonSource()
            : null;
    }

    return getTrainerBattlePokemonSource(sourceIndex);
}

function hasBattlePokemonSource(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    return getBattlePokemonSource(sourceIndex) !== null;
}

function getAvailableBattleMons(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    return getBattlePokemonSource(sourceIndex)?.mons ?? [];
}

function getAvailableOpponentBattleMons(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const mons = getAvailableBattleMons(sourceIndex);

    if (!isFactoryMode()) {
        return mons;
    }

    return mons.filter((mon) => !isMonExcludedByFactoryPlayerTeam(mon));
}

function getBattlePokemonIv(mon) {
    return mon.battleIv ?? 0;
}

function getBattlePokemonSourceIndexForOpponentSlot(slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    if (isFactoryMode()) {
        return PRIMARY_TRAINER_SLOT_INDEX;
    }

    return getTrainerIndexForOpponentSlot(slotIndex);
}

function hasBattlePokemonSourceForOpponentSlot(slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    return hasBattlePokemonSource(getBattlePokemonSourceIndexForOpponentSlot(slotIndex));
}

function getAvailableBattleMonsForOpponentSlot(slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    return getAvailableOpponentBattleMons(
        getBattlePokemonSourceIndexForOpponentSlot(slotIndex)
    );
}