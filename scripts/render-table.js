"use strict";

// -----------------------------------------------------------------------------
// Table rendering and sprite helpers
// -----------------------------------------------------------------------------

function setSpriteTextCell(td, imageUrl, text, altText, spriteKind = "item") {
    const wrapper = document.createElement("span");
    wrapper.className = "sprite-text-cell";

    if (imageUrl) {
        const wrapperImg = document.createElement("span");
        wrapperImg.className =
        spriteKind === "pokemon"
            ? "pokemon-sprite-wrapper"
            : "item-sprite-wrapper";

        const img = document.createElement("img");
        img.className =
        spriteKind === "pokemon"
            ? "pokemon-cell-sprite"
            : "item-cell-sprite";

        img.src = imageUrl;
        img.alt = altText ?? "";
        img.loading = "lazy";

        img.addEventListener("error", () => {
        wrapperImg.remove();
        });

        wrapperImg.appendChild(img);
        wrapper.appendChild(wrapperImg);
    }

    const label = document.createElement("span");
    label.textContent = text ?? "";
    wrapper.appendChild(label);

    td.replaceChildren(wrapper);
}


// ---------------------------------------------------------------------
// Table rendering helpers
// ---------------------------------------------------------------------

// Creates the translated table header.
function createPokemonTableHead(showIv = false) {
    const thead = document.createElement("thead");
    const ivHeader = showIv ? `<th>${translate("columns", "iv")}</th>` : "";

    thead.innerHTML = `
        <tr>
            <th>${translate("columns", "name")}</th>
            <th>${translate("columns", "set")}</th>
            <th>${translate("columns", "type1")}</th>
            <th>${translate("columns", "type2")}</th>
            <th>${translate("columns", "ability1")}</th>
            <th>${translate("columns", "ability2")}</th>
            <th>${translate("columns", "nature")}</th>
            <th>${translate("columns", "item")}</th>
            <th>${translate("columns", "hp")}</th>
            <th>${translate("columns", "attack")}</th>
            <th>${translate("columns", "defense")}</th>
            <th>${translate("columns", "spAtk")}</th>
            <th>${translate("columns", "spDef")}</th>
            <th>${translate("columns", "speed")}</th>
            <th>${translate("columns", "move1")}</th>
            <th>${translate("columns", "move2")}</th>
            <th>${translate("columns", "move3")}</th>
            <th>${translate("columns", "move4")}</th>
            ${ivHeader}
        </tr>
    `;

    return thead;
}

// Returns the data used to create one Pokémon table row.
function getPokemonRowCells(mon, stats, showIv = false) {
    const ability1 = mon.abilities[0] ? translateEntity("abilities", mon.abilities[0]) : "";
    const ability2 = mon.abilities[1] ? translateEntity("abilities", mon.abilities[1]) : "";

    const cells = [
        getName(mon),
        mon.setNumber,
        translateEntity("types", mon.types[0]),
        mon.types[1] ? translateEntity("types", mon.types[1]) : "",
        ability1,
        ability2,
        {
            value: translateEntity("natures", mon.nature),
            className: getNatureBoostedStat(mon.nature) ? `nature-boost-${getNatureBoostedStat(mon.nature)}` : ""
        },
        isArcadeMode() ? "—" : translateEntity("items", mon.item),

        { value: stats.hp, className: getEvClass(mon.evs.hp ?? 0), statKey: "hp" },
        { value: stats.atk, className: getEvClass(mon.evs.atk ?? 0), statKey: "atk" },
        { value: stats.def, className: getEvClass(mon.evs.def ?? 0), statKey: "def" },
        { value: stats.spa, className: getEvClass(mon.evs.spa ?? 0), statKey: "spa" },
        { value: stats.spd, className: getEvClass(mon.evs.spd ?? 0), statKey: "spd" },
        { value: stats.spe, className: getEvClass(mon.evs.spe ?? 0), statKey: "spe" },

        translateEntity("moves", mon.moves[0]),
        translateEntity("moves", mon.moves[1]),
        translateEntity("moves", mon.moves[2]),
        translateEntity("moves", mon.moves[3])
    ];

    if (showIv) {
        cells.push(getBattlePokemonIv(mon));
    }

    return cells;
}

function getNatureBoostedStat(natureId) {
    return natureModifiers[natureId]?.up ?? "";
}

function getEvClass(ev) {
  if (ev >= 255) {
    return "ev-max";
  }

  if (ev >= 170) {
    return "ev-mid";
  }

  return "";
}

// Applies extra classes and type colors to one row cell.
function applyCellPresentation(td, cellData, index, mon) {
    if (cellData !== null && typeof cellData === "object") {
        td.textContent = cellData.value ?? "";

        if (cellData.className) {
        td.classList.add(cellData.className);
        }

        if (cellData.statKey) {
        td.classList.add(cellData.statKey);
        }
    } else {
        td.textContent = cellData ?? "";
    }

    if (index === 0) {
        setSpriteTextCell(td, getPokemonSpriteUrl(mon), getName(mon), getName(mon), "pokemon");
    }

    if (index === 2) {
        applyTypeColor(td, mon.types[0], "table");
    }

    if (index === 3 && mon.types[1]) {
        applyTypeColor(td, mon.types[1], "table");
    }

    if (index === 7 && !isArcadeMode()) {
        setSpriteTextCell(td, getItemSpriteUrl(mon.item), translateEntity("items", mon.item), translateEntity("items", mon.item), "item");
    }

    if (index >= 14 && index <= 17) {
        const moveId = mon.moves[index - 14];
        const moveType = getMoveType(moveId);
        applyTypeColor(td, moveType, "table");
    }
}

function getOpponentSlotIndexForPokemonTable(sourceIndex) {
    if (isFactoryMode() &&
        (battleState.format === "doubles" || battleState.format === "multi")) {
        return battleState.activeOpponentSlotIndex;
    }

    return getOpponentSlotIndexForTrainerTable(sourceIndex);
}

// Creates one table row for one Pokémon set.
function createPokemonTableRow(mon, level, sourceIndex, showIv = false) {
    const iv = getBattlePokemonIv(mon);
    const stats = calculateStats(mon, iv, level);
    const cells = getPokemonRowCells(mon, stats, showIv);
    const row = document.createElement("tr");

    cells.forEach((cellData, index) => {
        const td = document.createElement("td");
        applyCellPresentation(td, cellData, index, mon);
        row.appendChild(td);
    });

    if (isMonExcluded(mon, sourceIndex)) {
        row.classList.add("pokemon-row-excluded");
    }

    row.addEventListener("dblclick", () => {
        if (isMonExcluded(mon, sourceIndex)) {
            return;
        }

        selectSingleSetFromTable(mon, getOpponentSlotIndexForPokemonTable(sourceIndex));
    });

    return row;
}


// ---------------------------------------------------------------------
// Main trainer team rendering
// ---------------------------------------------------------------------

// Renders all possible Pokémon sets for the selected trainer or serie
function renderPokemonTable(table, mons, level, sourceIndex, { showIv = false } = {}) {
    table.replaceChildren();
    table.classList.remove("factory-table");
    table.classList.toggle("arcade-mode", isArcadeMode());

    const tbody = document.createElement("tbody");

    for (const mon of mons) {
        tbody.appendChild(createPokemonTableRow(mon, level, sourceIndex, showIv));
    }

    table.append(createPokemonTableHead(showIv), tbody);
}
function renderTrainerPanel(trainerIndex) {
    const trainerState = getTrainerBattleState(trainerIndex);
    const trainer = trainerState.trainer;
    const panelDom = dom.trainerPanels[trainerIndex];

    if (!trainer) {
        panelDom.container.hidden = true;
        panelDom.table.replaceChildren();
        return;
    }

    panelDom.container.hidden = false;
    panelDom.title.textContent = getName(trainer);
    panelDom.info.textContent =
        `${translate("ui", "iv")} : ${trainer.ivTier} — ${translate("ui", "pool")} : ${trainer.poolId.toUpperCase()}`;

    const team = window.frontierTrainerTeams[trainer.poolId];

    if (!team) {
        const row = panelDom.table.insertRow();
        const cell = row.insertCell();
        cell.textContent = translate("ui", "noTeamFound");
        return;
    }

    const level = getSelectedLevel();
    const availableMons = getAvailableBattleMons(trainerIndex);

    renderPokemonTable(panelDom.table, availableMons, level, trainerIndex);
    refreshBattleExclusionInterface(trainerIndex);
}

function getPokemonTableColumnCount(showIv = false) {
    return 18 + (showIv ? 1 : 0);
}

function createFactoryGroupHeaderRow(group, columnCount) {
    const row = document.createElement("tr");
    row.className = "factory-pool-group-row";

    const cell = document.createElement("th");
    cell.colSpan = columnCount;

    const label = translate("ui", getFactoryBattleGroupTranslationKey(group));
    cell.textContent = `${label} — ${group.mons.length} ${getFactoryPossibleSetsLabel(group.mons.length)}`;

    row.appendChild(cell);

    return row;
}

function createFactoryIvHeaderRow(ivGroup, columnCount) {
    const row = document.createElement("tr");
    row.className = "factory-pool-iv-row";

    const cell = document.createElement("th");
    cell.colSpan = columnCount;
    cell.textContent = `${translate("columns", "iv")} : ${ivGroup.iv} — ${ivGroup.mons.length} ${getFactoryPossibleSetsLabel(ivGroup.mons.length)}`;

    row.appendChild(cell);

    return row;
}

function renderFactoryPanel() {
    const sourceIndex = PRIMARY_TRAINER_SLOT_INDEX;
    const source = getBattlePokemonSource(sourceIndex);
    const panelDom = dom.trainerPanels[sourceIndex];

    if (!source) {
        panelDom.container.hidden = true;
        panelDom.table.replaceChildren();
        return;
    }

    panelDom.container.hidden = false;
    panelDom.container.open = true;
    panelDom.title.textContent = translate("ui", "facilityFactory");
    panelDom.info.textContent = translate("series", selectedFactorySeriesId);

    const opponentSource = { ...source, mons: getAvailableOpponentBattleMons(sourceIndex)};

    renderFactoryPokemonTable(panelDom.table, opponentSource, getSelectedLevel(), sourceIndex);

    refreshBattleExclusionInterface(sourceIndex);
}

function renderFactoryPokemonTable(table, source, level, sourceIndex) {
    const showIv = true;
    const columnCount = getPokemonTableColumnCount(showIv);
    const groups = getFactoryBattleGroups(source.mons, source);

    table.replaceChildren();
    table.classList.add("factory-table");
    table.classList.remove("arcade-mode");
    table.appendChild(createPokemonTableHead(showIv));

    for (const group of groups) {
        const tbody = document.createElement("tbody");

        tbody.appendChild(createFactoryGroupHeaderRow(group, columnCount));

        for (const ivGroup of group.ivGroups) {
            tbody.appendChild(createFactoryIvHeaderRow(ivGroup, columnCount));

            for (const mon of ivGroup.mons) {
                tbody.appendChild(createPokemonTableRow(mon, level, sourceIndex, showIv));
            }
        }

        table.appendChild(tbody);
    }
}

function renderBattlePokemonSource(sourceIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    if (isFactoryMode()) {
        renderFactoryPanel();
        return;
    }

    renderTrainerPanel(sourceIndex);
}

function renderBattleResults() {
    const isFactory = isFactoryMode();
    const isMulti = battleState.format === "multi";
    const usesMultiTrainerLayout = isMulti && !isFactory;
    const sourceCount = isFactory ? 1 : getActiveTrainerCount();

    const hasAnySource = Array.from(
        { length: sourceCount },
        (_, sourceIndex) => hasBattlePokemonSource(sourceIndex)
    ).some(Boolean);

    if (!hasAnySource) {
        dom.resultsContainer.hidden = true;
        return;
    }

    dom.resultsContainer.hidden = false;
    dom.resultsContainer.classList.toggle("is-multi", usesMultiTrainerLayout);
    dom.resultsContainer.classList.toggle("is-factory", isFactory);
    dom.singleTrainerHeader.hidden = usesMultiTrainerLayout;

    if (!isFactory) {
        dom.factoryPlayerTeam.container.hidden = true;
    }

    if (isFactory) {
        const sourceIndex = PRIMARY_TRAINER_SLOT_INDEX;
        const source = getBattlePokemonSource(sourceIndex);
        const opponentMons = getAvailableOpponentBattleMons(sourceIndex);

        dom.trainerTitle.textContent = `${translate("ui", "facilityFactory")} — ${translate("series", selectedFactorySeriesId)}`;

        dom.trainerInfo.textContent =
            `${translate("ui", "levelLabel")} ${getSelectedLevel()} — ` +
            `${opponentMons.length} ${getFactoryPossibleSetsLabel(opponentMons.length)}`;

        dom.trainerPanels[0].container.hidden = false;
        dom.trainerPanels[0].container.open = true;
        dom.trainerPanels[1].container.hidden = true;

        renderFactoryPlayerTeam();
        renderBattlePokemonSource(sourceIndex);
        refreshOpponentBattleInterface();

        return;
    }

    const primaryTrainer = getTrainerBattleState(PRIMARY_TRAINER_SLOT_INDEX).trainer;

    if (!isMulti && primaryTrainer) {
        dom.trainerPanels[0].container.open = true;

        dom.trainerTitle.textContent = getName(primaryTrainer);
        dom.trainerInfo.textContent = `${translate("ui", "iv")} : ${primaryTrainer.ivTier} — ${translate("ui", "pool")} : ${primaryTrainer.poolId.toUpperCase()}`;
    }

    for (let trainerIndex = 0; trainerIndex < battleState.trainers.length; trainerIndex++) {
        const isActive = trainerIndex < getActiveTrainerCount();

        if (!isActive) {
            dom.trainerPanels[trainerIndex].container.hidden = true;
            continue;
        }

        renderBattlePokemonSource(trainerIndex);
    }

    refreshOpponentBattleInterface();
}

function selectTrainerAndRender(trainer, trainerIndex = PRIMARY_TRAINER_SLOT_INDEX) {
    if (!trainer) {
        return;
    }

    const trainerState = getTrainerBattleState(trainerIndex);
    const slotDom = getTrainerSlotDom(trainerIndex);

    trainerState.trainer = trainer;
    resetTrainerBattleExclusions(trainerIndex);

    for (const opponentSlotIndex of getOpponentSlotIndexesForTrainer(trainerIndex)) {
        resetOpponentBattleState(opponentSlotIndex);
    }

    slotDom.input.value = getName(trainer);
    slotDom.select.value = trainer.id;
    slotDom.suggestions.hidden = true;

    if (battleState.format === "multi") {
        for (let slotIndex = 0; slotIndex < getActiveTrainerCount(); slotIndex++) {
            const selectedTrainerId = getTrainerBattleState(slotIndex).trainer?.id ?? null;
            populateTrainerSelect(slotIndex, selectedTrainerId);
        }
    }

    renderBattleResults();
}