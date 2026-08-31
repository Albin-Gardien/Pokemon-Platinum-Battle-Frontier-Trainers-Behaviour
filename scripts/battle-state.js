"use strict";

// -----------------------------------------------------------------------------
// Battle state
// -----------------------------------------------------------------------------

const PRIMARY_TRAINER_SLOT_INDEX = 0;
const PRIMARY_OPPONENT_SLOT_INDEX = 0;

const BATTLE_FORMAT_CONFIG = {
    singles: {
        trainerCount: 1,
        opponentCount: 1,
        exclusionLimit: 2
    },
    doubles: {
        trainerCount: 1,
        opponentCount: 2,
        exclusionLimit: 3
    },
    multi: {
        trainerCount: 2,
        opponentCount: 2,
        exclusionLimit: 1
    }
};

function createTrainerBattleState() {
    return {
        trainer: null,

        exclusions: {
            speciesIds: new Set(),
            itemIds: new Set()
        },

        suggestionMatches: [],
        suggestionActiveIndex: -1
    };
}

function createOpponentBattleState() {
    return {
        speciesId: null,
        possibleSetIds: new Set(),

        suggestionMatches: [],
        suggestionActiveIndex: -1,

        movePpState: new Map()
    };
}

const battleState = {
    format: "singles",

    activeOpponentSlotIndex: PRIMARY_OPPONENT_SLOT_INDEX,

    trainers: [
        createTrainerBattleState(),
        createTrainerBattleState()
    ],

    opponents: [
        createOpponentBattleState(),
        createOpponentBattleState()
    ]
};

function getTrainerBattleState(slotIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    return battleState.trainers[slotIndex];
}

function getOpponentBattleState(slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    return battleState.opponents[slotIndex];
}

function getCurrentTrainer() {
    return getTrainerBattleState().trainer;
}

function getCurrentBattleExclusions() {
    return getTrainerBattleExclusions();
}

function getBattleFormatConfig() {
    return BATTLE_FORMAT_CONFIG[battleState.format];
}

function getActiveOpponentCount() {
    return getBattleFormatConfig().opponentCount;
}

function getActiveTrainerCount() {
    return getBattleFormatConfig().trainerCount;
}

function getTrainerIndexForOpponentSlot(slotIndex) {
    return battleState.format === "multi" ? slotIndex : PRIMARY_TRAINER_SLOT_INDEX;
}

function getTrainerForOpponentSlot(slotIndex) {
    return getTrainerBattleState(getTrainerIndexForOpponentSlot(slotIndex)).trainer;
}

function getOpponentSlotIndexesForTrainer(trainerIndex) {
    if (battleState.format === "multi") {
        return trainerIndex < getActiveTrainerCount() ? [trainerIndex] : [];
    }

    if (trainerIndex !== PRIMARY_TRAINER_SLOT_INDEX) {
        return [];
    }

    return Array.from({ length: getActiveOpponentCount() }, (_, slotIndex) => slotIndex);
}

function getOpponentSlotIndexForTrainerTable(trainerIndex) {
    if (battleState.format === "multi") {
        return trainerIndex;
    }

    if (battleState.format === "doubles") {
        return battleState.activeOpponentSlotIndex;
    }

    return PRIMARY_OPPONENT_SLOT_INDEX;
}

function getTrainerBattleExclusions(trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    return getTrainerBattleState(trainerIndex).exclusions;
}

function resetTrainerBattleExclusions(trainerIndex) {
    const exclusions = getTrainerBattleExclusions(trainerIndex);

    exclusions.speciesIds.clear();
    exclusions.itemIds.clear();
}

function resetAllTrainerBattleExclusions() {
    battleState.trainers.forEach((_, trainerIndex) => resetTrainerBattleExclusions(trainerIndex));
}

function usesDoublesAi() {
    return battleState.format === "doubles" || battleState.format === "multi";
}

function resetOpponentBattleState(slotIndex) {
    const opponentState = getOpponentBattleState(slotIndex);

    opponentState.speciesId = null;
    opponentState.possibleSetIds.clear();
    opponentState.suggestionMatches = [];
    opponentState.suggestionActiveIndex = -1;
    opponentState.movePpState.clear();
}

function resetAllOpponentBattleStates() {
    battleState.opponents.forEach((_, slotIndex) => resetOpponentBattleState(slotIndex));
    battleState.activeOpponentSlotIndex = PRIMARY_OPPONENT_SLOT_INDEX;
}