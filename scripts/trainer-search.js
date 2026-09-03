"use strict";

// -----------------------------------------------------------------------------
// Trainer data access, trainer search, and series filter
// -----------------------------------------------------------------------------

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

function getTrainerSlotDom(slotIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    return dom.trainerSlots[slotIndex];
}

function isTrainerSelectedInOtherSlot(trainerId, slotIndex) {
    if (battleState.format !== "multi") {
        return false;
    }

    return battleState.trainers.some((trainerState, otherSlotIndex) =>
        otherSlotIndex !== slotIndex && trainerState.trainer?.id === trainerId
    );
}

function getAvailableTrainersForSlot(slotIndex) {
    const visibleIds = getVisibleTrainerIds();

    return getTrainerList()
        .filter((trainer) => visibleIds.has(trainer.id))
        .filter((trainer) => !isTrainerSelectedInOtherSlot(trainer.id, slotIndex));
}

function populateTrainerSuggestions(search = "", slotIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const trainerState = getTrainerBattleState(slotIndex);
    const slotDom = getTrainerSlotDom(slotIndex);

    slotDom.suggestions.replaceChildren();

    const normalizedSearch = normalizeText(search);

    if (normalizedSearch.length < 2) {
        slotDom.suggestions.hidden = true;
        return;
    }

    const matches = getAvailableTrainersForSlot(slotIndex)
        .filter((trainer) => getTrainerSearchText(trainer).includes(normalizedSearch))
        .slice(0, 12);

    trainerState.suggestionMatches = matches;
    trainerState.suggestionActiveIndex = -1;

    if (matches.length === 0) {
        slotDom.suggestions.hidden = true;
        return;
    }

    matches.forEach((trainer, index) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = getTrainerDisplayName(trainer);
        item.dataset.index = index;

        item.addEventListener("mousedown", (event) => {
            event.preventDefault();
            selectTrainerAndRender(trainer, slotIndex);
        });

        slotDom.suggestions.appendChild(item);
    });

    slotDom.suggestions.hidden = false;
}

function updateTrainerSuggestionActiveItem(slotIndex) {
    const trainerState = getTrainerBattleState(slotIndex);
    const items = getTrainerSlotDom(slotIndex).suggestions.querySelectorAll(".suggestion-item");

    items.forEach((item, index) => {
        item.classList.toggle("active", index === trainerState.suggestionActiveIndex);
    });
}

function selectActiveTrainerSuggestion(slotIndex) {
    const trainerState = getTrainerBattleState(slotIndex);
    const trainer = trainerState.suggestionMatches[trainerState.suggestionActiveIndex];

    if (trainer) {
        selectTrainerAndRender(trainer, slotIndex);
    }
}

function handleTrainerSuggestionKeyboard(event, slotIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const trainerState = getTrainerBattleState(slotIndex);
    const menu = getTrainerSlotDom(slotIndex).suggestions;
    const matches = trainerState.suggestionMatches;

    if (menu.hidden || matches.length === 0) {
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        trainerState.suggestionActiveIndex = (trainerState.suggestionActiveIndex + 1) % matches.length;
        updateTrainerSuggestionActiveItem(slotIndex);
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        trainerState.suggestionActiveIndex =
            (trainerState.suggestionActiveIndex - 1 + matches.length) % matches.length;
        updateTrainerSuggestionActiveItem(slotIndex);
    }

    if (event.key === "Enter" && trainerState.suggestionActiveIndex >= 0) {
        event.preventDefault();
        selectActiveTrainerSuggestion(slotIndex);
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
function populateTrainerSelect(slotIndex = PRIMARY_TRAINER_SLOT_INDEX, selectedTrainerId = null) {
    const slotDom = getTrainerSlotDom(slotIndex);
    const previousValue = selectedTrainerId ?? slotDom.select.value;
    const activeSeries = getActiveSeries();

    slotDom.select.replaceChildren();
    slotDom.select.appendChild(createPlaceholderOption(translate("ui", "trainerSelectPlaceholder")));

    for (const serie of activeSeries) {
        const trainers = getTrainersForSeries(serie)
            .filter((trainer) => !isTrainerSelectedInOtherSlot(trainer.id, slotIndex));

        if (trainers.length === 0) {
            continue;
        }

        if (activeSeries.length === 1) {
            trainers.forEach((trainer) => slotDom.select.appendChild(createTrainerOption(trainer)));
            continue;
        }

        const optgroup = document.createElement("optgroup");
        optgroup.label = translate("series", serie.id);

        trainers.forEach((trainer) => optgroup.appendChild(createTrainerOption(trainer)));
        slotDom.select.appendChild(optgroup);
    }

    if (previousValue && Array.from(slotDom.select.options).some((option) => option.value === previousValue)) {
        slotDom.select.value = previousValue;
    }
}

function clearTrainerSlotSelection(slotIndex) {
    const trainerState = getTrainerBattleState(slotIndex);
    const slotDom = getTrainerSlotDom(slotIndex);

    trainerState.trainer = null;
    trainerState.suggestionMatches = [];
    trainerState.suggestionActiveIndex = -1;

    resetTrainerBattleExclusions(slotIndex);

    for (const opponentSlotIndex of getOpponentSlotIndexesForTrainer(slotIndex)) {
        resetOpponentBattleState(opponentSlotIndex);
    }

    slotDom.input.value = "";
    slotDom.select.value = "";
    slotDom.suggestions.replaceChildren();
    slotDom.suggestions.hidden = true;

    clearExcludedPokemonInput(slotIndex);
    clearExcludedItemInput(slotIndex);

    if (battleState.format === "multi") {
        for (let trainerIndex = 0; trainerIndex < getActiveTrainerCount(); trainerIndex++) {
            const selectedTrainerId = getTrainerBattleState(trainerIndex).trainer?.id ?? null;
            populateTrainerSelect(trainerIndex, selectedTrainerId);
        }
    }

    renderBattleResults();
    updateSelectedPokemonPresence();
}

// Synchronizes free text input and trainer select.
function bindTrainerSlotEvents(slotIndex) {
    const slotDom = getTrainerSlotDom(slotIndex);

    slotDom.input.addEventListener("input", () => {
        const search = normalizeText(slotDom.input.value);

        populateTrainerSuggestions(slotDom.input.value, slotIndex);

        if (!search) {
            clearTrainerSlotSelection(slotIndex);
            return;
        }

        const matchingOption = Array.from(slotDom.select.options).find((option) => {
            const trainer = getTrainerById(option.value);
            return trainer && getTrainerSearchText(trainer).includes(search);
        });

        if (matchingOption) {
            slotDom.select.value = matchingOption.value;
        }
    });

    slotDom.input.addEventListener("keydown", (event) => {
        handleTrainerSuggestionKeyboard(event, slotIndex);
    });

    slotDom.clearButton.addEventListener("click", () => {
        clearTrainerSlotSelection(slotIndex);
        slotDom.input.focus();
    });

    slotDom.input.addEventListener("blur", () => {
        setTimeout(() => {
            slotDom.suggestions.hidden = true;
        }, 100);
    });

    slotDom.select.addEventListener("change", () => {
        selectTrainerAndRender(getTrainerById(slotDom.select.value), slotIndex);
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

        for (let trainerIndex = 0; trainerIndex < getActiveTrainerCount(); trainerIndex++) {
            populateTrainerSelect(trainerIndex);
        }

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
    battleState.trainers.forEach((trainerState, trainerIndex) => {
        trainerState.trainer = null;
        trainerState.suggestionMatches = [];
        trainerState.suggestionActiveIndex = -1;

        resetTrainerBattleExclusions(trainerIndex);

        const slotDom = getTrainerSlotDom(trainerIndex);

        slotDom.input.value = "";
        slotDom.select.replaceChildren();
        slotDom.suggestions.replaceChildren();
        slotDom.suggestions.hidden = true;
    });

    resetAllOpponentBattleStates();

    dom.trainerTitle.textContent = "";
    dom.trainerInfo.textContent = "";

    dom.trainerPanels.forEach((panelDom) => {
        panelDom.container.hidden = true;
        panelDom.table.replaceChildren();
        panelDom.exclusions.container.hidden = true;
    });

    dom.opponentSlots.forEach((slotDom) => {
        slotDom.input.value = "";
        slotDom.select.replaceChildren();
        slotDom.suggestions.replaceChildren();
        slotDom.suggestions.hidden = true;
        slotDom.details.replaceChildren();
        slotDom.details.hidden = true;
    });

    dom.singleTrainerHeader.hidden = false;
    dom.opponentSearchContainer.hidden = true;

    dom.resultsContainer.hidden = true;
    dom.resultsContainer.classList.remove("has-selected-pokemon", "is-doubles", "is-multi");
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