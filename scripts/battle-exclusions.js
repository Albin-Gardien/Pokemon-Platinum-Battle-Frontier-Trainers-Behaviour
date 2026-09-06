"use strict";

// -----------------------------------------------------------------------------
// Battle exclusion state and limits
// -----------------------------------------------------------------------------

// Returns battle exclusion limit
function getBattleExclusionLimit() {
    if (isFactoryMode()) {
        if (battleState.format === "doubles") {
            return 2;
        }

        if (battleState.format === "multi") {
            return 3;
        }
    }

    return getBattleFormatConfig().exclusionLimit;
}

// Returns battle exclusions
function getBattleExclusions(trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    return getTrainerBattleExclusions(trainerIndex);
}

// Returns battle exclusion DOM
function getBattleExclusionDom(trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    return dom.trainerPanels[trainerIndex].exclusions;
}

// Creates excluded suggestion state.
function createExcludedSuggestionState() {
    return {
        pokemonMatches: [],
        pokemonActiveIndex: -1,
        itemMatches: [],
        itemActiveIndex: -1
    };
}

const excludedSuggestionStates = battleState.trainers.map(() => createExcludedSuggestionState());

// Returns excluded suggestion state
function getExcludedSuggestionState(trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    return excludedSuggestionStates[trainerIndex];
}

// Resets battle exclusions
function resetBattleExclusions(trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const battleExclusions = getBattleExclusions(trainerIndex);
    const suggestionState = getExcludedSuggestionState(trainerIndex);

    battleExclusions.speciesIds.clear();
    battleExclusions.itemIds.clear();

    suggestionState.pokemonMatches = [];
    suggestionState.pokemonActiveIndex = -1;
    suggestionState.itemMatches = [];
    suggestionState.itemActiveIndex = -1;
}

// Returns whether mon excluded
function isMonExcluded(mon, trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const battleExclusions = getBattleExclusions(trainerIndex);

    return battleExclusions.speciesIds.has(mon.speciesId) || battleExclusions.itemIds.has(mon.item);
}

// -----------------------------------------------------------------------------
// Exclusion interface rendering
// -----------------------------------------------------------------------------

// Refreshes battle exclusion interface
function refreshBattleExclusionInterface(trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const exclusionDom = getBattleExclusionDom(trainerIndex);

    if (isHallMode() || !hasBattlePokemonSource(trainerIndex)) {
        exclusionDom.container.hidden = true;
        return;
    }

    exclusionDom.pokemonLabel.textContent = translate("ui", "excludedPokemonLabel");
    exclusionDom.itemLabel.textContent = translate("ui", "excludedItemLabel");
    exclusionDom.itemField.hidden = isArcadeMode();

    renderBattleExclusionTags(trainerIndex);
    updateBattleExclusionInputsState(trainerIndex);

    exclusionDom.container.hidden = false;
}

// Updates battle exclusion inputs state
function updateBattleExclusionInputsState(trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const battleExclusions = getBattleExclusions(trainerIndex);
    const exclusionDom = getBattleExclusionDom(trainerIndex);

    const pokemonLimitReached = battleExclusions.speciesIds.size >= getBattleExclusionLimit();
    const itemLimitReached = battleExclusions.itemIds.size >= getBattleExclusionLimit();

    updateBattleExclusionInputState({
        input: exclusionDom.pokemonInput,
        suggestions: exclusionDom.pokemonSuggestions,
        limitReached: pokemonLimitReached,
        placeholder: translate("ui", "excludedPokemonPlaceholder")
    });

    updateBattleExclusionInputState({
        input: exclusionDom.itemInput,
        suggestions: exclusionDom.itemSuggestions,
        limitReached: itemLimitReached,
        placeholder: translate("ui", "excludedItemPlaceholder")
    });
}

// Updates battle exclusion input state
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

// Renders battle exclusion tags
function renderBattleExclusionTags(trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const battleExclusions = getBattleExclusions(trainerIndex);
    const exclusionDom = getBattleExclusionDom(trainerIndex);

    renderMultiSelectTags({
        container: exclusionDom.pokemonTags,
        values: [...battleExclusions.speciesIds],
        getLabel: (speciesId) => getExcludedSpeciesLabel(speciesId, trainerIndex),
        onRemove: (speciesId) => removeExcludedSpecies(speciesId, trainerIndex)
    });

    renderMultiSelectTags({
        container: exclusionDom.itemTags,
        values: [...battleExclusions.itemIds],
        getLabel: (itemId) => translateEntity("items", itemId),
        onRemove: (itemId) => removeExcludedItem(itemId, trainerIndex)
    });
}

// Renders multi select tags
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

// Returns excluded species label
function getExcludedSpeciesLabel(speciesId, trainerIndex) {
    const mon = getAvailableBattleMons(trainerIndex).find((candidate) => candidate.speciesId === speciesId);

    return mon ? getPokemonDisplayName(mon) : speciesId;
}

// -----------------------------------------------------------------------------
// Exclusion mutations
// -----------------------------------------------------------------------------

// Adds excluded species
function addExcludedSpecies(speciesId, trainerIndex) {
    const battleExclusions = getBattleExclusions(trainerIndex);

    if (battleExclusions.speciesIds.has(speciesId)) {
        return;
    }

    if (battleExclusions.speciesIds.size >= getBattleExclusionLimit()) {
        return;
    }

    battleExclusions.speciesIds.add(speciesId);

    clearExcludedPokemonInput(trainerIndex);
    refreshAfterBattleExclusionChange(trainerIndex);
}

// Removes excluded species
function removeExcludedSpecies(speciesId, trainerIndex) {
    const battleExclusions = getBattleExclusions(trainerIndex);

    battleExclusions.speciesIds.delete(speciesId);
    refreshAfterBattleExclusionChange(trainerIndex);
}

// Adds excluded item
function addExcludedItem(itemId, trainerIndex) {
    const battleExclusions = getBattleExclusions(trainerIndex);

    if (battleExclusions.itemIds.has(itemId)) {
        return;
    }

    if (battleExclusions.itemIds.size >= getBattleExclusionLimit()) {
        return;
    }

    battleExclusions.itemIds.add(itemId);

    clearExcludedItemInput(trainerIndex);
    refreshAfterBattleExclusionChange(trainerIndex);
}

// Removes excluded item
function removeExcludedItem(itemId, trainerIndex) {
    const battleExclusions = getBattleExclusions(trainerIndex);

    battleExclusions.itemIds.delete(itemId);
    refreshAfterBattleExclusionChange(trainerIndex);
}

// Clears excluded pokemon input
function clearExcludedPokemonInput(trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const exclusionDom = getBattleExclusionDom(trainerIndex);

    exclusionDom.pokemonInput.value = "";
    exclusionDom.pokemonSuggestions.hidden = true;
}

// Clears excluded item input
function clearExcludedItemInput(trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const exclusionDom = getBattleExclusionDom(trainerIndex);

    exclusionDom.itemInput.value = "";
    exclusionDom.itemSuggestions.hidden = true;
}

// -----------------------------------------------------------------------------
// Exclusion autocomplete
// -----------------------------------------------------------------------------

// Populates excluded pokemon suggestions
function populateExcludedPokemonSuggestions(search, trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const battleExclusions = getBattleExclusions(trainerIndex);
    const exclusionDom = getBattleExclusionDom(trainerIndex);
    const suggestionState = getExcludedSuggestionState(trainerIndex);
    const menu = exclusionDom.pokemonSuggestions;

    menu.replaceChildren();

    suggestionState.pokemonMatches = [];
    suggestionState.pokemonActiveIndex = -1;

    if (battleExclusions.speciesIds.size >= getBattleExclusionLimit()) {
        menu.hidden = true;
        return;
    }

    const normalizedSearch = normalizeText(search);

    if (normalizedSearch.length < 2) {
        menu.hidden = true;
        return;
    }

    const matches = getUniqueSpeciesFromOpponentSource(trainerIndex)
        .filter((mon) => !battleExclusions.speciesIds.has(mon.speciesId))
        .filter((mon) =>
            normalizeText(getPokemonDisplayName(mon)).includes(normalizedSearch) ||
            normalizeText(getName(mon, "fr")).includes(normalizedSearch) ||
            normalizeText(getName(mon, "en")).includes(normalizedSearch)
        )
        .slice(0, 12);

    suggestionState.pokemonMatches = matches;

    buildSuggestionMenu({
        menu,
        matches,
        getLabel: getPokemonDisplayName,
        onSelect: (mon) => addExcludedSpecies(mon.speciesId, trainerIndex)
    });
}

// Populates excluded item suggestions
function populateExcludedItemSuggestions(search, trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const battleExclusions = getBattleExclusions(trainerIndex);
    const exclusionDom = getBattleExclusionDom(trainerIndex);
    const suggestionState = getExcludedSuggestionState(trainerIndex);
    const menu = exclusionDom.itemSuggestions;

    menu.replaceChildren();

    suggestionState.itemMatches = [];
    suggestionState.itemActiveIndex = -1;

    if (battleExclusions.itemIds.size >= getBattleExclusionLimit()) {
        menu.hidden = true;
        return;
    }

    const normalizedSearch = normalizeText(search);

    if (normalizedSearch.length < 2) {
        menu.hidden = true;
        return;
    }

    const matches = getUniqueItemsFromOpponentSource(trainerIndex)
        .filter((itemId) => !battleExclusions.itemIds.has(itemId))
        .filter((itemId) => normalizeText(translateEntity("items", itemId)).includes(normalizedSearch))
        .slice(0, 12);

    suggestionState.itemMatches = matches;

    buildSuggestionMenu({
        menu,
        matches,
        getLabel: (itemId) => translateEntity("items", itemId),
        onSelect: (itemId) => addExcludedItem(itemId, trainerIndex)
    });
}

// Builds suggestion menu
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

// Updates excluded suggestion active item
function updateExcludedSuggestionActiveItem(menu, activeIndex) {
    const items = menu.querySelectorAll(".suggestion-item");

    items.forEach((item, index) => {
        item.classList.toggle("active", index === activeIndex);
    });
}

// Handles excluded pokemon suggestion keyboard
function handleExcludedPokemonSuggestionKeyboard(event, trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const exclusionDom = getBattleExclusionDom(trainerIndex);
    const suggestionState = getExcludedSuggestionState(trainerIndex);

    if (exclusionDom.pokemonInput.disabled) {
        return;
    }

    const changed = handleExcludedSuggestionKeyboard({
        event,
        menu: exclusionDom.pokemonSuggestions,
        matches: suggestionState.pokemonMatches,
        getActiveIndex: () => suggestionState.pokemonActiveIndex,
        setActiveIndex: (index) => {
            suggestionState.pokemonActiveIndex = index;
        },
        onSelect: (mon) => addExcludedSpecies(mon.speciesId, trainerIndex)
    });

    if (changed) {
        updateExcludedSuggestionActiveItem(exclusionDom.pokemonSuggestions, suggestionState.pokemonActiveIndex);
    }
}

// Handles excluded item suggestion keyboard
function handleExcludedItemSuggestionKeyboard(event, trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const exclusionDom = getBattleExclusionDom(trainerIndex);
    const suggestionState = getExcludedSuggestionState(trainerIndex);

    if (exclusionDom.itemInput.disabled) {
        return;
    }

    const changed = handleExcludedSuggestionKeyboard({
        event,
        menu: exclusionDom.itemSuggestions,
        matches: suggestionState.itemMatches,
        getActiveIndex: () => suggestionState.itemActiveIndex,
        setActiveIndex: (index) => {
            suggestionState.itemActiveIndex = index;
        },
        onSelect: (itemId) => addExcludedItem(itemId, trainerIndex)
    });

    if (changed) {
        updateExcludedSuggestionActiveItem(exclusionDom.itemSuggestions, suggestionState.itemActiveIndex);
    }
}

// Handles excluded suggestion keyboard
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
    }

    return false;
}

// -----------------------------------------------------------------------------
// Exclusion source helpers
// -----------------------------------------------------------------------------

// Returns unique species from opponent source
function getUniqueSpeciesFromOpponentSource(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const uniqueSpecies = [];

    for (const mon of getAvailableOpponentBattleMons(sourceIndex)) {
        if (!uniqueSpecies.some((existing) => existing.speciesId === mon.speciesId)) {
            uniqueSpecies.push(mon);
        }
    }

    return uniqueSpecies;
}

// Returns unique items from opponent source
function getUniqueItemsFromOpponentSource(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    const uniqueItems = new Set();

    for (const mon of getAvailableOpponentBattleMons(sourceIndex)) {
        if (mon.item) {
            uniqueItems.add(mon.item);
        }
    }

    return [...uniqueItems];
}

// Returns opponent slot indexes for battle exclusion source
function getOpponentSlotIndexesForBattleExclusionSource(sourceIndex) {
    if (isFactoryMode()) {
        return Array.from(
            { length: getActiveOpponentCount() },
            (_, slotIndex) => slotIndex
        );
    }

    return getOpponentSlotIndexesForTrainer(sourceIndex);
}

// -----------------------------------------------------------------------------
// Exclusion refresh
// -----------------------------------------------------------------------------

// Refreshes after battle exclusion change
function refreshAfterBattleExclusionChange(sourceIndex) {
    if (!hasBattlePokemonSource(sourceIndex)) {
        return;
    }

    renderBattlePokemonSource(sourceIndex);
    refreshOpponentBattleInterface();

    for (const opponentSlotIndex of getOpponentSlotIndexesForBattleExclusionSource(sourceIndex)) {
        refreshSelectedPokemonDetailsAfterExclusionChange(opponentSlotIndex);
    }
}

// Refreshes selected pokemon details after exclusion change
function refreshSelectedPokemonDetailsAfterExclusionChange(slotIndex) {
    const sourceIndex = getBattlePokemonSourceIndexForOpponentSlot(slotIndex);
    const opponentState = getOpponentBattleState(slotIndex);
    const slotDom = getOpponentSlotDom(slotIndex);

    if (!hasBattlePokemonSourceForOpponentSlot(slotIndex) || !opponentState.speciesId) {
        return;
    }

    const availableSets = getSelectedPokemonSets(opponentState.speciesId, slotIndex)
        .filter((mon) => !isMonExcluded(mon, sourceIndex));

    if (availableSets.length === 0) {
        clearOpponentPokemonSelection(slotIndex);
        return;
    }

    opponentState.possibleSetIds = new Set(
        availableSets.filter((mon) => opponentState.possibleSetIds.has(mon.id)).map((mon) => mon.id)
    );

    if (opponentState.possibleSetIds.size === 0) {
        opponentState.possibleSetIds = new Set(availableSets.map((mon) => mon.id));
    }

    slotDom.select.value = opponentState.speciesId;
    renderSelectedPokemonDetails(opponentState.speciesId, slotIndex);
}

// -----------------------------------------------------------------------------
// Exclusion events
// -----------------------------------------------------------------------------

// Binds battle exclusion events
function bindBattleExclusionEvents(trainerIndex) {
    const exclusionDom = getBattleExclusionDom(trainerIndex);

    exclusionDom.pokemonInput.addEventListener("input", (event) => {
        populateExcludedPokemonSuggestions(event.target.value, trainerIndex);
    });

    exclusionDom.itemInput.addEventListener("input", (event) => {
        populateExcludedItemSuggestions(event.target.value, trainerIndex);
    });

    exclusionDom.pokemonInput.addEventListener("keydown", (event) => {
        handleExcludedPokemonSuggestionKeyboard(event, trainerIndex);
    });

    exclusionDom.itemInput.addEventListener("keydown", (event) => {
        handleExcludedItemSuggestionKeyboard(event, trainerIndex);
    });

    exclusionDom.pokemonInput.addEventListener("blur", () => {
        setTimeout(() => {
            exclusionDom.pokemonSuggestions.hidden = true;
        }, 100);
    });

    exclusionDom.itemInput.addEventListener("blur", () => {
        setTimeout(() => {
            exclusionDom.itemSuggestions.hidden = true;
        }, 100);
    });
}