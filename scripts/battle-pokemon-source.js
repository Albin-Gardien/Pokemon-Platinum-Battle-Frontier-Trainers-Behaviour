"use strict";

// -----------------------------------------------------------------------------
// Trainer Pokémon source
// -----------------------------------------------------------------------------

// Returns trainer mons
function getTrainerMons(trainer) {
    const team = window.frontierTrainerTeams[trainer.poolId];

    if (!team) {
        return [];
    }

    return team.setIds
        .map((setId) => window.frontierMons[setId])
        .filter(Boolean);
}

// Creates trainer battle mon
function createTrainerBattleMon(mon, trainer) {
    return {
        ...mon,
        sourceSetId: mon.id,
        battleIv: trainer.ivTier
    };
}

// Returns trainer battle pokemon source
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

// -----------------------------------------------------------------------------
// Battle Factory Pokémon source
// -----------------------------------------------------------------------------

// Creates factory battle mon
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

// Returns factory pool level key
function getFactoryPoolLevelKey() {
    return getSelectedLevel() === 100 ? "level100" : "level50";
}

// Returns factory battle 7 phase
function getFactoryBattle7Phase(series) {
    if (battleState.format === "singles") {
        return series.battle7 ?? null;
    }

    if (battleState.format === "doubles" || battleState.format === "multi") {
        return series.battle7DoublesMulti ?? null;
    }

    return null;
}

// Merges factory phase entries
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

// Returns factory battle pokemon source
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

// Returns factory mon battle group ID
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

// Returns factory battle group translation key
function getFactoryBattleGroupTranslationKey(group) {
    if (group.id === "battles1To7") {
        return "factoryBattles1To7";
    }

    if (group.id === "battle7") {
        return group.boss ? "factoryBattle7Boss" : "factoryBattle7";
    }

    return "factoryBattles1To6";
}

// Groups factory mons by IV
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

// Returns factory battle groups
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

// -----------------------------------------------------------------------------
// Battle Hall Pokémon source
// -----------------------------------------------------------------------------

// Creates hall battle mon
function createHallBattleMon(mon, battleIv, battleLevel) {
    return { ...mon, sourceSetId: mon.id, battleIv, battleLevel };
}

// Returns whether hall mon available for type
function isHallMonAvailableForType(mon, typeId) {
    return typeId === "all" || mon.types.includes(typeId);
}

// Returns whether hall mon available for rank
function isHallMonAvailableForRank(mon, rank) {
    return rank === null || (rank >= mon.minRank && rank <= mon.maxRank);
}

// Returns hall battle pokemon source
function getHallBattlePokemonSource() {
    const hallData = window.hallMons;

    if (!Array.isArray(hallData?.mons)) {
        return null;
    }

    const encounterType = getSelectedHallEncounterType();
    const rank = getEffectiveHallRank();
    const playerLevel = getSelectedLevel();
    const battleIv = getHallBattleIv(rank);
    const battleLevel = getHallOpponentLevel(rank);

    let typeId = getSelectedHallType();
    let poolGroup = null;
    let boss = null;
    let sourceMons = hallData.mons;

    if (isHallArgentaSilver()) {
        const playerPokemon = getSelectedHallPlayerPokemon();
        const playerGroup = getSelectedHallPlayerGroup();

        typeId = null;
        boss = { id: "argenta", print: "silver", battleNumber: 50 };

        if (!playerPokemon || playerGroup === null) {
            return { type: "hall", encounterType, boss, typeId, rank, poolGroup: null, playerLevel, battleLevel, battleIv,
                advancedTypeCount: getSelectedHallAdvancedTypeCount(), playerPokemon: null, requiresPlayerPokemon: true, mons: []
            };
        }

        poolGroup = playerGroup;
        sourceMons = sourceMons.filter((mon) => mon.group === playerGroup);
    } else if (isHallArgentaGold()) {
        poolGroup = 4;
        sourceMons = sourceMons.filter((mon) => mon.group === 4);
        typeId = null;
        boss = { id: "argenta", print: "gold", battleNumber: 170 };
    } else {
        sourceMons = sourceMons.filter((mon) => isHallMonAvailableForType(mon, typeId)).filter((mon) => isHallMonAvailableForRank(mon, rank));
    }

    const mons = sourceMons.map((mon) => createHallBattleMon(mon, battleIv, battleLevel));

    return { type: "hall", encounterType, boss, typeId, rank, poolGroup, playerLevel, battleLevel, battleIv,
        advancedTypeCount: getSelectedHallAdvancedTypeCount(), playerPokemon: getSelectedHallPlayerPokemon(), requiresPlayerPokemon: false, mons
    };
}

// Returns hall battle groups
function getHallBattleGroups(mons) {
    const groupsById = new Map();

    for (const mon of mons) {
        if (!groupsById.has(mon.group)) {
            groupsById.set(mon.group, []);
        }

        groupsById.get(mon.group).push(mon);
    }

    return [...groupsById.entries()]
        .sort(([groupA], [groupB]) => groupA - groupB)
        .map(([groupId, groupedMons]) => {
            const groupMeta =
                window.hallMons?.meta?.groups?.[`group_${groupId}`] ?? {};

            return {
                id: groupId,
                minRank: groupMeta.minRank ?? groupedMons[0]?.minRank,
                maxRank: groupMeta.maxRank ?? groupedMons[0]?.maxRank,
                mons: groupedMons.sort((monA, monB) =>
                    monA.hallNumber - monB.hallNumber
                )
            };
        });
}

// -----------------------------------------------------------------------------
// Unified battle Pokémon source
// -----------------------------------------------------------------------------

// Returns battle pokemon source
function getBattlePokemonSource(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    if (isFactoryMode()) {
        return sourceIndex === PRIMARY_TRAINER_SLOT_INDEX
            ? getFactoryBattlePokemonSource()
            : null;
    }

    if (isHallMode()) {
        return sourceIndex === PRIMARY_TRAINER_SLOT_INDEX
            ? getHallBattlePokemonSource()
            : null;
    }

    return getTrainerBattlePokemonSource(sourceIndex);
}

// Returns whether battle pokemon source
function hasBattlePokemonSource(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    return getBattlePokemonSource(sourceIndex) !== null;
}

// Returns available battle mons
function getAvailableBattleMons(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    return getBattlePokemonSource(sourceIndex)?.mons ?? [];
}

// Returns available opponent battle mons
function getAvailableOpponentBattleMons(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const mons = getAvailableBattleMons(sourceIndex);

    if (!isFactoryMode()) {
        return mons;
    }

    return mons.filter((mon) => !isMonExcludedByFactoryPlayerTeam(mon));
}

// -----------------------------------------------------------------------------
// Battle Pokémon metadata
// -----------------------------------------------------------------------------

// Returns battle pokemon IV
function getBattlePokemonIv(mon) {
    if (Object.prototype.hasOwnProperty.call(mon, "battleIv")) {
        return mon.battleIv;
    }

    return 0;
}

// Returns battle pokemon level
function getBattlePokemonLevel(mon, fallbackLevel = getSelectedLevel()) {
    if (Object.prototype.hasOwnProperty.call(mon, "battleLevel")) {
        return mon.battleLevel;
    }

    return fallbackLevel;
}

// Returns battle pokemon source index for opponent slot
function getBattlePokemonSourceIndexForOpponentSlot(slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    if (isFactoryMode() || isHallMode()) {
        return PRIMARY_TRAINER_SLOT_INDEX;
    }

    return getTrainerIndexForOpponentSlot(slotIndex);
}

// Returns whether battle pokemon source for opponent slot
function hasBattlePokemonSourceForOpponentSlot(slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    return hasBattlePokemonSource(getBattlePokemonSourceIndexForOpponentSlot(slotIndex));
}

// Returns available battle mons for opponent slot
function getAvailableBattleMonsForOpponentSlot(slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    return getAvailableOpponentBattleMons(
        getBattlePokemonSourceIndexForOpponentSlot(slotIndex)
    );
}