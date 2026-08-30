"use strict";

const MAX_BATTLE_EXCLUSIONS = 2;

const battleExclusions = {
    speciesIds: new Set(),
    itemIds: new Set()
};

let excludedPokemonSuggestionMatches = [];
let excludedPokemonSuggestionActiveIndex = -1;

let excludedItemSuggestionMatches = [];
let excludedItemSuggestionActiveIndex = -1;

function resetBattleExclusions() {
    battleExclusions.speciesIds.clear();
    battleExclusions.itemIds.clear();
}

function isMonExcluded(mon) {
    return battleExclusions.speciesIds.has(mon.speciesId)
        || battleExclusions.itemIds.has(mon.item);
}

function refreshBattleExclusionInterface() {
    if (!currentTrainer) {
        dom.battleExclusionsContainer.hidden = true;
        return;
    }

    dom.excludedPokemonLabel.textContent = translate("ui", "excludedPokemonLabel");
    dom.excludedItemLabel.textContent = translate("ui", "excludedItemLabel");

    renderBattleExclusionTags();
    updateBattleExclusionInputsState();

    dom.battleExclusionsContainer.hidden = false;
}

function updateBattleExclusionInputsState() {
    const pokemonLimitReached = battleExclusions.speciesIds.size >= MAX_BATTLE_EXCLUSIONS;
    const itemLimitReached = battleExclusions.itemIds.size >= MAX_BATTLE_EXCLUSIONS;

    updateBattleExclusionInputState({
        input: dom.excludedPokemonInput,
        suggestions: dom.excludedPokemonSuggestions,
        limitReached: pokemonLimitReached,
        placeholder: translate("ui", "excludedPokemonPlaceholder")
    });

    updateBattleExclusionInputState({
        input: dom.excludedItemInput,
        suggestions: dom.excludedItemSuggestions,
        limitReached: itemLimitReached,
        placeholder: translate("ui", "excludedItemPlaceholder")
    });
}

function updateBattleExclusionInputState({ input, suggestions, limitReached, placeholder }) {
    const field = input.closest(".multi-select-field");

    input.disabled = limitReached;
    input.hidden = limitReached;
    input.placeholder = limitReached ? "" : placeholder;

    field.classList.toggle("multi-select-field-full", limitReached);

    if (limitReached) {
        input.value = "";
        suggestions.hidden = true;
    }
}

function renderBattleExclusionTags() {
    renderMultiSelectTags({
        container: dom.excludedPokemonTags,
        values: [...battleExclusions.speciesIds],
        getLabel: getExcludedSpeciesLabel,
        onRemove: removeExcludedSpecies
    });

    renderMultiSelectTags({
        container: dom.excludedItemTags,
        values: [...battleExclusions.itemIds],
        getLabel: (itemId) => translateEntity("items", itemId),
        onRemove: removeExcludedItem
    });
}

function renderMultiSelectTags({ container, values, getLabel, onRemove }) {
    container.replaceChildren();

    for (const value of values) {
        const tag = document.createElement("span");
        tag.className = "multi-select-tag";

        const text = document.createElement("span");
        text.textContent = getLabel(value);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "multi-select-tag-remove";
        button.textContent = "×";
        button.addEventListener("click", () => {
            onRemove(value);
        });

        tag.append(text, button);
        container.appendChild(tag);
    }
}

function getExcludedSpeciesLabel(speciesId) {
    const mon = getUniqueSpeciesFromCurrentTrainer()
        .find((species) => species.speciesId === speciesId);

    return mon ? getPokemonDisplayName(mon) : speciesId;
}

function addExcludedSpecies(speciesId) {
    if (battleExclusions.speciesIds.has(speciesId)) {
        return;
    }

    if (battleExclusions.speciesIds.size >= MAX_BATTLE_EXCLUSIONS) {
        return;
    }

    battleExclusions.speciesIds.add(speciesId);
    clearExcludedPokemonInput();
    refreshAfterBattleExclusionChange();
}

function removeExcludedSpecies(speciesId) {
    battleExclusions.speciesIds.delete(speciesId);
    refreshAfterBattleExclusionChange();
}

function addExcludedItem(itemId) {
    if (battleExclusions.itemIds.has(itemId)) {
        return;
    }

    if (battleExclusions.itemIds.size >= MAX_BATTLE_EXCLUSIONS) {
        return;
    }

    battleExclusions.itemIds.add(itemId);
    clearExcludedItemInput();
    refreshAfterBattleExclusionChange();
}

function removeExcludedItem(itemId) {
    battleExclusions.itemIds.delete(itemId);
    refreshAfterBattleExclusionChange();
}

function clearExcludedPokemonInput() {
    dom.excludedPokemonInput.value = "";
    dom.excludedPokemonSuggestions.hidden = true;
}

function clearExcludedItemInput() {
    dom.excludedItemInput.value = "";
    dom.excludedItemSuggestions.hidden = true;
}

function populateExcludedPokemonSuggestions(search) {
    const menu = dom.excludedPokemonSuggestions;
    menu.replaceChildren();

    excludedPokemonSuggestionMatches = [];
    excludedPokemonSuggestionActiveIndex = -1;

    if (battleExclusions.speciesIds.size >= MAX_BATTLE_EXCLUSIONS) {
        menu.hidden = true;
        return;
    }

    const normalizedSearch = normalizeText(search);

    if (normalizedSearch.length < 2) {
        menu.hidden = true;
        return;
    }

    const matches = getUniqueSpeciesFromCurrentTrainer()
        .filter((mon) => !battleExclusions.speciesIds.has(mon.speciesId))
        .filter((mon) =>
            normalizeText(getPokemonDisplayName(mon)).includes(normalizedSearch) ||
            normalizeText(getName(mon, "fr")).includes(normalizedSearch) ||
            normalizeText(getName(mon, "en")).includes(normalizedSearch)
        )
        .slice(0, 12);

     excludedPokemonSuggestionMatches = matches;

    buildSuggestionMenu({
        menu,
        matches,
        getLabel: getPokemonDisplayName,
        onSelect: (mon) => addExcludedSpecies(mon.speciesId)
    });
}

function populateExcludedItemSuggestions(search) {
    const menu = dom.excludedItemSuggestions;
    menu.replaceChildren();

    excludedItemSuggestionMatches = [];
    excludedItemSuggestionActiveIndex = -1;

    if (battleExclusions.itemIds.size >= MAX_BATTLE_EXCLUSIONS) {
        menu.hidden = true;
        return;
    }

    const normalizedSearch = normalizeText(search);

    if (normalizedSearch.length < 2) {
        menu.hidden = true;
        return;
    }

    const matches = getUniqueItemsFromCurrentTrainer()
        .filter((itemId) => !battleExclusions.itemIds.has(itemId))
        .filter((itemId) =>
            normalizeText(translateEntity("items", itemId)).includes(normalizedSearch)
        )
        .slice(0, 12);

    excludedItemSuggestionMatches = matches;

    buildSuggestionMenu({
        menu,
        matches,
        getLabel: (itemId) => translateEntity("items", itemId),
        onSelect: addExcludedItem
    });
}

function buildSuggestionMenu({ menu, matches, getLabel, onSelect }) {
    if (matches.length === 0) {
        menu.hidden = true;
        return;
    }

    for (const value of matches) {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = getLabel(value);

        item.addEventListener("mousedown", (event) => {
            event.preventDefault();
            onSelect(value);
        });

        menu.appendChild(item);
    }

    menu.hidden = false;
}

function updateExcludedSuggestionActiveItem(menu) {
    const items = menu.querySelectorAll(".suggestion-item");

    items.forEach((item, index) => {
        item.classList.toggle("active", index === getExcludedSuggestionActiveIndex(menu));
    });
}

function getExcludedSuggestionActiveIndex(menu) {
    return menu === dom.excludedPokemonSuggestions
        ? excludedPokemonSuggestionActiveIndex
        : excludedItemSuggestionActiveIndex;
}

function handleExcludedPokemonSuggestionKeyboard(event) {
    if (dom.excludedPokemonInput.disabled) {
        return;
    }

    if (handleExcludedSuggestionKeyboard({
        event,
        menu: dom.excludedPokemonSuggestions,
        matches: excludedPokemonSuggestionMatches,
        getActiveIndex: () => excludedPokemonSuggestionActiveIndex,
        setActiveIndex: (index) => {
            excludedPokemonSuggestionActiveIndex = index;
        },
        onSelect: (mon) => addExcludedSpecies(mon.speciesId)
    })) {
        updateExcludedSuggestionActiveItem(dom.excludedPokemonSuggestions);
    }
}

function handleExcludedItemSuggestionKeyboard(event) {
    if (dom.excludedItemInput.disabled) {
        return;
    }

    if (handleExcludedSuggestionKeyboard({
        event,
        menu: dom.excludedItemSuggestions,
        matches: excludedItemSuggestionMatches,
        getActiveIndex: () => excludedItemSuggestionActiveIndex,
        setActiveIndex: (index) => {
            excludedItemSuggestionActiveIndex = index;
        },
        onSelect: addExcludedItem
    })) {
        updateExcludedSuggestionActiveItem(dom.excludedItemSuggestions);
    }
}

function handleExcludedSuggestionKeyboard({
    event,
    menu,
    matches,
    getActiveIndex,
    setActiveIndex,
    onSelect
}) {
    if (menu.hidden || matches.length === 0) {
        return false;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((getActiveIndex() + 1) % matches.length);
        return true;
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((getActiveIndex() - 1 + matches.length) % matches.length);
        return true;
    }

    if (event.key === "Enter" && getActiveIndex() >= 0) {
        event.preventDefault();
        onSelect(matches[getActiveIndex()]);
        return true;
    }

    if (event.key === "Escape") {
        menu.hidden = true;
        return false;
    }

    return false;
}

function getCurrentTrainerAvailableMons() {
    if (!currentTrainer) {
        return [];
    }

    const level = getSelectedLevel();

    return getTrainerMonsForLevel(currentTrainer, level);
}

function getUniqueSpeciesFromCurrentTrainer() {
    const uniqueSpecies = [];

    for (const mon of getCurrentTrainerAvailableMons()) {
        if (!uniqueSpecies.some((existing) => existing.speciesId === mon.speciesId)) {
            uniqueSpecies.push(mon);
        }
    }

    return uniqueSpecies;
}

function getUniqueItemsFromCurrentTrainer() {
    const uniqueItems = new Set();

    for (const mon of getCurrentTrainerAvailableMons()) {
        if (mon.item) {
            uniqueItems.add(mon.item);
        }
    }

    return [...uniqueItems];
}

function refreshAfterBattleExclusionChange() {
    if (!currentTrainer) {
        return;
    }

    renderTrainerTeam(currentTrainer);
    refreshSelectedPokemonDetailsAfterExclusionChange();
}

function refreshSelectedPokemonDetailsAfterExclusionChange() {
    if (!currentOpponentSpeciesId) {
        return;
    }

    const availableSets = getSelectedPokemonSets(currentTrainer, currentOpponentSpeciesId)
        .filter((mon) => !isMonExcluded(mon));

    if (availableSets.length === 0) {
        currentOpponentSpeciesId = null;
        possibleSetIds.clear();

        dom.opponentPokemonInput.value = "";
        dom.opponentPokemonSelect.value = "";
        dom.selectedPokemonDetails.hidden = true;
        return;
    }

    possibleSetIds = new Set(
        availableSets
            .filter((mon) => possibleSetIds.has(mon.id))
            .map((mon) => mon.id)
    );

    if (possibleSetIds.size === 0) {
        possibleSetIds = new Set(availableSets.map((mon) => mon.id));
    }

    dom.opponentPokemonSelect.value = currentOpponentSpeciesId;
    renderSelectedPokemonDetails(currentTrainer, currentOpponentSpeciesId);
}