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
function createPokemonTableHead() {
  const thead = document.createElement("thead");
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
    </tr>
  `;
  return thead;
}

// Returns the data used to create one Pokémon table row.
function getPokemonRowCells(mon, trainer, stats) {
  const ability1 = mon.abilities[0] ? translateEntity("abilities", mon.abilities[0]) : "";
  const ability2 = mon.abilities[1] ? translateEntity("abilities", mon.abilities[1]) : "";

  return [
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
    translateEntity("items", mon.item),

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

    if (index === 7) {
        setSpriteTextCell(td, getItemSpriteUrl(mon.item), translateEntity("items", mon.item), translateEntity("items", mon.item), "item");
    }

    if (index >= 14 && index <= 17) {
        const moveId = mon.moves[index - 14];
        const moveType = getMoveType(moveId);
        applyTypeColor(td, moveType, "table");
    }
}

// Creates one table row for one Pokémon set.
function createPokemonTableRow(mon, trainer, level) {
  const stats = calculateStats(mon, trainer.ivTier, level);
  const cells = getPokemonRowCells(mon, trainer, stats);
  const row = document.createElement("tr");

  cells.forEach((cellData, index) => {
    const td = document.createElement("td");
    applyCellPresentation(td, cellData, index, mon);
    row.appendChild(td);
  });

  if (isMonExcluded(mon)) {
      row.classList.add("pokemon-row-excluded");
  }

  row.addEventListener("dblclick", () => {
    if (isMonExcluded(mon)) {
        return;
    }
    selectSingleSetFromTable(mon);
  });

  return row;
}


// ---------------------------------------------------------------------
// Main trainer team rendering
// ---------------------------------------------------------------------

// Renders the selected trainer and all possible Pokémon sets.
function renderTrainerTeam(trainer) {
  const resultsContainer = dom.resultsContainer;
  const trainerTitle = dom.trainerTitle;
  const trainerInfo = dom.trainerInfo;
  const pokemonTable = dom.pokemonResults;
  const team = window.frontierTrainerTeams[trainer.poolId];

  trainerTitle.textContent = getName(trainer);
  trainerInfo.textContent = `${translate("ui", "iv")} : ${trainer.ivTier} — ${translate("ui", "pool")} : ${trainer.poolId.toUpperCase()}`;
  pokemonTable.replaceChildren();

  if (!team) {
    const row = pokemonTable.insertRow();
    const cell = row.insertCell();
    cell.textContent = translate("ui", "noTeamFound");
    dom.resultsContainer.hidden = false;
    return;
  }

  const level = getSelectedLevel();
  const availableMons = getTrainerMonsForLevel(trainer, level);
  const tbody = document.createElement("tbody");

  for (const mon of availableMons) {
    const row = createPokemonTableRow(mon, trainer, level);
    tbody.appendChild(row);
  }

  pokemonTable.append(createPokemonTableHead(), tbody);
  dom.resultsContainer.hidden = false;
  populateOpponentPokemonSelect(trainer);
  refreshBattleExclusionInterface();
}

function getTrainerMons(trainer) {
  const team = window.frontierTrainerTeams[trainer.poolId];

  if (!team) {
    return [];
  }

  return team.setIds
    .map((setId) => window.frontierMons[setId])
    .filter(Boolean);
}

function selectTrainerAndRender(trainer) {
    if (!trainer) {
        return;
    }

    currentTrainer = trainer;
    resetBattleExclusions();

    dom.trainerTextInput.value = getName(trainer);
    dom.trainerSelect.value = trainer.id;
    dom.trainerSuggestions.hidden = true;

    renderTrainerTeam(trainer);
}