"use strict";

// -----------------------------------------------------------------------------
// Factory player team state
// -----------------------------------------------------------------------------

const FACTORY_PLAYER_TEAM_MAX_SIZE = 4;

function getFactoryPlayerTeamSize() {
    return battleState.format === "multi" ? 4 : 3;
}

function createFactoryPlayerSlotState() {
    return {
        monId: null,
        suggestionMatches: [],
        suggestionActiveIndex: -1
    };
}

const factoryPlayerTeamState = {
    slots: Array.from(
        { length: FACTORY_PLAYER_TEAM_MAX_SIZE },
        () => createFactoryPlayerSlotState()
    )
};

function getFactoryPlayerSlotState(slotIndex) {
    return factoryPlayerTeamState.slots[slotIndex];
}

function getFactoryPlayerSlotDom(slotIndex) {
    return dom.factoryPlayerTeam.slots[slotIndex];
}

// -----------------------------------------------------------------------------
// Factory player team source
// -----------------------------------------------------------------------------

function getFactoryPlayerTeamCandidateMons() {
    if (!isFactoryMode()) {
        return [];
    }

    return getFactoryBattlePokemonSource()?.mons ?? [];
}

function getFactoryPlayerTeamMon(slotIndex) {
    const monId = getFactoryPlayerSlotState(slotIndex).monId;

    if (!monId) {
        return null;
    }

    return getFactoryPlayerTeamCandidateMons()
        .find((mon) => mon.id === monId) ?? null;
}

function getSelectedFactoryPlayerTeamMons() {
    return factoryPlayerTeamState.slots
        .slice(0, getFactoryPlayerTeamSize())
        .map((_, slotIndex) => getFactoryPlayerTeamMon(slotIndex))
        .filter(Boolean);
}

function getFactoryPlayerMonDisplayName(mon) {
    return `${getName(mon)} ${mon.setNumber ?? ""} — ${translate("columns", "iv")} ${getBattlePokemonIv(mon)}`;
}

function isMonExcludedByFactoryPlayerTeam(mon) {
    if (!isFactoryMode()) {
        return false;
    }

    return getSelectedFactoryPlayerTeamMons().some((playerMon) =>
        playerMon.speciesId === mon.speciesId ||
        (playerMon.item && mon.item && playerMon.item === mon.item)
    );
}

// -----------------------------------------------------------------------------
// Factory player team suggestions
// -----------------------------------------------------------------------------

function populateFactoryPlayerSuggestions(search, slotIndex) {
    const slotState = getFactoryPlayerSlotState(slotIndex);
    const slotDom = getFactoryPlayerSlotDom(slotIndex);

    slotDom.suggestions.replaceChildren();

    slotState.suggestionMatches = [];
    slotState.suggestionActiveIndex = -1;

    const normalizedSearch = normalizeText(search);

    if (normalizedSearch.length < 2) {
        slotDom.suggestions.hidden = true;
        return;
    }

    const matches = getFactoryPlayerTeamCandidateMons()
        .filter((mon) => {
            const searchableValues = [
                getFactoryPlayerMonDisplayName(mon),
                getName(mon, "fr"),
                getName(mon, "en"),
                `${getName(mon, "fr")} ${mon.setNumber ?? ""}`,
                `${getName(mon, "en")} ${mon.setNumber ?? ""}`,
                `${translate("columns", "iv")} ${getBattlePokemonIv(mon)}`
            ];

            return searchableValues.some((value) =>
                normalizeText(value).includes(normalizedSearch)
            );
        })
        .slice(0, 20);

    slotState.suggestionMatches = matches;

    if (matches.length === 0) {
        slotDom.suggestions.hidden = true;
        return;
    }

    matches.forEach((mon, index) => {
        const item = document.createElement("div");

        item.className = "suggestion-item";
        item.dataset.index = index;
        item.textContent = getFactoryPlayerMonDisplayName(mon);

        item.addEventListener("mousedown", (event) => {
            event.preventDefault();
            selectFactoryPlayerMon(mon, slotIndex);
        });

        slotDom.suggestions.appendChild(item);
    });

    slotDom.suggestions.hidden = false;
}

function updateFactoryPlayerSuggestionActiveItem(slotIndex) {
    const slotState = getFactoryPlayerSlotState(slotIndex);
    const slotDom = getFactoryPlayerSlotDom(slotIndex);
    const items = slotDom.suggestions.querySelectorAll(".suggestion-item");

    items.forEach((item, index) => {
        item.classList.toggle("active", index === slotState.suggestionActiveIndex);
    });
}

function handleFactoryPlayerSuggestionKeyboard(event, slotIndex) {
    const slotState = getFactoryPlayerSlotState(slotIndex);
    const slotDom = getFactoryPlayerSlotDom(slotIndex);
    const matches = slotState.suggestionMatches;

    if (slotDom.suggestions.hidden || matches.length === 0) {
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        slotState.suggestionActiveIndex = (slotState.suggestionActiveIndex + 1) % matches.length;

        updateFactoryPlayerSuggestionActiveItem(slotIndex);
        return;
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        slotState.suggestionActiveIndex = (slotState.suggestionActiveIndex - 1 + matches.length) % matches.length;

        updateFactoryPlayerSuggestionActiveItem(slotIndex);
        return;
    }

    if (event.key === "Enter" && slotState.suggestionActiveIndex >= 0) {
        event.preventDefault();

        selectFactoryPlayerMon(matches[slotState.suggestionActiveIndex], slotIndex);

        return;
    }

    if (event.key === "Escape") {
        slotDom.suggestions.hidden = true;
    }
}

// -----------------------------------------------------------------------------
// Factory player team selection
// -----------------------------------------------------------------------------

function selectFactoryPlayerMon(mon, slotIndex) {
    const slotState = getFactoryPlayerSlotState(slotIndex);
    const slotDom = getFactoryPlayerSlotDom(slotIndex);

    slotState.monId = mon.id;
    slotState.suggestionMatches = [];
    slotState.suggestionActiveIndex = -1;

    slotDom.input.value = getFactoryPlayerMonDisplayName(mon);
    slotDom.suggestions.replaceChildren();
    slotDom.suggestions.hidden = true;

    renderFactoryPlayerTeamSlot(slotIndex);
    refreshFactoryOpponentPoolAfterPlayerTeamChange();
}

function clearFactoryPlayerTeamSlot(slotIndex, refreshOpponentPool = true) {
    const slotState = getFactoryPlayerSlotState(slotIndex);
    const slotDom = getFactoryPlayerSlotDom(slotIndex);

    slotState.monId = null;
    slotState.suggestionMatches = [];
    slotState.suggestionActiveIndex = -1;

    slotDom.input.value = "";
    slotDom.suggestions.replaceChildren();
    slotDom.suggestions.hidden = true;
    slotDom.details.replaceChildren();
    slotDom.details.hidden = true;

    if (refreshOpponentPool) {
        refreshFactoryOpponentPoolAfterPlayerTeamChange();
    }
}

function resetFactoryPlayerTeam() {
    factoryPlayerTeamState.slots.forEach((_, slotIndex) => {
        clearFactoryPlayerTeamSlot(slotIndex, false);
    });
}

// -----------------------------------------------------------------------------
// Factory player team rendering
// -----------------------------------------------------------------------------

function buildFactoryPlayerMovesBlock(mon) {
    const movesBlock = document.createElement("div");
    movesBlock.className = "pokemon-detail-moves factory-player-moves";

    const title = document.createElement("p");
    title.className = "moves-title";
    title.textContent = translate("ui", "movesTitle");

    const grid = document.createElement("div");
    grid.className = "moves-grid";

    for (const moveId of mon.moves) {
        const move = document.createElement("div");
        move.className = "move-detail";

        applyTypeColor(move, getMoveType(moveId));

        const label = document.createElement("span");
        label.className = "move-detail-name";
        label.textContent = getMoveName(moveId);

        move.appendChild(label);
        grid.appendChild(move);
    }

    movesBlock.append(title, grid);

    return movesBlock;
}

function buildFactoryPlayerPokemonCard(mon) {
    const iv = getBattlePokemonIv(mon);
    const stats = calculateStats(mon, iv, getSelectedLevel());

    const card = document.createElement("article");
    card.className = "pokemon-detail-card factory-player-pokemon-card";

    const title = document.createElement("h3");
    title.className = "factory-player-pokemon-title";
    title.textContent = `${getName(mon)} ${mon.setNumber ?? ""}`;

    const content = document.createElement("div");
    content.className = "pokemon-detail-content";

    const sprite = document.createElement("img");
    sprite.className = "pokemon-detail-sprite";
    sprite.src = getPokemonFrontSpriteUrl(mon);
    sprite.alt = getName(mon);
    sprite.loading = "lazy";

    const info = document.createElement("div");
    info.className = "pokemon-detail-info";

    info.append(
        buildTypeInfoLine(mon.types),
        buildAbilitiesInfoLine(mon.abilities),
        buildNatureInfoLine(mon.nature),
        buildItemInfoLine(mon.item, getItemSpriteUrl(mon.item)),
        buildSimpleInfoLine(translate("columns", "iv"), iv)
    );

    const statsBlock = buildStatsBlock(stats);
    const movesBlock = buildFactoryPlayerMovesBlock(mon);

    content.append(sprite, info, statsBlock);
    card.append(title, content, movesBlock);

    return card;
}

function renderFactoryPlayerTeamSlot(slotIndex) {
    const slotDom = getFactoryPlayerSlotDom(slotIndex);
    const mon = getFactoryPlayerTeamMon(slotIndex);

    slotDom.details.replaceChildren();

    if (!mon) {
        slotDom.details.hidden = true;
        return;
    }

    slotDom.input.value = getFactoryPlayerMonDisplayName(mon);
    slotDom.details.appendChild(buildFactoryPlayerPokemonCard(mon));
    slotDom.details.hidden = false;
}

function renderFactoryPlayerTeam() {
    dom.factoryPlayerTeam.container.hidden = !isFactoryMode();

    if (!isFactoryMode()) {
        return;
    }

    const teamSize = getFactoryPlayerTeamSize();
    const isMulti = battleState.format === "multi";

    dom.factoryPlayerTeam.container.classList.toggle("is-multi", isMulti);

    factoryPlayerTeamState.slots.forEach((_, slotIndex) => {
        const slotDom = getFactoryPlayerSlotDom(slotIndex);
        const isActive = slotIndex < teamSize;

        slotDom.container.hidden = !isActive;

        if (isActive) {
            renderFactoryPlayerTeamSlot(slotIndex);
        }
    });
}

function applyFactoryPlayerTeamLanguage() {
    dom.factoryPlayerTeam.title.textContent = translate("ui", "factoryPlayerTeamTitle");

    dom.factoryPlayerTeam.slots.forEach((slotDom, slotIndex) => {
        slotDom.label.textContent = translate("ui", `factoryPlayerPokemon${slotIndex + 1}`);
        slotDom.input.placeholder = translate("ui", "factoryPlayerPokemonPlaceholder");

        const mon = getFactoryPlayerTeamMon(slotIndex);

        if (mon) {
            slotDom.input.value = getFactoryPlayerMonDisplayName(mon);
        }
    });
}

// -----------------------------------------------------------------------------
// Factory opponent refresh
// -----------------------------------------------------------------------------

function refreshFactoryOpponentPoolAfterPlayerTeamChange() {
    if (!isFactoryMode()) {
        return;
    }

    renderBattleResults();

    for (let slotIndex = 0; slotIndex < getActiveOpponentCount(); slotIndex++) {
        refreshSelectedPokemonDetailsAfterExclusionChange(slotIndex);
    }

    updateSelectedPokemonPresence();
}

// -----------------------------------------------------------------------------
// Factory player team events
// -----------------------------------------------------------------------------

function bindFactoryPlayerTeamEvents() {
    dom.factoryPlayerTeam.slots.forEach((slotDom, slotIndex) => {
        slotDom.input.addEventListener("input", (event) => {
            if (!event.target.value.trim()) {
                clearFactoryPlayerTeamSlot(slotIndex);
                return;
            }

            populateFactoryPlayerSuggestions(event.target.value, slotIndex);
        });

        slotDom.input.addEventListener("keydown", (event) => {
            handleFactoryPlayerSuggestionKeyboard(event, slotIndex);
        });

        slotDom.clearButton.addEventListener("click", () => {
            clearFactoryPlayerTeamSlot(slotIndex);
            slotDom.input.focus();
        });

        slotDom.input.addEventListener("blur", () => {
            setTimeout(() => {
                slotDom.suggestions.hidden = true;

                const mon = getFactoryPlayerTeamMon(slotIndex);
                slotDom.input.value = mon
                    ? getFactoryPlayerMonDisplayName(mon)
                    : "";
            }, 100);
        });
    });
}