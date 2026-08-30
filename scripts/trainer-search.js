"use strict";

// -----------------------------------------------------------------------------
// Trainer data access, trainer search, and series filter
// -----------------------------------------------------------------------------

let trainerSuggestionMatches = [];
let trainerSuggestionActiveIndex = -1;
let opponentSuggestionMatches = [];
let opponentSuggestionActiveIndex = -1;

function getTrainerList() {
  return Object.values(window.frontierTrainers);
}

// Finds a trainer by ID.
function getTrainerById(trainerId) {
  return window.frontierTrainers.find(trainer => trainer.id === trainerId);
}

// Builds the searchable text for one trainer.
function getTrainerSearchText(trainer) {
  return normalizeText([
    trainer.id,
    trainer.names?.fr,
    trainer.names?.en
  ].filter(Boolean).join(" "));
}

function populateTrainerSuggestions(search = "") {
    const menu = dom.trainerSuggestions;
    menu.replaceChildren();

    const normalizedSearch = normalizeText(search);

    if (normalizedSearch.length < 2) {
        menu.hidden = true;
        return;
    }

    const visibleIds = getVisibleTrainerIds();
    const matches = getTrainerList()
        .filter((trainer) => visibleIds.has(trainer.id))
        .filter((trainer) => getTrainerSearchText(trainer).includes(normalizedSearch))
        .slice(0, 12);

    if (matches.length === 0) {
        menu.hidden = true;
        return;
    }

    trainerSuggestionMatches = matches;
    trainerSuggestionActiveIndex = -1;

    matches.forEach((trainer, index) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = getTrainerDisplayName(trainer);
        item.dataset.index = index;

        item.addEventListener("mousedown", (event) => {
            event.preventDefault();
            selectTrainerAndRender(trainer);
        });

        menu.appendChild(item);
    });

    menu.hidden = false;
}

function updateTrainerSuggestionActiveItem() {
    const items = dom.trainerSuggestions.querySelectorAll(".suggestion-item");

    items.forEach((item, index) => {
        item.classList.toggle("active", index === trainerSuggestionActiveIndex);
    });
}

function selectActiveTrainerSuggestion() {
    const trainer = trainerSuggestionMatches[trainerSuggestionActiveIndex];

    if (trainer) {
        selectTrainerAndRender(trainer);
    }
}

function handleTrainerSuggestionKeyboard(event) {
    const menu = dom.trainerSuggestions;

    if (menu.hidden || trainerSuggestionMatches.length === 0) {
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        trainerSuggestionActiveIndex =
            (trainerSuggestionActiveIndex + 1) % trainerSuggestionMatches.length;
        updateTrainerSuggestionActiveItem();
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        trainerSuggestionActiveIndex =
            (trainerSuggestionActiveIndex - 1 + trainerSuggestionMatches.length) % trainerSuggestionMatches.length;
        updateTrainerSuggestionActiveItem();
    }

    if (event.key === "Enter" && trainerSuggestionActiveIndex >= 0) {
        event.preventDefault();
        selectActiveTrainerSuggestion();
    }

    if (event.key === "Escape") {
        menu.hidden = true;
    }
}

function getTrainerDisplayName(trainer) {
    const mainName = getName(trainer, currentLang);
    const secondaryName = getName(trainer, getOtherLang());

    return mainName === secondaryName ? mainName : `${mainName} (${secondaryName})`;
}

function createPlaceholderOption(label) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = label;
    option.disabled = true;
    option.selected = true;
    return option;
}

// Fills the trainer select while preserving the source data order.
function populateTrainerSelect(selectedTrainerId = null) {
    const select = dom.trainerSelect;
    const previousValue = selectedTrainerId ?? select.value;
    const activeSeries = getActiveSeries();

    select.replaceChildren();
    select.appendChild(createPlaceholderOption(translate("ui", "trainerSelectPlaceholder")));

    if (activeSeries.length === 0) {
        return;
    }

    if (activeSeries.length === 1) {
        for (const trainer of getTrainersForSeries(activeSeries[0])) {
        select.appendChild(createTrainerOption(trainer));
        }
    } else {
        for (const serie of activeSeries) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = translate("series", serie.id);

        for (const trainer of getTrainersForSeries(serie)) {
            optgroup.appendChild(createTrainerOption(trainer));
        }

        select.appendChild(optgroup);
        }
    }

    const visibleIds = getVisibleTrainerIds();

    if (previousValue && visibleIds.has(previousValue)) {
        select.value = previousValue;
    }
    populateTrainerSuggestions();
}

// Synchronizes free text input and trainer select.
function bindTextToTrainerSelect() {
  const input = dom.trainerTextInput;
  const select = dom.trainerSelect;

  input.addEventListener("input", () => {
    const search = normalizeText(input.value);
    
    populateTrainerSuggestions(input.value);

    if (!search) {
      select.value = "";
      return;
    }

    const options = Array.from(select.options);
    const matchingOption = options.find((option) => {
        const trainer = getTrainerById(option.value);
        return trainer && getTrainerSearchText(trainer).includes(search);
    });

    if (matchingOption) {
      select.value = matchingOption.value;
    }
  });

input.addEventListener("blur", () => {
    setTimeout(() => {
        dom.trainerSuggestions.hidden = true;
    }, 100);
});

    select.addEventListener("change", () => {
        const trainer = getTrainerById(select.value);
        selectTrainerAndRender(trainer);
    });
}

function populateSeriesFilter() {
    const menu = dom.seriesFilterMenu;
    menu.replaceChildren();

    menu.appendChild(createSeriesFilterRadio("all", translate("ui", "allSeries")));

    for (const serie of frontierSeries) {
        menu.appendChild(createSeriesFilterRadio(serie.id, translate("series", serie.id)));
    }

    updateSeriesFilterButtonLabel();
}

function createSeriesFilterRadio(value, labelText) {
    const label = document.createElement("label");
    label.className = "series-filter-item";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "series-filter";
    radio.value = value;
    radio.checked = selectedSeriesId === value;

    radio.addEventListener("change", () => {
        selectedSeriesId = value;

        clearTrainerDisplay();
        populateTrainerSelect();
        syncTrainerInputWithSelect();
        updateSeriesFilterButtonLabel();
        closeSeriesFilterMenu();
    });

    label.append(radio, labelText);

    return label;
}

function toggleSeriesFilterMenu() {
    const menu = dom.seriesFilterMenu;
    menu.hidden = !menu.hidden;
}

function closeSeriesFilterMenu() {
    dom.seriesFilterMenu.hidden = true;
}

function updateSeriesFilterButtonLabel() {
    dom.seriesFilterButton.textContent = selectedSeriesId === "all"
        ? translate("ui", "allSeries")
        : translate("series", selectedSeriesId);
}

function clearTrainerDisplay() {
    currentTrainer = null;
    currentOpponentSpeciesId = null;
    possibleSetIds.clear();

    dom.resultsContainer.hidden = true;
    dom.trainerTitle.textContent = "";
    dom.trainerInfo.textContent = "";
    dom.pokemonResults.replaceChildren();

    dom.opponentPokemonInput.value = "";
    dom.opponentPokemonSelect.replaceChildren();
    dom.opponentSearchContainer.hidden = true;

    dom.selectedPokemonDetails.replaceChildren();
    dom.selectedPokemonDetails.hidden = true;
}

function getActiveSeries() {
    if (selectedSeriesId === "all") {
        return frontierSeries;
    }

    return frontierSeries.filter((serie) => serie.id === selectedSeriesId);
}

function getTrainersForSeries(serie) {
    return getTrainerList().filter((trainer) =>
        trainer.number >= serie.start && trainer.number <= serie.end
    );
}

function getVisibleTrainerIds() {
    const ids = new Set();

    for (const serie of getActiveSeries()) {
        for (const trainer of getTrainersForSeries(serie)) {
        ids.add(trainer.id);
        }
    }

    return ids;
}

function createTrainerOption(trainer) {
    const option = document.createElement("option");
    option.value = trainer.id;

    const mainName = getName(trainer, currentLang);
    const secondaryName = getName(trainer, getOtherLang());

    option.textContent = mainName === secondaryName ? mainName : `${mainName} (${secondaryName})`;

    return option;
}

function syncTrainerInputWithSelect() {
    const select = dom.trainerSelect;
    const input = dom.trainerTextInput;
    const trainer = getTrainerById(select.value);

    input.value = trainer ? getName(trainer) : "";
}

function findTrainerByInputValue(value) {
    const normalizedValue = normalizeText(value);
    const visibleIds = getVisibleTrainerIds();

    return getTrainerList().find((trainer) => {
        if (!visibleIds.has(trainer.id)) {
        return false;
        }

        return (
        normalizeText(getTrainerDisplayName(trainer)) === normalizedValue ||
        normalizeText(getName(trainer, "fr")) === normalizedValue ||
        normalizeText(getName(trainer, "en")) === normalizedValue
        );
    });
}