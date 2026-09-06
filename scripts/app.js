"use strict";

// -----------------------------------------------------------------------------
// Global state
// -----------------------------------------------------------------------------

let currentLang = "fr";
let selectedSeriesId = "all";
let selectedFacilityMode = "normal";
let selectedFactorySeriesId = "series_1";
let pokemonSpeciesNamesById = null;

// -----------------------------------------------------------------------------
// Text and translation helpers
// -----------------------------------------------------------------------------

// Normalizes user input to make search accent-insensitive and case-insensitive
function normalizeText(value) {
    return value
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]/g, "");
}

// Translates UI labels by section/key
function translate(section, key) {
    return window.appTranslations[section]?.[key]?.[currentLang]
        ?? window.appTranslations[section]?.[key]?.en
        ?? key;
}

// Translates data values such as types, abilities, natures, items or moves
function translateEntity(category, id) {
    if (category === "moves") {
        return getMoveName(id);
    }

    return window.appTranslations[category]?.[id]?.[currentLang]
        ?? window.appTranslations[category]?.[id]?.en
        ?? id;
}

// Returns the localized singular/plural label for Factory possible sets
function getFactoryPossibleSetsLabel(count) {
    return translate("ui", count === 1 ? "factoryPossibleSet" : "factoryPossibleSets");
}

// Returns the canonical localized names known for one Pokémon species
function getPokemonSpeciesNames(speciesId) {
    if (!speciesId) {
        return null;
    }

    if (!pokemonSpeciesNamesById) {
        pokemonSpeciesNamesById = new Map();

        for (const mon of Object.values(window.frontierMons ?? {})) {
            if (!mon?.speciesId || !mon.names) {
                continue;
            }

            const existingNames = pokemonSpeciesNamesById.get(mon.speciesId) ?? {};

            pokemonSpeciesNamesById.set(mon.speciesId, {
                ...existingNames,
                ...mon.names
            });
        }
    }

    return pokemonSpeciesNamesById.get(speciesId) ?? null;
}

// Returns the localized entity name, with a canonical species fallback for Pokémon data
function getName(entity, lang = currentLang) {
    const speciesNames = entity?.speciesId
        ? getPokemonSpeciesNames(entity.speciesId)
        : null;

    return entity?.names?.[lang]
        ?? speciesNames?.[lang]
        ?? entity?.names?.en
        ?? speciesNames?.en
        ?? entity?.speciesId
        ?? entity?.id
        ?? "";
}

// Returns the language not currently displayed
function getOtherLang() {
    return currentLang === "fr" ? "en" : "fr";
}

// -----------------------------------------------------------------------------
// Facility mode helpers
// -----------------------------------------------------------------------------

// Returns whether Battle Arcade mode is selected
function isArcadeMode() {
    return selectedFacilityMode === "arcade";
}

// Returns whether Battle Factory mode is selected
function isFactoryMode() {
    return selectedFacilityMode === "factory";
}

// Returns whether Battle Hall mode is selected
function isHallMode() {
    return selectedFacilityMode === "hall";
}

// -----------------------------------------------------------------------------
// Factory series controls
// -----------------------------------------------------------------------------

// Returns factory series data
function getFactorySeriesData() {
    const levelKey = getFactoryPoolLevelKey();

    return window.factoryPools?.[levelKey]?.series ?? {};
}

// Populates factory series select
function populateFactorySeriesSelect() {
    const seriesData = getFactorySeriesData();
    const seriesIds = Object.keys(seriesData);

    dom.factorySeriesSelect.replaceChildren();

    if (seriesIds.length === 0) {
        dom.factorySeriesSelect.disabled = true;
        return;
    }

    dom.factorySeriesSelect.disabled = false;

    if (!seriesData[selectedFactorySeriesId]) {
        selectedFactorySeriesId = seriesIds[0];
    }

    for (const seriesId of seriesIds) {
        const option = document.createElement("option");

        option.value = seriesId;
        option.textContent = translate("series", seriesId);

        dom.factorySeriesSelect.appendChild(option);
    }

    dom.factorySeriesSelect.value = selectedFactorySeriesId;
}

// Updates facility selection controls
function updateFacilitySelectionControls() {
    const factoryMode = isFactoryMode();
    const hallMode = isHallMode();
    const usesTrainerSelection = !factoryMode && !hallMode;

    dom.trainerLabel.hidden = !usesTrainerSelection;
    dom.trainerSelectorsContainer.hidden = !usesTrainerSelection;
    dom.seriesFilterDropdown.hidden = !usesTrainerSelection;

    dom.factorySeriesField.hidden = !factoryMode;
    dom.hallControls.container.hidden = !hallMode;
}

// Handles factory series change
function handleFactorySeriesChange(event) {
    selectedFactorySeriesId = event.target.value;
    resetFactoryPlayerTeam();

    resetAllOpponentBattleStates();
    resetAllTrainerBattleExclusions();

    battleState.trainers.forEach((_, sourceIndex) => {
        clearExcludedPokemonInput(sourceIndex);
        clearExcludedItemInput(sourceIndex);
    });

    dom.resultsContainer.classList.remove("has-selected-pokemon");

    refreshCurrentBattleView();
}

// -----------------------------------------------------------------------------
// Language handling
// -----------------------------------------------------------------------------

// Applies translated labels and placeholders to opponent Pokémon slots
function applyOpponentSlotLanguage() {
    dom.opponentSlots.forEach((slotDom, slotIndex) => {
        const labelKey = getActiveOpponentCount() === 2 ? `opponentPokemonLabel${slotIndex + 1}` : "opponentPokemonLabel";

        slotDom.label.textContent = translate("ui", labelKey);
        slotDom.input.placeholder = translate("ui", "pokemonPlaceholder");
    });
}

// Applies the translated level label for the active facility.
function applyLevelInputLanguage() {
    dom.levelLabel.textContent = translate("ui", isHallMode() ? "playerLevelLabel" : "levelLabel");
}

// Applies the current language to static UI and visible dynamic content
function applyLanguage() {
    document.documentElement.lang = currentLang;

    document.title = translate("ui", "pageTitle");
    dom.pageTitle.textContent = translate("ui", "pageTitle");
    applyLevelInputLanguage();
    dom.languageToggle.textContent = currentLang === "fr" ? "EN" : "FR";

    dom.facilityModeLabel.textContent = translate("ui", "facilityModeLabel");
    dom.facilityNormalLabel.textContent = translate("ui", "facilityNormal");
    dom.facilityFactoryLabel.textContent = translate("ui", "facilityFactory");
    dom.facilityArcadeLabel.textContent = translate("ui", "facilityArcade");
    dom.facilityHallLabel.textContent = translate("ui", "facilityHall");
    dom.factorySeriesLabel.textContent = translate("ui", "factorySeriesLabel");

    dom.battleFormatLabel.textContent = translate("ui", "battleFormatLabel");
    dom.battleFormatSinglesLabel.textContent = translate("ui", "battleFormatSingles");
    dom.battleFormatDoublesLabel.textContent = translate("ui", "battleFormatDoubles");
    dom.battleFormatMultiLabel.textContent = translate("ui", "battleFormatMulti");

    applyTrainerSlotLanguage();
    applyOpponentSlotLanguage();

    populateSeriesFilter();
    updateSeriesFilterButtonLabel();
    populateFactorySeriesSelect();
    updateFacilitySelectionControls();
    applyFactoryPlayerTeamLanguage();
    applyHallControlsLanguage();
    applySearchClearButtonLanguage();

    for (let trainerIndex = 0; trainerIndex < getActiveTrainerCount(); trainerIndex++) {
        const trainer = getTrainerBattleState(trainerIndex).trainer;
        const trainerId = trainer?.id ?? null;

        populateTrainerSelect(trainerIndex, trainerId);

        if (trainer) {
            getTrainerSlotDom(trainerIndex).input.value = getName(trainer);
        }
    }

    if (!dom.resultsContainer.hidden) {
        renderBattleResults();
        refreshSelectedOpponentViews();
    }
}

// Applies translated labels and placeholders to trainer slots.
function applyTrainerSlotLanguage() {
    const isMulti = battleState.format === "multi";

    dom.trainerLabel.textContent = translate("ui", isMulti ? "trainerLabelMulti" : "trainerLabel");

    dom.trainerSlots.forEach((slotDom, slotIndex) => {
        slotDom.container.hidden = slotIndex >= getActiveTrainerCount();
        slotDom.label.hidden = !isMulti;
        slotDom.label.textContent = translate("ui", slotIndex === 0 ? "trainerSlot1" : "trainerSlot2");
        slotDom.input.placeholder = translate("ui", "trainerPlaceholder");
    });
}

// Applies the translated accessible label to every search clear button
function applySearchClearButtonLanguage() {
    const label = translate("ui", "clearSearch");

    const searchSlots = [ ...dom.trainerSlots, ...dom.opponentSlots, ...dom.factoryPlayerTeam.slots ];

    searchSlots.forEach((slotDom) => {
        slotDom.clearButton.title = label;
        slotDom.clearButton.setAttribute("aria-label", label);
    });

    dom.hallControls.playerPokemonClearButton.title = label;
    dom.hallControls.playerPokemonClearButton.setAttribute("aria-label", label);
}

// Switches between French and English
function toggleLanguage() {
    currentLang = currentLang === "fr" ? "en" : "fr";
    applyLanguage();
}

// -----------------------------------------------------------------------------
// Battle view refresh and mode changes
// -----------------------------------------------------------------------------

// Refreshes selected opponent views
function refreshSelectedOpponentViews() {
    for (let slotIndex = 0; slotIndex < getActiveOpponentCount(); slotIndex++) {
        const opponentState = getOpponentBattleState(slotIndex);

        if (!hasBattlePokemonSourceForOpponentSlot(slotIndex) || !opponentState.speciesId) {
            continue;
        }

        const selectedMon = findOpponentPokemonBySpeciesId(opponentState.speciesId, slotIndex);

        if (!selectedMon) {
            clearOpponentPokemonSelection(slotIndex, false);
            continue;
        }

        const slotDom = dom.opponentSlots[slotIndex];

        slotDom.select.value = opponentState.speciesId;
        slotDom.input.value = getName(selectedMon);

        renderSelectedPokemonDetails(opponentState.speciesId, slotIndex);
    }
}

// Refreshes current battle view
function refreshCurrentBattleView() {
    renderBattleResults();
    refreshSelectedOpponentViews();
}

// Handles facility mode change
function handleFacilityModeChange(event) {
    const previousFacilityMode = selectedFacilityMode;

    selectedFacilityMode = event.target.value;

    const factoryTransition = previousFacilityMode === "factory" || selectedFacilityMode === "factory";

    const hallTransition = previousFacilityMode === "hall" || selectedFacilityMode === "hall";

    if (factoryTransition) {
        resetFactoryPlayerTeam();
    }

    if (factoryTransition || hallTransition) {
        resetAllOpponentBattleStates();
        resetAllTrainerBattleExclusions();

        battleState.trainers.forEach((_, trainerIndex) => {
            clearExcludedPokemonInput(trainerIndex);
            clearExcludedItemInput(trainerIndex);
        });

        dom.resultsContainer.classList.remove("has-selected-pokemon");
    }

    updateLevelInputConstraints();
    updateFacilitySelectionControls();
    applyLevelInputLanguage();
    updateHallControlsForBattleFormat();
    populateFactorySeriesSelect();

    if (isArcadeMode()) {
        for (let trainerIndex = 0; trainerIndex < getActiveTrainerCount(); trainerIndex++) {
            getTrainerBattleExclusions(trainerIndex).itemIds.clear();
            clearExcludedItemInput(trainerIndex);
        }
    }

    applyTrainerSlotLanguage();
    applyOpponentSlotLanguage();

    refreshCurrentBattleView();
}

// Handles battle format change
function handleBattleFormatChange(event) {
    const previousFormat = battleState.format;

    battleState.format = event.target.value;
    applyLevelInputLanguage();
    updateHallControlsForBattleFormat();

    if (isFactoryMode() && previousFormat !== battleState.format) {
        resetFactoryPlayerTeam();
    }

    resetAllOpponentBattleStates();
    resetAllTrainerBattleExclusions();

    battleState.trainers.forEach((_, trainerIndex) => {
        clearExcludedPokemonInput(trainerIndex);
        clearExcludedItemInput(trainerIndex);
    });

    if (battleState.format !== "multi") {
        const secondTrainerState = getTrainerBattleState(1);
        const secondTrainerDom = getTrainerSlotDom(1);

        secondTrainerState.trainer = null;
        secondTrainerState.suggestionMatches = [];
        secondTrainerState.suggestionActiveIndex = -1;

        secondTrainerDom.input.value = "";
        secondTrainerDom.select.value = "";
        secondTrainerDom.suggestions.replaceChildren();
        secondTrainerDom.suggestions.hidden = true;
    }

    applyTrainerSlotLanguage();
    applyOpponentSlotLanguage();

    for (let trainerIndex = 0; trainerIndex < getActiveTrainerCount(); trainerIndex++) {
        const trainerId = getTrainerBattleState(trainerIndex).trainer?.id ?? null;
        populateTrainerSelect(trainerIndex, trainerId);
    }

    dom.resultsContainer.classList.remove("has-selected-pokemon");

    renderBattleResults();
}

// -----------------------------------------------------------------------------
// App initialization
// -----------------------------------------------------------------------------

// Initializes app
function initApp() {
    applyLanguage();
    updateLevelInputConstraints();

    bindTrainerSlotEvents(0);
    bindTrainerSlotEvents(1);

    bindOpponentPokemonSlotEvents(0);
    bindOpponentPokemonSlotEvents(1);

    bindBattleExclusionEvents(0);
    bindBattleExclusionEvents(1);
    bindFactoryPlayerTeamEvents();
    bindHallControlEvents();

    dom.languageToggle.addEventListener("click", toggleLanguage);

    dom.facilityModeInputs.forEach((input) => {
        input.addEventListener("change", handleFacilityModeChange);
    });

    dom.battleFormatInputs.forEach((input) => {
        input.addEventListener("change", handleBattleFormatChange);
    });

    dom.factorySeriesSelect.addEventListener("change", handleFactorySeriesChange);

    dom.seriesFilterButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSeriesFilterMenu();
    });

    document.addEventListener("click", (event) => {
        if (!dom.seriesFilterDropdown.contains(event.target)) {
            closeSeriesFilterMenu();
        }
    });

    dom.trainerForm.addEventListener("submit", (event) => {
        event.preventDefault();
    });

    dom.levelInput.addEventListener("change", () => {
        getSelectedLevel();

        if (isHallMode()) {
            renderBattleResults();
            refreshSelectedOpponentViews();
            return;
        }

        if (isFactoryMode()) {
            resetFactoryPlayerTeam();
            populateFactorySeriesSelect();
        }

        const sourceCount = isFactoryMode() || isHallMode() ? 1 : getActiveTrainerCount();

        const hasSource = Array.from(
            { length: sourceCount },
            (_, sourceIndex) => hasBattlePokemonSource(sourceIndex)
        ).some(Boolean);

        if (!hasSource) {
            return;
        }

        resetAllTrainerBattleExclusions();
        resetAllOpponentBattleStates();

        for (let sourceIndex = 0; sourceIndex < sourceCount; sourceIndex++) {
            clearExcludedPokemonInput(sourceIndex);
            clearExcludedItemInput(sourceIndex);
        }

        renderBattleResults();

        dom.resultsContainer.classList.remove("has-selected-pokemon");
    });
}

document.addEventListener("DOMContentLoaded", initApp);