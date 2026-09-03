"use strict";

// -----------------------------------------------------------------------------
// Opponent Pokémon selector and Pokémon detail cards
// -----------------------------------------------------------------------------

function getSelectedPokemonSets(speciesId, slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    return getAvailableBattleMonsForOpponentSlot(slotIndex)
        .filter((mon) => mon.speciesId === speciesId);
}

function getOpponentSlotDom(slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    return dom.opponentSlots[slotIndex];
}

function usesSharedOpponentTeamAcrossSlots() {
    return battleState.format === "doubles" ||
        (isFactoryMode() && battleState.format === "multi");
}

function isSpeciesSelectedInOtherOpponentSlot(speciesId, slotIndex) {
    if (!usesSharedOpponentTeamAcrossSlots()) {
        return false;
    }

    return battleState.opponents.some((opponentState, otherSlotIndex) =>
        otherSlotIndex !== slotIndex && opponentState.speciesId === speciesId
    );
}

function getUniqueAvailableOpponentSpecies(slotIndex) {
    const sourceIndex = getBattlePokemonSourceIndexForOpponentSlot(slotIndex);
    const mons = getAvailableBattleMonsForOpponentSlot(slotIndex);
    const uniqueSpecies = [];

    for (const mon of mons) {
        if (isMonExcluded(mon, sourceIndex) || isSpeciesSelectedInOtherOpponentSlot(mon.speciesId, slotIndex)) {
            continue;
        }

        if (!uniqueSpecies.some((existing) => existing.speciesId === mon.speciesId)) {
            uniqueSpecies.push(mon);
        }
    }

    return uniqueSpecies;
}

function findOpponentPokemonByInputValue(value, slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    const normalizedValue = normalizeText(value);

    return getUniqueAvailableOpponentSpecies(slotIndex).find((mon) =>
        normalizeText(getPokemonDisplayName(mon)) === normalizedValue ||
        normalizeText(getName(mon, "fr")) === normalizedValue ||
        normalizeText(getName(mon, "en")) === normalizedValue
    );
}

function findOpponentPokemonBySpeciesId(speciesId, slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    return getUniqueAvailableOpponentSpecies(slotIndex).find((mon) => mon.speciesId === speciesId);
}

function getPokemonDisplayName(mon) {
    const mainName = getName(mon, currentLang);
    const secondaryName = getName(mon, getOtherLang());

    return mainName === secondaryName ? mainName : `${mainName} (${secondaryName})`;
}

function selectSingleSetFromTable(mon, slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    if (!hasBattlePokemonSourceForOpponentSlot(slotIndex) || !mon) {
        return;
    }

    if (isSpeciesSelectedInOtherOpponentSlot(mon.speciesId, slotIndex)) {
        return;
    }

    const opponentState = getOpponentBattleState(slotIndex);
    const slotDom = getOpponentSlotDom(slotIndex);

    opponentState.speciesId = mon.speciesId;
    opponentState.possibleSetIds = new Set([mon.id]);

    slotDom.select.value = mon.speciesId;
    slotDom.input.value = getName(mon);
    slotDom.suggestions.hidden = true;

    renderSelectedPokemonDetails(mon.speciesId, slotIndex);

    if (usesSharedOpponentTeamAcrossSlots()) {
        const otherSlotIndex = slotIndex === 0 ? 1 : 0;

        populateOpponentPokemonSelect(otherSlotIndex);

        if (slotIndex === 0 && !getOpponentBattleState(1).speciesId) {
            battleState.activeOpponentSlotIndex = 1;
        }
    }
}

function selectOpponentPokemonAndRender(mon, slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    if (!hasBattlePokemonSourceForOpponentSlot(slotIndex) ||
        !mon ||
        isSpeciesSelectedInOtherOpponentSlot(mon.speciesId, slotIndex)) {
        return;
    }

    const slotDom = getOpponentSlotDom(slotIndex);

    battleState.activeOpponentSlotIndex = slotIndex;

    slotDom.input.value = getName(mon);
    slotDom.select.value = mon.speciesId;
    slotDom.suggestions.hidden = true;

    slotDom.input.blur();
    slotDom.select.blur();

    resetPossibleSetsForPokemon(mon.speciesId, slotIndex);
    renderSelectedPokemonDetails(mon.speciesId, slotIndex);

    if (usesSharedOpponentTeamAcrossSlots()) {
        populateOpponentPokemonSelect(slotIndex === 0 ? 1 : 0);
    }
}

function populateOpponentPokemonSelect(slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    const slotDom = getOpponentSlotDom(slotIndex);
    const opponentState = getOpponentBattleState(slotIndex);
    const uniqueSpecies = getUniqueAvailableOpponentSpecies(slotIndex);

    slotDom.select.replaceChildren();
    slotDom.select.appendChild(createPlaceholderOption(translate("ui", "opponentPokemonSelectPlaceholder")));
    slotDom.suggestions.hidden = true;

    for (const mon of uniqueSpecies) {
        const option = document.createElement("option");
        option.value = mon.speciesId;
        option.textContent = getPokemonDisplayName(mon);
        slotDom.select.appendChild(option);
    }

    const selectedMon = uniqueSpecies.find((mon) => mon.speciesId === opponentState.speciesId);

    if (selectedMon) {
        slotDom.select.value = selectedMon.speciesId;
        slotDom.input.value = getName(selectedMon);
        return;
    }

    if (opponentState.speciesId) {
        resetOpponentBattleState(slotIndex);
    }

    slotDom.input.value = "";
    slotDom.details.replaceChildren();
    slotDom.details.hidden = true;
}

function refreshOpponentBattleInterface() {
    const opponentCount = getActiveOpponentCount();
    let visibleOpponentCount = 0;

    dom.opponentSlots.forEach((slotDom, slotIndex) => {
        const isActive = slotIndex < opponentCount && hasBattlePokemonSourceForOpponentSlot(slotIndex);

        slotDom.container.hidden = !isActive;

        if (isActive) {
            visibleOpponentCount++;
            populateOpponentPokemonSelect(slotIndex);
        }
    });

    dom.resultsContainer.classList.toggle("is-doubles", visibleOpponentCount === 2);
    dom.opponentSearchContainer.hidden = visibleOpponentCount === 0;
}

function clearOpponentPokemonSelection(slotIndex, refreshOtherSlot = true) {
    const slotDom = getOpponentSlotDom(slotIndex);

    resetOpponentBattleState(slotIndex);

    slotDom.input.value = "";
    slotDom.select.value = "";
    slotDom.suggestions.hidden = true;
    slotDom.details.replaceChildren();
    slotDom.details.hidden = true;

    updateSelectedPokemonPresence();

    if (refreshOtherSlot && usesSharedOpponentTeamAcrossSlots()) {
        populateOpponentPokemonSelect(slotIndex === 0 ? 1 : 0);
    }
}

function updateSelectedPokemonPresence() {
    const hasSelectedPokemon = battleState.opponents
        .slice(0, getActiveOpponentCount())
        .some((opponentState) => opponentState.speciesId);

    dom.resultsContainer.classList.toggle("has-selected-pokemon", hasSelectedPokemon);
}

function populateOpponentPokemonSuggestions(search = "", slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    const slotDom = getOpponentSlotDom(slotIndex);
    const opponentState = getOpponentBattleState(slotIndex);

    slotDom.suggestions.replaceChildren();

    const normalizedSearch = normalizeText(search);

    if (normalizedSearch.length < 2) {
        slotDom.suggestions.hidden = true;
        return;
    }

    const matches = getUniqueAvailableOpponentSpecies(slotIndex)
        .filter((mon) =>
            normalizeText(getPokemonDisplayName(mon)).includes(normalizedSearch) ||
            normalizeText(getName(mon, "fr")).includes(normalizedSearch) ||
            normalizeText(getName(mon, "en")).includes(normalizedSearch)
        )
        .slice(0, 12);

    opponentState.suggestionMatches = matches;
    opponentState.suggestionActiveIndex = -1;

    if (matches.length === 0) {
        slotDom.suggestions.hidden = true;
        return;
    }

    matches.forEach((mon, index) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = getPokemonDisplayName(mon);
        item.dataset.index = index;

        item.addEventListener("mousedown", (event) => {
            event.preventDefault();
            selectOpponentPokemonAndRender(mon, slotIndex);
        });

        slotDom.suggestions.appendChild(item);
    });

    slotDom.suggestions.hidden = false;
}

function updateOpponentSuggestionActiveItem(slotIndex) {
    const slotDom = getOpponentSlotDom(slotIndex);
    const opponentState = getOpponentBattleState(slotIndex);
    const items = slotDom.suggestions.querySelectorAll(".suggestion-item");

    items.forEach((item, index) => {
        item.classList.toggle("active", index === opponentState.suggestionActiveIndex);
    });
}

function handleOpponentSuggestionKeyboard(event, slotIndex) {
    const slotDom = getOpponentSlotDom(slotIndex);
    const opponentState = getOpponentBattleState(slotIndex);
    const matches = opponentState.suggestionMatches;

    if (slotDom.suggestions.hidden || matches.length === 0) {
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        opponentState.suggestionActiveIndex = (opponentState.suggestionActiveIndex + 1) % matches.length;
        updateOpponentSuggestionActiveItem(slotIndex);
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        opponentState.suggestionActiveIndex =
            (opponentState.suggestionActiveIndex - 1 + matches.length) % matches.length;
        updateOpponentSuggestionActiveItem(slotIndex);
    }

    if (event.key === "Enter" && opponentState.suggestionActiveIndex >= 0) {
        event.preventDefault();
        selectOpponentPokemonAndRender(matches[opponentState.suggestionActiveIndex], slotIndex);
    }

    if (event.key === "Escape") {
        slotDom.suggestions.hidden = true;
    }
}

function bindOpponentPokemonSlotEvents(slotIndex) {
    const slotDom = getOpponentSlotDom(slotIndex);

    slotDom.input.addEventListener("focus", () => {
        battleState.activeOpponentSlotIndex = slotIndex;
    });

    slotDom.select.addEventListener("focus", () => {
        battleState.activeOpponentSlotIndex = slotIndex;
    });

    slotDom.input.addEventListener("keydown", (event) => {
        handleOpponentSuggestionKeyboard(event, slotIndex);
    });

    slotDom.clearButton.addEventListener("click", () => {
        clearOpponentPokemonSelection(slotIndex);
        slotDom.input.focus();
    });

    slotDom.select.addEventListener("change", (event) => {
        if (!hasBattlePokemonSourceForOpponentSlot(slotIndex) || !event.target.value) {
            clearOpponentPokemonSelection(slotIndex);
            return;
        }

        const mon = findOpponentPokemonBySpeciesId(event.target.value, slotIndex);
        selectOpponentPokemonAndRender(mon, slotIndex);
    });

    slotDom.input.addEventListener("input", (event) => {
        if (hasBattlePokemonSourceForOpponentSlot(slotIndex)) {
            populateOpponentPokemonSuggestions(event.target.value, slotIndex);
        }
    });

    slotDom.input.addEventListener("blur", () => {
        setTimeout(() => {
            slotDom.suggestions.hidden = true;
        }, 100);
    });

    slotDom.input.addEventListener("change", (event) => {
        if (!hasBattlePokemonSourceForOpponentSlot(slotIndex)) {
            return;
        }

        if (!event.target.value.trim()) {
            clearOpponentPokemonSelection(slotIndex);
            return;
        }

        const mon = findOpponentPokemonByInputValue(event.target.value, slotIndex);

        if (mon) {
            selectOpponentPokemonAndRender(mon, slotIndex);
        }
    });
}

function getUniqueVisibleMoveIds(visibleSets) {
    const moveIds = new Set();

    for (const mon of visibleSets) {
        for (const moveId of mon.moves) {
            if (moveId) {
                moveIds.add(moveId);
            }
        }
    }

    return [...moveIds];
}

function getMoveAiRoutineTexts(moveId, mode) {
    const modeData = window.moveAiRoutines?.[moveId]?.routine?.[mode];

    return modeData?.[currentLang]
        ?? modeData?.en
        ?? [];
}

function buildAiRoutineList(routineTexts) {
    const list = document.createElement("div");
    list.className = "ai-routine-list";

    for (const routineText of routineTexts) {
        const item = document.createElement("pre");
        item.className = "ai-routine-item";
        item.textContent = routineText;

        list.appendChild(item);
    }

    return list;
}

function buildDoublesAiSection(titleKey, routineTexts) {
    if (routineTexts.length === 0) {
        return null;
    }

    const section = document.createElement("section");
    section.className = "ai-routine-doubles-section";

    const title = document.createElement("p");
    title.className = "ai-routine-doubles-title";
    title.textContent = translate("ui", titleKey);

    section.append(title, buildAiRoutineList(routineTexts));

    return section;
}

function buildDoublesAiRoutineBlock(moveId) {
    if (!usesDoublesAi()) {
        return null;
    }

    const enemyTexts = getMoveAiRoutineTexts(moveId, "doublesEnemy");
    const allyTexts = getMoveAiRoutineTexts(moveId, "doublesAlly");

    const enemySection = buildDoublesAiSection(
        "aiRoutineDoublesEnemyTitle",
        enemyTexts
    );

    const allySection = buildDoublesAiSection(
        "aiRoutineDoublesAllyTitle",
        allyTexts
    );

    if (!enemySection && !allySection) {
        return null;
    }

    const block = document.createElement("div");
    block.className = "ai-routine-doubles";

    if (enemySection) {
        block.appendChild(enemySection);
    }

    if (allySection) {
        block.appendChild(allySection);
    }

    return block;
}

function buildAiRoutineAccordion(visibleSets) {
    const moveIds = getUniqueVisibleMoveIds(visibleSets);

    const details = document.createElement("details");
    details.className = "ai-routine-panel";

    const summary = document.createElement("summary");
    summary.className = "ai-routine-summary";
    summary.textContent = translate("ui", "aiRoutineTitle");

    const content = document.createElement("div");
    content.className = "ai-routine-content";

    for (const moveId of moveIds) {
        content.appendChild(buildMoveAiRoutineBlock(moveId));
    }

    details.append(summary, content);

    return details;
}

function buildMoveAiRoutineBlock(moveId) {
    const singlesTexts = getMoveAiRoutineTexts(moveId, "singles");

    const details = document.createElement("details");
    details.className = "ai-routine-move";

    const summary = document.createElement("summary");
    summary.className = "ai-routine-move-title";
    summary.textContent = getMoveName(moveId);

    const moveType = getMoveType(moveId);
    applyTypeColor(summary, moveType);

    details.appendChild(summary);

    if (singlesTexts.length === 0) {
        const missing = document.createElement("p");
        missing.className = "ai-routine-missing";
        missing.textContent = translate("ui", "aiRoutineMissingData");

        details.appendChild(missing);
    } else {
        details.appendChild(buildAiRoutineList(singlesTexts));
    }

    const doublesBlock = buildDoublesAiRoutineBlock(moveId);

    if (doublesBlock) {
        details.appendChild(doublesBlock);
    }

    return details;
}

function buildFactoryDetailGroupTitle(group) {
    const title = document.createElement("h3");
    title.className = "factory-detail-group-title";

    const label = translate("ui", getFactoryBattleGroupTranslationKey(group));
    title.textContent = `${label} — ${group.mons.length} ${getFactoryPossibleSetsLabel(group.mons.length)}`;

    return title;
}

function buildFactoryDetailIvTitle(ivGroup) {
    const title = document.createElement("p");
    title.className = "factory-detail-iv-title";
    title.textContent = `${translate("columns", "iv")} : ${ivGroup.iv} — ${ivGroup.mons.length} ${getFactoryPossibleSetsLabel(ivGroup.mons.length)}`;

    return title;
}

function appendFactoryPokemonDetailCards(container, visibleSets, level, slotIndex) {
    const sourceIndex = getBattlePokemonSourceIndexForOpponentSlot(slotIndex);
    const source = getBattlePokemonSource(sourceIndex);
    const groups = getFactoryBattleGroups(visibleSets, source);

    for (const group of groups) {
        container.appendChild(buildFactoryDetailGroupTitle(group));

        for (const ivGroup of group.ivGroups) {
            container.appendChild(buildFactoryDetailIvTitle(ivGroup));

            for (const mon of ivGroup.mons) {
                const iv = getBattlePokemonIv(mon);
                const stats = calculateStats(mon, iv, level);

                container.appendChild(buildPokemonDetailCard(mon, stats, iv, slotIndex));
            }
        }
    }
}

function renderSelectedPokemonDetails(speciesId, slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    const opponentState = getOpponentBattleState(slotIndex);
    const container = getOpponentSlotDom(slotIndex).details;
    const sets = getSelectedPokemonSets(speciesId, slotIndex);

    container.replaceChildren();

    if (sets.length === 0) {
        container.hidden = true;
        updateSelectedPokemonPresence();
        return;
    }

    const level = getSelectedLevel();
    const visibleSets = sets.filter((mon) => opponentState.possibleSetIds.has(mon.id));
    const hiddenSets = sets.filter((mon) => !opponentState.possibleSetIds.has(mon.id));

    if (isFactoryMode()) {
        appendFactoryPokemonDetailCards(container, visibleSets, level, slotIndex);
    } else {
        for (const mon of visibleSets) {
            const iv = getBattlePokemonIv(mon);
            const stats = calculateStats(mon, iv, level);

            container.appendChild(buildPokemonDetailCard(mon, stats, iv, slotIndex));
        }
    }

    if (visibleSets.length > 0) {
        container.appendChild(buildAiRoutineAccordion(visibleSets));
    }

    if (hiddenSets.length > 0) {
        container.appendChild(buildHiddenSetsPanel(hiddenSets, slotIndex));
    }

    container.hidden = false;
    updateSelectedPokemonPresence();
}

function resetPossibleSetsForPokemon(speciesId, slotIndex = PRIMARY_OPPONENT_SLOT_INDEX) {
    const sourceIndex = getBattlePokemonSourceIndexForOpponentSlot(slotIndex);
    const opponentState = getOpponentBattleState(slotIndex);

    opponentState.speciesId = speciesId;
    opponentState.possibleSetIds = new Set(
        getSelectedPokemonSets(speciesId, slotIndex)
            .filter((mon) => !isMonExcluded(mon, sourceIndex))
            .map((mon) => mon.id)
    );
}

// ---------------------------------------------------------------------
// Initialization and events
// ---------------------------------------------------------------------

function buildPokemonDetailCard(mon, stats, ivTier, slotIndex) {
    const card = document.createElement("article");
    card.className = "pokemon-detail-card";

    const title = document.createElement("h3");
    title.className = "pokemon-detail-title";

    const opponentState = getOpponentBattleState(slotIndex);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = opponentState.possibleSetIds.has(mon.id);

    checkbox.addEventListener("change", () => {
        togglePossibleSet(mon.id, slotIndex);
    });

    const label = document.createElement("span");
    label.textContent = `${getName(mon)} ${mon.setNumber ?? ""}`;

    title.append(checkbox, label);

    title.addEventListener("click", (event) => {
        if (event.target === checkbox) {
            return;
        }
        togglePossibleSet(mon.id, slotIndex);
    });

    const content = document.createElement("div");
    content.className = "pokemon-detail-content";

    const sprite = document.createElement("img");
    sprite.className = "pokemon-detail-sprite";
    sprite.src = getPokemonFrontSpriteUrl(mon);
    sprite.alt = getName(mon);
    sprite.loading = "lazy";

    const info = document.createElement("div");
    info.className = "pokemon-detail-info";

    const infoLines = [
        buildTypeInfoLine(mon.types),
        buildAbilitiesInfoLine(mon.abilities),
        buildNatureInfoLine(mon.nature)
    ];
    if (!isArcadeMode()) {
        infoLines.push(buildItemInfoLine(mon.item, getItemSpriteUrl(mon.item)));
    }
    infoLines.push(buildSimpleInfoLine(translate("columns", "iv"), ivTier));

    info.append(...infoLines);

    const statsBlock = buildStatsBlock(stats);
    const movesBlock = buildMovesBlock(mon, slotIndex);

    content.append(sprite, info, statsBlock);
    card.append(title, content, movesBlock);

    return card;
}

function buildSimpleInfoLine(label, value) {
    const line = document.createElement("p");

    const strong = document.createElement("strong");
    strong.textContent = `${label} : `;

    const text = document.createTextNode(value);

    line.append(strong, text);

    return line;
}

function buildTypeInfoLine(types) {
    const line = document.createElement("p");

    const strong = document.createElement("strong");
    strong.textContent = `${translate("columns", "type1").replace(" 1", "s")} : `;

    line.appendChild(strong);

    types.forEach((typeId, index) => {
        if (index > 0) {
            line.appendChild(document.createTextNode(" / "));
        }

        const badge = document.createElement("span");
        badge.className = "detail-badge";
        badge.textContent = translateEntity("types", typeId);
        applyTypeColor(badge, typeId);

        line.appendChild(badge);
    });

    return line;
}

function buildAbilitiesInfoLine(abilities) {
    return buildSimpleInfoLine(
        translate("columns", "ability1").replace(" 1", "s"),
        abilities.map((ability) => translateEntity("abilities", ability)).join(" / ")
    );
}

function buildNatureInfoLine(natureId) {
    const line = document.createElement("p");

    const strong = document.createElement("strong");
    strong.textContent = `${translate("columns", "nature")} : `;

    const badge = document.createElement("span");
    badge.className = "detail-badge";
    badge.textContent = translateEntity("natures", natureId);
    applyNatureColor(badge, natureId);

    line.append(strong, badge);

    return line;
}

function buildItemInfoLine(itemId, itemSpriteUrl) {
    const line = document.createElement("p");
    line.className = "pokemon-detail-item";

    const strong = document.createElement("strong");
    strong.textContent = `${translate("columns", "item")} : `;

    const text = document.createElement("span");
    text.textContent = translateEntity("items", itemId);

    line.append(strong, text);

    if (itemSpriteUrl) {
        const img = document.createElement("img");
        img.className = "pokemon-detail-item-sprite";
        img.src = itemSpriteUrl;
        img.alt = translateEntity("items", itemId);
        img.loading = "lazy";

        line.appendChild(img);
    }

    return line;
}

function buildStatsBlock(stats) {
    const statMax = Math.max(stats.hp, stats.atk, stats.def, stats.spa, stats.spd, stats.spe);

    const statsBlock = document.createElement("div");
    statsBlock.className = "pokemon-detail-stats";

    const rows = [
        [translate("statLabels", "hp"), stats.hp],
        [translate("statLabels", "atk"), stats.atk],
        [translate("statLabels", "def"), stats.def],
        [translate("statLabels", "spa"), stats.spa],
        [translate("statLabels", "spd"), stats.spd],
        [translate("statLabels", "spe"), stats.spe]
    ];

    for (const [label, value] of rows) {
        const row = document.createElement("div");
        row.className = "stat-bar-row";

        const percentage = Math.round((value / statMax) * 100);

        row.innerHTML = `
        <span class="stat-label">${label}</span>
        <div class="stat-bar-background">
            <div
                class="stat-bar-fill"
                style="width:${percentage}%; background-color:${getStatBarColor(value)}"
            ></div>
        </div>
        <span class="stat-value">${value}</span>
        `;

        statsBlock.appendChild(row);
    }

    return statsBlock;
}

function togglePossibleSet(monId, slotIndex) {
    const opponentState = getOpponentBattleState(slotIndex);

    if (opponentState.possibleSetIds.has(monId)) {
        opponentState.possibleSetIds.delete(monId);
    } else {
        opponentState.possibleSetIds.add(monId);
    }

    renderSelectedPokemonDetails(opponentState.speciesId, slotIndex);
}

function buildHiddenSetsPanel(hiddenSets, slotIndex) {
    const panel = document.createElement("div");
    panel.className = "hidden-sets-panel";

    const title = document.createElement("p");
    title.className = "hidden-sets-title";
    title.textContent = translate("ui", "hiddenSets");

    const list = document.createElement("div");
    list.className = "hidden-sets-list";

    for (const mon of hiddenSets) {
        const label = document.createElement("label");
        label.className = "hidden-set-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = false;

        checkbox.addEventListener("change", () => {
            togglePossibleSet(mon.id, slotIndex);
        });

        const text = document.createElement("span");
        if (isFactoryMode()) {
            text.textContent =
                `${getName(mon)} ${mon.setNumber ?? ""} — ${translate("columns", "iv")} ${getBattlePokemonIv(mon)}`;
        } else {
            text.textContent = `${getName(mon)} ${mon.setNumber ?? ""}`;
        }

        label.append(checkbox, text);
        list.appendChild(label);
    }

    panel.append(title, list);

    return panel;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getStatBarColor(statValue) {
    const cappedStat = clamp(statValue, 0, 255);

    const red = clamp(511 - 2 * cappedStat, 0, 255);
    const green = clamp(2 * cappedStat, 0, 255);

    return `rgb(${red}, ${green}, 0)`;
}

function getMoveName(moveId) {
    const move = window.moves?.[moveId];

    return move?.names?.[currentLang]
        ?? move?.names?.en
        ?? window.appTranslations.moves?.[moveId]?.[currentLang]
        ?? window.appTranslations.moves?.[moveId]?.en
        ?? moveId;
}

function getMovePowerPoints(moveId) {
    return window.moves?.[moveId]?.power_points ?? "";
}

function getMovePpStateKey(mon, moveId, moveIndex) {
    return `${mon.id}:${moveIndex}:${moveId}`;
}

function getCurrentMovePp(mon, moveId, moveIndex, slotIndex) {
    const movePpState = getOpponentBattleState(slotIndex).movePpState;
    const maxPp = getMovePowerPoints(moveId);
    const key = getMovePpStateKey(mon, moveId, moveIndex);

    if (!movePpState.has(key)) {
        movePpState.set(key, maxPp);
    }

    return movePpState.get(key);
}

function updateMovePp(mon, moveId, moveIndex, delta, slotIndex) {
    const opponentState = getOpponentBattleState(slotIndex);
    const maxPp = getMovePowerPoints(moveId);
    const key = getMovePpStateKey(mon, moveId, moveIndex);
    const currentPp = getCurrentMovePp(mon, moveId, moveIndex, slotIndex);
    const nextPp = Math.max(0, Math.min(maxPp, currentPp + delta));

    opponentState.movePpState.set(key, nextPp);

    renderSelectedPokemonDetails(opponentState.speciesId, slotIndex);
}

function buildMovesBlock(mon, slotIndex) {
    const movesBlock = document.createElement("div");
    movesBlock.className = "pokemon-detail-moves";

    const title = document.createElement("p");
    title.className = "moves-title";
    title.textContent = translate("ui", "movesTitle");

    const grid = document.createElement("div");
    grid.className = "moves-grid";

    mon.moves.forEach((moveId, moveIndex) => {
        const maxPp = getMovePowerPoints(moveId);
        const currentPp = getCurrentMovePp(mon, moveId, moveIndex, slotIndex);

        const move = document.createElement("div");
        move.className = "move-detail move-detail-with-pp";

        if (currentPp === 0) {
            move.classList.add("move-detail-empty");
        }

        const moveType = getMoveType(moveId);
        applyTypeColor(move, moveType);

        const label = document.createElement("span");
        label.className = "move-detail-name";
        label.textContent = getMoveName(moveId);

        const pp = document.createElement("span");
        pp.className = "move-detail-pp";
        pp.textContent = `${currentPp}/${maxPp}`;

        const minusButton = document.createElement("button");
        minusButton.type = "button";
        minusButton.className = "move-pp-button";
        minusButton.textContent = "−";
        minusButton.disabled = currentPp <= 0;
        minusButton.addEventListener("click", () => {
            updateMovePp(mon, moveId, moveIndex, -1, slotIndex);
        });

        const plusButton = document.createElement("button");
        plusButton.type = "button";
        plusButton.className = "move-pp-button";
        plusButton.textContent = "+";
        plusButton.disabled = currentPp >= maxPp;
        plusButton.addEventListener("click", () => {
            updateMovePp(mon, moveId, moveIndex, 1, slotIndex);
        });

        const controls = document.createElement("span");
        controls.className = "move-pp-controls";
        controls.append(minusButton, plusButton);

        move.append(label, pp, controls);
        grid.appendChild(move);
    });

    movesBlock.append(title, grid);

    return movesBlock;
}