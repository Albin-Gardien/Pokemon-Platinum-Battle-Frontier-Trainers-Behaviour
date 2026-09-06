"use strict";

// -----------------------------------------------------------------------------
// Sprite and asset helpers
// -----------------------------------------------------------------------------

// Returns pokemon sprite slug
function getPokemonSpriteSlug(mon) {
    return pokemonSpriteSlugOverrides[mon.speciesId] ?? mon.speciesId.replaceAll("_", "-");
}

// Returns pokemon sprite url
function getPokemonSpriteUrl(mon) {
    return `${pokemonSpriteBaseUrl}/${getPokemonSpriteSlug(mon)}.png`;
}

// Returns pokemon front sprite url
function getPokemonFrontSpriteUrl(mon) {
    return `https://img.pokemondb.net/sprites/platinum/normal/${getPokemonSpriteSlug(mon)}.png`;
}

// Returns item sprite url
function getItemSpriteUrl(itemId) {
    const path = itemSpriteMap[itemId];
    if (!path) {
        return null;
    }
    return `${itemSpriteBaseUrl}/${path}.png`;
}

// -----------------------------------------------------------------------------
// Presentation helpers
// -----------------------------------------------------------------------------

// Applies type color
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

// Applies nature color
function applyNatureColor(element, natureId) {
    const boostedStat = getNatureBoostedStat(natureId);
    if (!boostedStat) {
        return;
    }
    element.classList.add(`nature-badge-${boostedStat}`);
}

// -----------------------------------------------------------------------------
// Move helpers
// -----------------------------------------------------------------------------

// Returns the type of a move from moves.js
function getMoveType(moveId) {
    return window.moves?.[moveId]?.type ?? null;
}
