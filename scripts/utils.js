"use strict";

function getPokemonSpriteSlug(mon) {
    return pokemonSpriteSlugOverrides[mon.speciesId] ?? mon.speciesId.replaceAll("_", "-");
}

function getPokemonSpriteUrl(mon) {
    return `${pokemonSpriteBaseUrl}/${getPokemonSpriteSlug(mon)}.png`;
}

function getPokemonFrontSpriteUrl(mon) {
    return `https://img.pokemondb.net/sprites/platinum/normal/${getPokemonSpriteSlug(mon)}.png`;
}

function getItemSpriteUrl(itemId) {
    const path = itemSpriteMap[itemId];
    if (!path) {
        return null;
    }
    return `${itemSpriteBaseUrl}/${path}.png`;
}

function applyTypeColor(element, typeId, variant = "default") {
    if (!typeId) {
        return;
    }
    const colors = typeColors[typeId];
    if (!colors) {
        return;
    }
    element.style.backgroundColor = colors.bg;
    element.classList.add("type-colored");
    if (variant === "table") {
        element.classList.add("table-type-colored");
    }
}

function applyNatureColor(element, natureId) {
    const boostedStat = getNatureBoostedStat(natureId);
    if (!boostedStat) {
        return;
    }
    element.classList.add(`nature-badge-${boostedStat}`);
}

// Returns the type of a move from moves.js.
function getMoveType(moveId) {
    return window.moves?.[moveId]?.type ?? null;
}
