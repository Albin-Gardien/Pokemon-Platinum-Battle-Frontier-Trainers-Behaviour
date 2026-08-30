"use strict";

// -----------------------------------------------------------------------------
// Battle/stat calculation helpers
// -----------------------------------------------------------------------------

// Returns the nature multiplier for one stat.
function getNatureMultiplier(natureId, statKey) {
    const modifier = natureModifiers[natureId];

    if (!modifier) {
        return 1;
    }

    if (modifier.up === statKey) {
        return 1.1;
    }

    if (modifier.down === statKey) {
        return 0.9;
    }

    return 1;
}

// Calculates the HP stat using Gen 4 stat formula.
function calculateHpStat(base, iv, ev, level) {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

// Calculates non-HP stats using Gen 4 stat formula and nature modifier.
function calculateOtherStat(base, iv, ev, level, natureId, statKey) {
    const rawStat = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    return Math.floor(rawStat * getNatureMultiplier(natureId, statKey));
}

// Calculates all displayed stats for one Pokémon set.
function calculateStats(mon, iv, level) {
    const hp =
        mon.speciesId === "shedinja" ? 1 : calculateHpStat(mon.baseStats.hp, iv, mon.evs.hp ?? 0, level);

    return {
        hp,
        atk: calculateOtherStat(mon.baseStats.atk, iv, mon.evs.atk ?? 0, level, mon.nature, "atk"),
        def: calculateOtherStat(mon.baseStats.def, iv, mon.evs.def ?? 0, level, mon.nature, "def"),
        spa: calculateOtherStat(mon.baseStats.spa, iv, mon.evs.spa ?? 0, level, mon.nature, "spa"),
        spd: calculateOtherStat(mon.baseStats.spd, iv, mon.evs.spd ?? 0, level, mon.nature, "spd"),
        spe: calculateOtherStat(mon.baseStats.spe, iv, mon.evs.spe ?? 0, level, mon.nature, "spe")
    };
}

function getSelectedLevel() {
    const level = Number(dom.levelInput.value);

    if (level === 50) {
        return 50;
    }

    if (level >= 60 && level <= 100) {
        return level;
    }

    dom.levelInput.value = 50;
    return 50;
}

function isMonAllowedAtLevel(mon, level) {
    return !(level === 50 && forbiddenLevel50Species.has(mon.speciesId));
}

function getTrainerMonsForLevel(trainer, level) {
    return getTrainerMons(trainer).filter((mon) => isMonAllowedAtLevel(mon, level));
}