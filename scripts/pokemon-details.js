"use strict";

// -----------------------------------------------------------------------------
// Opponent Pokémon selector and Pokémon detail cards
// -----------------------------------------------------------------------------

let possibleSetIds = new Set();
let currentOpponentSpeciesId = null;
let showDoublesAi = false;

const movePpState = new Map();

function getSelectedPokemonSets(trainer, speciesId) {
    const level = getSelectedLevel();

    return getTrainerMonsForLevel(trainer, level)
        .filter((mon) => mon.speciesId === speciesId);
}

function findOpponentPokemonByInputValue(trainer, value) {
    const normalizedValue = normalizeText(value);
    const level = getSelectedLevel();
    const mons = getTrainerMonsForLevel(trainer, level);

    return mons.find((mon) =>
        normalizeText(getPokemonDisplayName(mon)) === normalizedValue ||
        normalizeText(getName(mon, "fr")) === normalizedValue ||
        normalizeText(getName(mon, "en")) === normalizedValue
    );
}

function findOpponentPokemonBySpeciesId(trainer, speciesId) {
    const level = getSelectedLevel();
    const mons = getTrainerMonsForLevel(trainer, level);

    return mons.find((mon) => mon.speciesId === speciesId && !isMonExcluded(mon));
}

function getPokemonDisplayName(mon) {
    const mainName = getName(mon, currentLang);
    const secondaryName = getName(mon, getOtherLang());

    return mainName === secondaryName ? mainName : `${mainName} (${secondaryName})`;
}

function selectSingleSetFromTable(mon) {
    if (!currentTrainer || !mon) {
        return;
    }

    currentOpponentSpeciesId = mon.speciesId;
    possibleSetIds = new Set([mon.id]);

    dom.opponentPokemonSelect.value = mon.speciesId;
    dom.opponentPokemonInput.value = getName(mon);
    dom.opponentPokemonSuggestions.hidden = true;

    dom.opponentPokemonInput.blur();
    dom.opponentPokemonSelect.blur();

    renderSelectedPokemonDetails(currentTrainer, mon.speciesId);
}

function selectOpponentPokemonAndRender(mon) {
    if (!currentTrainer || !mon) {
        return;
    }

    dom.opponentPokemonInput.value = getName(mon);
    dom.opponentPokemonSelect.value = mon.speciesId;
    dom.opponentPokemonSuggestions.hidden = true;

    dom.opponentPokemonInput.blur();
    dom.opponentPokemonSelect.blur();

    resetPossibleSetsForPokemon(currentTrainer, mon.speciesId);
    renderSelectedPokemonDetails(currentTrainer, mon.speciesId);
}

function populateOpponentPokemonSelect(trainer) {
    const container = dom.opponentSearchContainer;
    const input = dom.opponentPokemonInput;
    const select = dom.opponentPokemonSelect;
    const level = getSelectedLevel();
    const mons = getTrainerMonsForLevel(trainer, level);

    const uniqueSpecies = [];

    for (const mon of mons) {
        if (isMonExcluded(mon)) {
            continue;
        }
        if (!uniqueSpecies.some((existing) => existing.speciesId === mon.speciesId)) {
        uniqueSpecies.push(mon);
        }
    }
    populateOpponentPokemonSuggestions(uniqueSpecies, "");

    select.replaceChildren();
    select.appendChild(createPlaceholderOption(translate("ui", "opponentPokemonSelectPlaceholder")));

    for (const mon of uniqueSpecies) {
        const option = document.createElement("option");
        option.value = mon.speciesId;

        const mainName = getName(mon, currentLang);
        const secondaryName = getName(mon, getOtherLang());

        option.textContent =
        mainName === secondaryName ? mainName : `${mainName} (${secondaryName})`;

        select.appendChild(option);
    }

    input.value = "";
    container.hidden = false;
    dom.selectedPokemonDetails.hidden = true;
}

function populateOpponentPokemonSuggestions(uniqueSpecies, search = "") {
    const menu = dom.opponentPokemonSuggestions;
    menu.replaceChildren();

    const normalizedSearch = normalizeText(search);

    if (normalizedSearch.length < 2) {
        menu.hidden = true;
        return;
    }

    const matches = uniqueSpecies
        .filter((mon) =>
        normalizeText(getPokemonDisplayName(mon)).includes(normalizedSearch) ||
        normalizeText(getName(mon, "fr")).includes(normalizedSearch) ||
        normalizeText(getName(mon, "en")).includes(normalizedSearch)
        )
        .slice(0, 12);

    if (matches.length === 0) {
        menu.hidden = true;
        return;
    }

    opponentSuggestionMatches = matches;
    opponentSuggestionActiveIndex = -1;

    matches.forEach((mon, index) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = getPokemonDisplayName(mon);
        item.dataset.index = index;

        item.addEventListener("mousedown", (event) => {
            event.preventDefault();
            selectOpponentPokemonAndRender(mon);
        });

        menu.appendChild(item);
    });

    menu.hidden = false;
}

function updateOpponentSuggestionActiveItem() {
    const items = document.querySelectorAll("#opponent-pokemon-suggestions .suggestion-item");

    items.forEach((item, index) => {
        item.classList.toggle("active", index === opponentSuggestionActiveIndex);
    });
}

function handleOpponentSuggestionKeyboard(event) {
    const menu = dom.opponentPokemonSuggestions;

    if (menu.hidden || opponentSuggestionMatches.length === 0) {
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        opponentSuggestionActiveIndex =
            (opponentSuggestionActiveIndex + 1) % opponentSuggestionMatches.length;
        updateOpponentSuggestionActiveItem();
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();
        opponentSuggestionActiveIndex =
            (opponentSuggestionActiveIndex - 1 + opponentSuggestionMatches.length) % opponentSuggestionMatches.length;
        updateOpponentSuggestionActiveItem();
    }

    if (event.key === "Enter" && opponentSuggestionActiveIndex >= 0) {
        event.preventDefault();
        selectOpponentPokemonAndRender(opponentSuggestionMatches[opponentSuggestionActiveIndex]);
    }

    if (event.key === "Escape") {
        menu.hidden = true;
    }
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

function updateDoublesAiVisibility() {
    dom.selectedPokemonDetails
        .querySelectorAll(".ai-routine-doubles")
        .forEach((block) => {
            block.hidden = !showDoublesAi;
        });
}

function buildDoublesAiToggle() {
    const container = document.createElement("div");
    container.className = "ai-routine-options";

    const label = document.createElement("label");
    label.className = "ai-routine-doubles-toggle";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = showDoublesAi;

    checkbox.addEventListener("change", () => {
        showDoublesAi = checkbox.checked;
        updateDoublesAiVisibility();
    });

    const text = document.createElement("span");
    text.textContent = translate("ui", "aiRoutineShowDoubles");

    label.append(checkbox, text);
    container.appendChild(label);

    return container;
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
    block.hidden = !showDoublesAi;

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

    content.appendChild(buildDoublesAiToggle());

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

function renderSelectedPokemonDetails(trainer, speciesId) {
    const container = dom.selectedPokemonDetails;
    const sets = getSelectedPokemonSets(trainer, speciesId);

    container.replaceChildren();

    if (sets.length === 0) {
        dom.resultsContainer.classList.remove("has-selected-pokemon");
        container.hidden = true;
        return;
    }

    const level = getSelectedLevel();
    const visibleSets = sets.filter((mon) => possibleSetIds.has(mon.id));
    const hiddenSets = sets.filter((mon) => !possibleSetIds.has(mon.id));

    for (const mon of visibleSets) {
        const stats = calculateStats(mon, trainer.ivTier, level);
        const card = buildPokemonDetailCard(mon, stats, trainer.ivTier);
        container.appendChild(card);
    }

    if (visibleSets.length > 0) {
        container.appendChild(buildAiRoutineAccordion(visibleSets));
    }

    if (hiddenSets.length > 0) {
        container.appendChild(buildHiddenSetsPanel(hiddenSets));
    }

    dom.resultsContainer.classList.add("has-selected-pokemon");
    container.hidden = false;
}

function resetPossibleSetsForPokemon(trainer, speciesId) {
    currentOpponentSpeciesId = speciesId;
    possibleSetIds = new Set(
        getSelectedPokemonSets(trainer, speciesId)
            .filter((mon) => !isMonExcluded(mon))
            .map((mon) => mon.id)
    );
}

// ---------------------------------------------------------------------
// Initialization and events
// ---------------------------------------------------------------------

function buildPokemonDetailCard(mon, stats, ivTier) {
    const card = document.createElement("article");
    card.className = "pokemon-detail-card";

    const title = document.createElement("h3");
    title.className = "pokemon-detail-title";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = possibleSetIds.has(mon.id);

    checkbox.addEventListener("change", () => {
        togglePossibleSet(mon.id);
    });

    const label = document.createElement("span");
    label.textContent = `${getName(mon)} ${mon.setNumber ?? ""}`;

    title.append(checkbox, label);

    title.addEventListener("click", (event) => {
        if (event.target === checkbox) {
            return;
        }
        togglePossibleSet(mon.id);
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
    const movesBlock = buildMovesBlock(mon);

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

function togglePossibleSet(monId) {
    if (possibleSetIds.has(monId)) {
        possibleSetIds.delete(monId);
    } else {
        possibleSetIds.add(monId);
    }

    renderSelectedPokemonDetails(currentTrainer, currentOpponentSpeciesId);
}

function buildHiddenSetsPanel(hiddenSets) {
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
            togglePossibleSet(mon.id);
        });

        const text = document.createElement("span");
        text.textContent = `${getName(mon)} ${mon.setNumber ?? ""}`;

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

function getCurrentMovePp(mon, moveId, moveIndex) {
    const maxPp = getMovePowerPoints(moveId);
    const key = getMovePpStateKey(mon, moveId, moveIndex);

    if (!movePpState.has(key)) {
        movePpState.set(key, maxPp);
    }

    return movePpState.get(key);
}

function updateMovePp(mon, moveId, moveIndex, delta) {
    const maxPp = getMovePowerPoints(moveId);
    const key = getMovePpStateKey(mon, moveId, moveIndex);
    const currentPp = getCurrentMovePp(mon, moveId, moveIndex);
    const nextPp = Math.max(0, Math.min(maxPp, currentPp + delta));

    movePpState.set(key, nextPp);

    renderSelectedPokemonDetails(currentTrainer, currentOpponentSpeciesId);
}

function buildMovesBlock(mon) {
    const movesBlock = document.createElement("div");
    movesBlock.className = "pokemon-detail-moves";

    const title = document.createElement("p");
    title.className = "moves-title";
    title.textContent = translate("ui", "movesTitle");

    const grid = document.createElement("div");
    grid.className = "moves-grid";

    mon.moves.forEach((moveId, moveIndex) => {
        const maxPp = getMovePowerPoints(moveId);
        const currentPp = getCurrentMovePp(mon, moveId, moveIndex);

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
            updateMovePp(mon, moveId, moveIndex, -1);
        });

        const plusButton = document.createElement("button");
        plusButton.type = "button";
        plusButton.className = "move-pp-button";
        plusButton.textContent = "+";
        plusButton.disabled = currentPp >= maxPp;
        plusButton.addEventListener("click", () => {
            updateMovePp(mon, moveId, moveIndex, 1);
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