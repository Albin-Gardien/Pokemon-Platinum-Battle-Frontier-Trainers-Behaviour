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

// -----------------------------------------------------------------------------
// Hall selection accessors
// -----------------------------------------------------------------------------

// Returns selected hall type
function getSelectedHallType() {
    return selectedHallType;
}

// Returns selected hall rank
function getSelectedHallRank() {
    return selectedHallRank === "all" ? null : Number(selectedHallRank);
}

// Returns effective hall rank
function getEffectiveHallRank() {
    if (isHallArgentaGold()) {
        return 10;
    }

    if (isHallMode() && battleState.format === "multi") {
        return 10;
    }

    return getSelectedHallRank();
}

// Returns selected hall advanced type count
function getSelectedHallAdvancedTypeCount() {
    return selectedHallAdvancedTypeCount;
}

// Returns selected hall encounter type
function getSelectedHallEncounterType() {
    return selectedHallEncounterType;
}

// Returns whether hall argenta silver
function isHallArgentaSilver() {
    return selectedHallEncounterType === HALL_ENCOUNTER_ARGENTA_SILVER;
}

// Returns whether hall argenta gold
function isHallArgentaGold() {
    return selectedHallEncounterType === HALL_ENCOUNTER_ARGENTA_GOLD;
}

// Returns whether hall argenta battle
function isHallArgentaBattle() {
    return isHallArgentaSilver() || isHallArgentaGold();
}

// -----------------------------------------------------------------------------
// Hall player Pokémon and group calculation
// -----------------------------------------------------------------------------

// Returns hall player pokemon candidates
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

// Returns hall base stat total
function getHallBaseStatTotal(mon) {
    if (!mon?.baseStats) {
        return null;
    }

    return (mon.baseStats.hp + mon.baseStats.atk + mon.baseStats.def + mon.baseStats.spa + mon.baseStats.spd + mon.baseStats.spe);
}

// Returns hall group from base stat total
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

// Returns selected hall player pokemon
function getSelectedHallPlayerPokemon() {
    if (!selectedHallPlayerSpeciesId) {
        return null;
    }

    return getHallPlayerPokemonCandidates()
        .find((mon) => mon.speciesId === selectedHallPlayerSpeciesId) ?? null;
}

// Returns hall player pokemon display name
function getHallPlayerPokemonDisplayName(mon) {
    return getName(mon);
}

// Populates hall player pokemon suggestions
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

// Selects hall player pokemon
function selectHallPlayerPokemon(mon) {
    selectedHallPlayerSpeciesId = mon.speciesId;

    dom.hallControls.playerPokemonInput.value = getName(mon);
    dom.hallControls.playerPokemonSuggestions.hidden = true;

    refreshAfterHallControlChange();
}

// Clears hall player pokemon selection
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

// Returns selected hall player group
function getSelectedHallPlayerGroup() {
    const mon = getSelectedHallPlayerPokemon();
    const baseStatTotal = getHallBaseStatTotal(mon);

    return baseStatTotal === null ? null : getHallGroupFromBaseStatTotal(baseStatTotal);
}

// -----------------------------------------------------------------------------
// Hall battle level and IV calculation
// -----------------------------------------------------------------------------

// Returns hall battle IV
function getHallBattleIv(rank = getEffectiveHallRank()) {
    if (isHallArgentaBattle()) {
        return 31;
    }

    if (rank === null) {
        return null;
    }

    return 6 + (rank * 2);
}

// Returns hall opponent level
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

// -----------------------------------------------------------------------------
// Hall control visibility
// -----------------------------------------------------------------------------

// Updates hall controls for battle format
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
// Hall selectors and language
// -----------------------------------------------------------------------------

// Populates hall encounter select
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

// Handles hall encounter change
function handleHallEncounterChange(event) {
    selectedHallEncounterType = event.target.value;

    if (!isHallArgentaSilver()) {
        clearHallPlayerPokemonSelection(false);
    }

    updateHallControlsForBattleFormat();
    refreshAfterHallControlChange();
}

// Populates hall type select
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

// Populates hall rank select
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

// Applies hall controls language
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

// Refreshes after hall control change
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

// Handles hall type change
function handleHallTypeChange(event) {
    selectedHallType = event.target.value;
    refreshAfterHallControlChange();
}

// Handles hall rank change
function handleHallRankChange(event) {
    selectedHallRank = event.target.value;
    refreshAfterHallControlChange();
}

// Handles hall advanced type count change
function handleHallAdvancedTypeCountChange(event) {
    const value = Number(event.target.value);

    selectedHallAdvancedTypeCount = Number.isInteger(value) ? Math.min(16, Math.max(0, value)) : 0;

    event.target.value = String(selectedHallAdvancedTypeCount);

    refreshCurrentBattleView();
}

// -----------------------------------------------------------------------------
// Hall control events
// -----------------------------------------------------------------------------

// Binds hall control events
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