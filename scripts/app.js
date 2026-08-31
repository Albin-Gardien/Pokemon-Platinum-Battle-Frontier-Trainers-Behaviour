"use strict";

// -----------------------------------------------------------------------------
// Global state
// -----------------------------------------------------------------------------

let currentLang = "fr";
let selectedSeriesId = "all";
let selectedFacilityMode = "normal";

// -----------------------------------------------------------------------------
// Text and translation helpers
// -----------------------------------------------------------------------------

// Normalizes user input to make search accent-insensitive and case-insensitive.
function normalizeText(value) {
    return value
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]/g, "");
}

// Translates UI labels by section/key.
function translate(section, key) {
    return window.appTranslations[section]?.[key]?.[currentLang]
        ?? window.appTranslations[section]?.[key]?.en
        ?? key;
}

// Translates data values such as types, abilities, natures, items or moves.
function translateEntity(category, id) {
    if (category === "moves") {
        return getMoveName(id);
    }

    return window.appTranslations[category]?.[id]?.[currentLang]
        ?? window.appTranslations[category]?.[id]?.en
        ?? id;
}

// Returns the translated entity name, falling back to English then ID.
function getName(entity, lang = currentLang) {
    return entity.names?.[lang] ?? entity.names?.en ?? entity.id;
}

// Returns the language not currently displayed.
function getOtherLang() {
    return currentLang === "fr" ? "en" : "fr";
}

function isArcadeMode() {
    return selectedFacilityMode === "arcade";
}

// -----------------------------------------------------------------------------
// Language handling
// -----------------------------------------------------------------------------

// Applies the current language to static UI and refreshes visible dynamic content.
function applyOpponentSlotLanguage() {
    dom.opponentSlots.forEach((slotDom, slotIndex) => {
        const labelKey = getActiveOpponentCount() === 2 ? `opponentPokemonLabel${slotIndex + 1}` : "opponentPokemonLabel";

        slotDom.label.textContent = translate("ui", labelKey);
        slotDom.input.placeholder = translate("ui", "opponentPokemonPlaceholder");
    });
}

function applyLanguage() {
    document.documentElement.lang = currentLang;

    document.title = translate("ui", "pageTitle");
    dom.pageTitle.textContent = translate("ui", "pageTitle");
    dom.levelLabel.textContent = translate("ui", "levelLabel");
    dom.languageToggle.textContent = currentLang === "fr" ? "EN" : "FR";

    dom.facilityModeLabel.textContent = translate("ui", "facilityModeLabel");
    dom.facilityNormalLabel.textContent = translate("ui", "facilityNormal");
    dom.facilityFactoryLabel.textContent = translate("ui", "facilityFactory");
    dom.facilityArcadeLabel.textContent = translate("ui", "facilityArcade");
    dom.facilityHallLabel.textContent = translate("ui", "facilityHall");

    dom.battleFormatLabel.textContent = translate("ui", "battleFormatLabel");
    dom.battleFormatSinglesLabel.textContent = translate("ui", "battleFormatSingles");
    dom.battleFormatDoublesLabel.textContent = translate("ui", "battleFormatDoubles");
    dom.battleFormatMultiLabel.textContent = translate("ui", "battleFormatMulti");

    applyTrainerSlotLanguage();
    applyOpponentSlotLanguage();

    populateSeriesFilter();
    updateSeriesFilterButtonLabel();

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

// Switches between French and English.
function toggleLanguage() {
    currentLang = currentLang === "fr" ? "en" : "fr";
    applyLanguage();
}

function refreshSelectedOpponentViews() {
    for (let slotIndex = 0; slotIndex < getActiveOpponentCount(); slotIndex++) {
        const trainer = getTrainerForOpponentSlot(slotIndex);
        const opponentState = getOpponentBattleState(slotIndex);

        if (!trainer || !opponentState.speciesId) {
            continue;
        }

        const selectedMon = findOpponentPokemonBySpeciesId(trainer, opponentState.speciesId, slotIndex);

        if (!selectedMon) {
            clearOpponentPokemonSelection(slotIndex, false);
            continue;
        }

        const slotDom = dom.opponentSlots[slotIndex];

        slotDom.select.value = opponentState.speciesId;
        slotDom.input.value = getName(selectedMon);

        renderSelectedPokemonDetails(trainer, opponentState.speciesId, slotIndex);
    }
}

function refreshCurrentBattleView() {
    renderBattleResults();
    refreshSelectedOpponentViews();
}

function handleFacilityModeChange(event) {
    selectedFacilityMode = event.target.value;

    if (isArcadeMode()) {
        for (let trainerIndex = 0; trainerIndex < getActiveTrainerCount(); trainerIndex++) {
            getTrainerBattleExclusions(trainerIndex).itemIds.clear();
            clearExcludedItemInput(trainerIndex);
        }
    }

    refreshCurrentBattleView();
}

function handleBattleFormatChange(event) {
    battleState.format = event.target.value;

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

function initApp() {
    applyLanguage();

    bindTrainerSlotEvents(0);
    bindTrainerSlotEvents(1);

    bindOpponentPokemonSlotEvents(0);
    bindOpponentPokemonSlotEvents(1);

    bindBattleExclusionEvents(0);
    bindBattleExclusionEvents(1);

    dom.languageToggle.addEventListener("click", toggleLanguage);

    dom.facilityModeInputs.forEach((input) => {
        input.addEventListener("change", handleFacilityModeChange);
    });

    dom.battleFormatInputs.forEach((input) => {
        input.addEventListener("change", handleBattleFormatChange);
    });

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
        const hasTrainer = battleState.trainers
            .slice(0, getActiveTrainerCount())
            .some((trainerState) => trainerState.trainer);

        if (!hasTrainer) {
            return;
        }

        resetAllTrainerBattleExclusions();
        resetAllOpponentBattleStates();

        for (let trainerIndex = 0; trainerIndex < getActiveTrainerCount(); trainerIndex++) {
            clearExcludedPokemonInput(trainerIndex);
            clearExcludedItemInput(trainerIndex);
        }

        renderBattleResults();

        dom.resultsContainer.classList.remove("has-selected-pokemon");
    });
}

document.addEventListener("DOMContentLoaded", initApp);
