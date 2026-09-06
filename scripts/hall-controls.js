"use strict";

// -----------------------------------------------------------------------------
// Battle Hall selection state
// -----------------------------------------------------------------------------

const HALL_TYPE_IDS = [
    "normal",
    "fighting",
    "flying",
    "poison",
    "ground",
    "rock",
    "bug",
    "ghost",
    "steel",
    "fire",
    "water",
    "grass",
    "electric",
    "psychic",
    "ice",
    "dragon",
    "dark"
];

const HALL_ENCOUNTER_NORMAL = "normal";
const HALL_ENCOUNTER_ARGENTA_SILVER = "argenta_silver";
const HALL_ENCOUNTER_ARGENTA_GOLD = "argenta_gold";

let selectedHallEncounterType = HALL_ENCOUNTER_NORMAL;
let selectedHallPlayerSpeciesId = null;

let hallPlayerSuggestionMatches = [];
let hallPlayerSuggestionActiveIndex = -1;

let selectedHallType = "all";
let selectedHallRank = "all";
let selectedHallAdvancedTypeCount = 0;

function getSelectedHallType() {
    return selectedHallType;
}

function getSelectedHallRank() {
    return selectedHallRank === "all" ? null : Number(selectedHallRank);
}

function getEffectiveHallRank() {
    if (isHallArgentaGold()) {
        return 10;
    }

    if (isHallMode() && battleState.format === "multi") {
        return 10;
    }

    return getSelectedHallRank();
}

function getSelectedHallAdvancedTypeCount() {
    return selectedHallAdvancedTypeCount;
}

function getSelectedHallEncounterType() {
    return selectedHallEncounterType;
}

function isHallArgentaSilver() {
    return selectedHallEncounterType === HALL_ENCOUNTER_ARGENTA_SILVER;
}

function isHallArgentaGold() {
    return selectedHallEncounterType === HALL_ENCOUNTER_ARGENTA_GOLD;
}

function isHallArgentaBattle() {
    return isHallArgentaSilver() || isHallArgentaGold();
}

function getHallPlayerPokemonCandidates() {
    const speciesById = new Map();

    for (const mon of Object.values(window.frontierMons ?? {})) {
        if (speciesById.has(mon.speciesId)) {
            continue;
        }

        speciesById.set(mon.speciesId, { speciesId: mon.speciesId, names: mon.names, baseStats: mon.baseStats });
    }

    return [...speciesById.values()].sort((monA, monB) =>
            getName(monA).localeCompare(getName(monB), currentLang)
        );
}

function getHallBaseStatTotal(mon) {
    if (!mon?.baseStats) {
        return null;
    }

    return (mon.baseStats.hp + mon.baseStats.atk + mon.baseStats.def + mon.baseStats.spa + mon.baseStats.spd + mon.baseStats.spe);
}

function getHallGroupFromBaseStatTotal(baseStatTotal) {
    if (baseStatTotal < 340) {
        return 1;
    }

    if (baseStatTotal < 440) {
        return 2;
    }

    if (baseStatTotal < 500) {
        return 3;
    }

    return 4;
}

function getSelectedHallPlayerPokemon() {
    if (!selectedHallPlayerSpeciesId) {
        return null;
    }

    return getHallPlayerPokemonCandidates()
        .find((mon) => mon.speciesId === selectedHallPlayerSpeciesId) ?? null;
}

function getHallPlayerPokemonDisplayName(mon) {
    return getName(mon);
}

function populateHallPlayerPokemonSuggestions(search) {
    const suggestions = dom.hallControls.playerPokemonSuggestions;

    suggestions.replaceChildren();

    hallPlayerSuggestionMatches = [];
    hallPlayerSuggestionActiveIndex = -1;

    const normalizedSearch = normalizeText(search);

    if (normalizedSearch.length < 2) {
        suggestions.hidden = true;
        return;
    }

    hallPlayerSuggestionMatches = getHallPlayerPokemonCandidates()
        .filter((mon) =>
            normalizeText(getName(mon, "fr")).includes(normalizedSearch) ||
            normalizeText(getName(mon, "en")).includes(normalizedSearch)
        )
        .slice(0, 20);

    if (hallPlayerSuggestionMatches.length === 0) {
        suggestions.hidden = true;
        return;
    }

    hallPlayerSuggestionMatches.forEach((mon) => {
        const item = document.createElement("div");

        item.className = "suggestion-item";
        item.textContent = getHallPlayerPokemonDisplayName(mon);

        item.addEventListener("mousedown", (event) => {
            event.preventDefault();
            selectHallPlayerPokemon(mon);
        });

        suggestions.appendChild(item);
    });

    suggestions.hidden = false;
}

function selectHallPlayerPokemon(mon) {
    selectedHallPlayerSpeciesId = mon.speciesId;

    dom.hallControls.playerPokemonInput.value = getName(mon);
    dom.hallControls.playerPokemonSuggestions.hidden = true;

    refreshAfterHallControlChange();
}

function clearHallPlayerPokemonSelection(refresh = true) {
    selectedHallPlayerSpeciesId = null;
    hallPlayerSuggestionMatches = [];
    hallPlayerSuggestionActiveIndex = -1;

    dom.hallControls.playerPokemonInput.value = "";
    dom.hallControls.playerPokemonSuggestions.replaceChildren();
    dom.hallControls.playerPokemonSuggestions.hidden = true;

    if (refresh) {
        refreshAfterHallControlChange();
    }
}

function getSelectedHallPlayerGroup() {
    const mon = getSelectedHallPlayerPokemon();
    const baseStatTotal = getHallBaseStatTotal(mon);

    return baseStatTotal === null ? null : getHallGroupFromBaseStatTotal(baseStatTotal);
}

function getHallBattleIv(rank = getEffectiveHallRank()) {
    if (isHallArgentaBattle()) {
        return 31;
    }

    if (rank === null) {
        return null;
    }

    return 6 + (rank * 2);
}

function getHallOpponentLevel(rank = getEffectiveHallRank()) {
    const playerLevel = getSelectedLevel();

    if (isHallArgentaBattle()) {
        return playerLevel;
    }

    if (rank === null) {
        return null;
    }

    if (battleState.format === "multi") {
        return playerLevel;
    }

    const squareRootLevel = Math.sqrt(playerLevel);
    const baseLevel = playerLevel - (3 * squareRootLevel);
    const increment = squareRootLevel / 5;

    return Math.min(playerLevel,Math.ceil(baseLevel + (getSelectedHallAdvancedTypeCount() / 2) + ((rank - 1) * increment)));
}

function updateHallControlsForBattleFormat() {
    if (!isHallMode()) {
        return;
    }

    const isMulti = battleState.format === "multi";

    if (battleState.format !== "singles" && isHallArgentaBattle()) {
        selectedHallEncounterType = HALL_ENCOUNTER_NORMAL;
        clearHallPlayerPokemonSelection(false);
    }

    const isSilverBoss = isHallArgentaSilver();
    const isGoldBoss = isHallArgentaGold();
    const isBoss = isSilverBoss || isGoldBoss;

    populateHallEncounterSelect();

    dom.hallControls.typeField.hidden = isBoss;
    dom.hallControls.playerPokemonField.hidden = !isSilverBoss;

    dom.hallControls.advancedTypesField.hidden = isMulti || isBoss;

    dom.hallControls.rankSelect.disabled = isMulti || isGoldBoss;

    dom.hallControls.rankSelect.value = isMulti || isGoldBoss ? "10" : String(selectedHallRank);
}

// -----------------------------------------------------------------------------
// Hall selectors
// -----------------------------------------------------------------------------

function populateHallEncounterSelect() {
    const select = dom.hallControls.encounterSelect;

    select.replaceChildren();

    const encounters = [
        {
            id: HALL_ENCOUNTER_NORMAL,
            label: translate("ui", "hallEncounterNormal"),
            boss: false
        },
        {
            id: HALL_ENCOUNTER_ARGENTA_SILVER,
            label: `${translate("ui", "hallArgenta")} — ` + `${translate("ui", "hallArgentaSilver")}`,
            boss: true
        },
        {
            id: HALL_ENCOUNTER_ARGENTA_GOLD,
            label: `${translate("ui", "hallArgenta")} — ` + `${translate("ui", "hallArgentaGold")}`,
            boss: true
        }
    ];

    for (const encounter of encounters) {
        const option = document.createElement("option");

        option.value = encounter.id;
        option.textContent = encounter.label;

        if (encounter.boss && battleState.format !== "singles") {
            option.disabled = true;
        }

        select.appendChild(option);
    }

    select.value = selectedHallEncounterType;
}

function handleHallEncounterChange(event) {
    selectedHallEncounterType = event.target.value;

    if (!isHallArgentaSilver()) {
        clearHallPlayerPokemonSelection(false);
    }

    updateHallControlsForBattleFormat();
    refreshAfterHallControlChange();
}

function populateHallTypeSelect() {
    dom.hallControls.typeSelect.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = translate("ui", "all");

    dom.hallControls.typeSelect.appendChild(allOption);

    for (const typeId of HALL_TYPE_IDS) {
        const option = document.createElement("option");

        option.value = typeId;
        option.textContent = translateEntity("types", typeId);

        dom.hallControls.typeSelect.appendChild(option);
    }

    dom.hallControls.typeSelect.value = selectedHallType;
}

function populateHallRankSelect() {
    dom.hallControls.rankSelect.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = translate("ui", "all");

    dom.hallControls.rankSelect.appendChild(allOption);

    for (let rank = 1; rank <= 10; rank++) {
        const option = document.createElement("option");

        option.value = String(rank);
        option.textContent = String(rank);

        dom.hallControls.rankSelect.appendChild(option);
    }

    dom.hallControls.rankSelect.value = String(getEffectiveHallRank() ?? "all");
}

function applyHallControlsLanguage() {
    dom.hallControls.encounterLabel.textContent = translate("ui", "hallEncounterLabel");
    dom.hallControls.playerPokemonLabel.textContent = translate("ui", "hallPlayerPokemonLabel");
    dom.hallControls.playerPokemonInput.placeholder = translate("ui", "pokemonPlaceholder");
    dom.hallControls.typeLabel.textContent = translate("ui", "hallTypeLabel");
    dom.hallControls.rankLabel.textContent = translate("ui", "hallRankLabel");
    dom.hallControls.advancedTypesLabel.textContent = translate("ui", "hallAdvancedTypesLabel");

    populateHallEncounterSelect();
    populateHallTypeSelect();
    populateHallRankSelect();
    updateHallControlsForBattleFormat();

    const playerMon = getSelectedHallPlayerPokemon();

    if (playerMon) {
        dom.hallControls.playerPokemonInput.value = getName(playerMon);
    }
}

// -----------------------------------------------------------------------------
// Hall selection changes
// -----------------------------------------------------------------------------

function refreshAfterHallControlChange() {
    resetAllOpponentBattleStates();
    resetAllTrainerBattleExclusions();

    battleState.trainers.forEach((_, trainerIndex) => {
        clearExcludedPokemonInput(trainerIndex);
        clearExcludedItemInput(trainerIndex);
    });

    dom.resultsContainer.classList.remove("has-selected-pokemon");

    refreshCurrentBattleView();
}

function handleHallTypeChange(event) {
    selectedHallType = event.target.value;
    refreshAfterHallControlChange();
}

function handleHallRankChange(event) {
    selectedHallRank = event.target.value;
    refreshAfterHallControlChange();
}

function handleHallAdvancedTypeCountChange(event) {
    const value = Number(event.target.value);

    selectedHallAdvancedTypeCount = Number.isInteger(value) ? Math.min(16, Math.max(0, value)) : 0;

    event.target.value = String(selectedHallAdvancedTypeCount);

    refreshCurrentBattleView();
}

function bindHallControlEvents() {
    dom.hallControls.encounterSelect.addEventListener("change", handleHallEncounterChange);
    dom.hallControls.typeSelect.addEventListener("change", handleHallTypeChange);
    dom.hallControls.rankSelect.addEventListener("change", handleHallRankChange);
    dom.hallControls.advancedTypesInput.addEventListener("change", handleHallAdvancedTypeCountChange);
    dom.hallControls.playerPokemonInput.addEventListener("input", (event) => {
        populateHallPlayerPokemonSuggestions(event.target.value);
    });

    dom.hallControls.playerPokemonInput.addEventListener("change", (event) => {
        const normalizedValue = normalizeText(event.target.value);

        const mon = getHallPlayerPokemonCandidates().find((candidate) =>
            normalizeText(getName(candidate, "fr")) === normalizedValue ||
            normalizeText(getName(candidate, "en")) === normalizedValue
        );

        if (mon) {
            selectHallPlayerPokemon(mon);
        }
    });

    dom.hallControls.playerPokemonInput.addEventListener("blur", () => {
        setTimeout(() => { dom.hallControls.playerPokemonSuggestions.hidden = true; }, 100);
    });

    dom.hallControls.playerPokemonClearButton.addEventListener("click", () => {
        clearHallPlayerPokemonSelection();
        dom.hallControls.playerPokemonInput.focus();
    });
}