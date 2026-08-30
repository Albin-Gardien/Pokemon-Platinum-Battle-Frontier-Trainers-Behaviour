"use strict";

// -----------------------------------------------------------------------------
// Global state
// -----------------------------------------------------------------------------

let currentLang = "fr";
let currentTrainer = null;
let selectedSeriesId = "all";

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

// -----------------------------------------------------------------------------
// Language handling
// -----------------------------------------------------------------------------

// Applies the current language to static UI and refreshes visible dynamic content.
function applyLanguage() {
    document.documentElement.lang = currentLang;

    document.title = translate("ui", "pageTitle");
    dom.pageTitle.textContent = translate("ui", "pageTitle");
    dom.levelLabel.textContent = translate("ui", "levelLabel");
    dom.opponentPokemonLabel.textContent = translate("ui", "opponentPokemonLabel");
    dom.opponentPokemonInput.placeholder = translate("ui", "opponentPokemonPlaceholder");
    dom.trainerLabel.textContent = translate("ui", "trainerLabel");
    dom.trainerTextInput.placeholder = translate("ui", "trainerPlaceholder");
    dom.languageToggle.textContent = currentLang === "fr" ? "EN" : "FR";

    const selectedTrainerId = dom.trainerSelect.value;

    populateSeriesFilter();
    updateSeriesFilterButtonLabel();
    populateTrainerSelect(selectedTrainerId);

    const trainer = getTrainerById(selectedTrainerId);

    if (trainer) {
        dom.trainerTextInput.value = getName(trainer);

        if (!dom.resultsContainer.hidden) {
            renderTrainerTeam(trainer);

            if (currentOpponentSpeciesId) {
                dom.opponentPokemonSelect.value = currentOpponentSpeciesId;

                const selectedMon = getSelectedPokemonSets(trainer, currentOpponentSpeciesId)[0];

                if (selectedMon) {
                    dom.opponentPokemonInput.value = getName(selectedMon);
                }

                renderSelectedPokemonDetails(trainer, currentOpponentSpeciesId);
            }
        }
    }
}

// Switches between French and English.
function toggleLanguage() {
    currentLang = currentLang === "fr" ? "en" : "fr";
    applyLanguage();
}

// -----------------------------------------------------------------------------
// App initialization
// -----------------------------------------------------------------------------

function initApp() {
    populateSeriesFilter();
    populateTrainerSelect();
    applyLanguage();
    bindTextToTrainerSelect();

    dom.languageToggle.addEventListener("click", toggleLanguage);

    dom.seriesFilterButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSeriesFilterMenu();
    });

    dom.trainerTextInput.addEventListener("keydown", handleTrainerSuggestionKeyboard);
    dom.opponentPokemonInput.addEventListener("keydown", handleOpponentSuggestionKeyboard);

    document.addEventListener("click", (event) => {
        if (!dom.seriesFilterDropdown.contains(event.target)) {
            closeSeriesFilterMenu();
        }
    });

    dom.levelInput.addEventListener("change", () => {
        if (!currentTrainer) {
            return;
        }

        resetBattleExclusions();
        renderTrainerTeam(currentTrainer);
        dom.resultsContainer.classList.remove("has-selected-pokemon");
        dom.selectedPokemonDetails.hidden = true;
    });

    dom.trainerForm.addEventListener("submit", (event) => {
        event.preventDefault();
    });

    dom.opponentPokemonSelect.addEventListener("change", (event) => {
        if (!currentTrainer || !event.target.value) {
            currentOpponentSpeciesId = null;
            possibleSetIds.clear();
            dom.selectedPokemonDetails.hidden = true;
            return;
        }

        const mon = findOpponentPokemonBySpeciesId(currentTrainer, event.target.value);
        selectOpponentPokemonAndRender(mon);
    });

    dom.opponentPokemonInput.addEventListener("input", (event) => {
        if (!currentTrainer) {
            return;
        }

        const level = getSelectedLevel();
        const mons = getTrainerMonsForLevel(currentTrainer, level);
        const uniqueSpecies = [];

        for (const mon of mons) {
            if (isMonExcluded(mon)) {
                continue;
            }
            if (!uniqueSpecies.some((existing) => existing.speciesId === mon.speciesId)) {
                uniqueSpecies.push(mon);
            }
        }

        populateOpponentPokemonSuggestions(uniqueSpecies, event.target.value);
    });

    dom.excludedPokemonInput.addEventListener("input", (event) => {
        populateExcludedPokemonSuggestions(event.target.value);
    });

    dom.excludedItemInput.addEventListener("input", (event) => {
        populateExcludedItemSuggestions(event.target.value);
    });

    dom.excludedPokemonInput.addEventListener("keydown", handleExcludedPokemonSuggestionKeyboard);
    dom.excludedItemInput.addEventListener("keydown", handleExcludedItemSuggestionKeyboard);

    dom.excludedPokemonInput.addEventListener("blur", () => {
        setTimeout(() => {
            dom.excludedPokemonSuggestions.hidden = true;
        }, 100);
    });

    dom.excludedItemInput.addEventListener("blur", () => {
        setTimeout(() => {
            dom.excludedItemSuggestions.hidden = true;
        }, 100);
    });

    dom.opponentPokemonInput.addEventListener("blur", () => {
        setTimeout(() => {
            dom.opponentPokemonSuggestions.hidden = true;
        }, 100);
    });

    dom.opponentPokemonInput.addEventListener("change", (event) => {
        if (!currentTrainer) {
            return;
        }

        const mon = findOpponentPokemonByInputValue(currentTrainer, event.target.value);
        selectOpponentPokemonAndRender(mon);
    });
}

document.addEventListener("DOMContentLoaded", initApp);
