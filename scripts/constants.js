"use strict";

// -----------------------------------------------------------------------------
// App constants and cached DOM references
// -----------------------------------------------------------------------------

const spriteBaseUrl = "https://raw.githubusercontent.com/msikma/pokesprite/master";
const pokemonSpriteBaseUrl = `${spriteBaseUrl}/pokemon-gen7x/regular`;
const itemSpriteBaseUrl = `${spriteBaseUrl}/items`;

const forbiddenLevel50Species = new Set(["tyranitar", "dragonite"]);

const frontierSeries = [
    { id: "series_1", label: "Série 1", start: 1, end: 120 },
    { id: "series_2", label: "Série 2", start: 81, end: 140 },
    { id: "series_3", label: "Série 3", start: 101, end: 160 },
    { id: "series_4", label: "Série 4", start: 121, end: 180 },
    { id: "series_5", label: "Série 5", start: 141, end: 200 },
    { id: "series_6", label: "Série 6", start: 161, end: 220 },
    { id: "series_7", label: "Série 7", start: 181, end: 240 },
    { id: "series_8_plus", label: "Série 8+", start: 201, end: 300 }
];

const natureModifiers = {
    hardy: {},
    docile: {},
    serious: {},
    bashful: {},
    quirky: {},

    lonely: { up: "atk", down: "def" },
    brave: { up: "atk", down: "spe" },
    adamant: { up: "atk", down: "spa" },
    naughty: { up: "atk", down: "spd" },

    bold: { up: "def", down: "atk" },
    relaxed: { up: "def", down: "spe" },
    impish: { up: "def", down: "spa" },
    lax: { up: "def", down: "spd" },

    timid: { up: "spe", down: "atk" },
    hasty: { up: "spe", down: "def" },
    jolly: { up: "spe", down: "spa" },
    naive: { up: "spe", down: "spd" },

    modest: { up: "spa", down: "atk" },
    mild: { up: "spa", down: "def" },
    quiet: { up: "spa", down: "spe" },
    rash: { up: "spa", down: "spd" },

    calm: { up: "spd", down: "atk" },
    gentle: { up: "spd", down: "def" },
    sassy: { up: "spd", down: "spe" },
    careful: { up: "spd", down: "spa" }
};

const typeColors = {
    normal: { bg: "#aaaa79" },
    fire: { bg: "#f35130" },
    water: { bg: "#6992f3" },
    electric: { bg: "#fbd330" },
    grass: { bg: "#79cb51" },
    ice: { bg: "#9adbdb" },
    fighting: { bg: "#923028" },
    poison: { bg: "#a241a2" },
    ground: { bg: "#e3c369" },
    flying: { bg: "#a18cd4" },
    psychic: { bg: "#fb598a" },
    bug: { bg: "#aaba20" },
    rock: { bg: "#baa238" },
    ghost: { bg: "#71599a" },
    dragon: { bg: "#7138fb" },
    dark: { bg: "#715949" },
    steel: { bg: "#babad3" }
};

const pokemonSpriteSlugOverrides = {
    mr_mime: "mr-mime",
    nidoran_f: "nidoran-f",
    nidoran_m: "nidoran-m"
};

const itemSpriteMap = {
    aspear_berry: "berry/aspear",
    big_root: "hold-item/big-root",
    black_belt: "hold-item/black-belt",
    blackglasses: "hold-item/black-glasses",
    black_sludge: "hold-item/black-sludge",
    brightpowder: "hold-item/bright-powder",
    charcoal: "hold-item/charcoal",
    charti_berry: "berry/charti",
    cheri_berry: "berry/cheri",
    chesto_berry: "berry/chesto",
    choice_band: "hold-item/choice-band",
    choice_scarf: "hold-item/choice-scarf",
    choice_specs: "hold-item/choice-specs",
    chople_berry: "berry/chople",
    coba_berry: "berry/coba",
    colbur_berry: "berry/colbur",
    damp_rock: "hold-item/damp-rock",
    deepseascale: "evo-item/deep-sea-scale",
    dragon_fang: "hold-item/dragon_fang",
    expert_belt: "hold-item/expert-belt",
    focus_band: "hold-item/focus-band",
    focus_sash: "hold-item/focus-sash",
    grip_claw: "hold-item/grip-claw",
    haban_berry: "berry/haban",
    hard_stone: "hold-item/hard-stone",
    heat_rock: "hold-item/heat-rock",
    icy_rock: "hold-item/icy-rock",
    iron_ball: "hold-item/iron-ball",
    kasib_berry: "berry/kasib",
    kings_rock: "hold-item/kings-rock",
    lansat_berry: "berry/lansat",
    lax_incense: "incense/lax",
    leftovers: "hold-item/leftovers",
    leppa_berry: "berry/leppa",
    liechi_berry: "berry/liechi",
    life_orb: "hold-item/life-orb",
    light_ball: "hold-item/light-ball",
    light_clay: "hold-item/light-clay",
    lucky_punch: "hold-item/lucky-punch",
    lum_berry: "berry/lum",
    magnet: "hold-item/magnet",
    mental_herb: "hold-item/mental-herb",
    metal_coat: "hold-item/metal-coat",
    metal_powder: "hold-item/metal-powder",
    metronome: "hold-item/metronome",
    miracle_seed: "hold-item/miracle-seed",
    muscle_band: "hold-item/muscle-band",
    mystic_water: "hold-item/mystic-water",
    nevermeltice: "hold-item/never-melt-ice",
    occa_berry: "berry/occa",
    odd_incense: "incense/odd",
    passho_berry: "berry/passho",
    payapa_berry: "berry/payapa",
    pecha_berry: "berry/pecha",
    persim_berry: "berry/persim",
    petaya_berry: "berry/petaya",
    poison_barb: "hold-item/poison-barb",
    power_herb: "hold-item/power-herb",
    quick_claw: "hold-item/quick-claw",
    rawst_berry: "berry/rawst",
    razor_claw: "evo-item/razor-claw",
    razor_fang: "evo-item/razor-fang",
    rindo_berry: "berry/rindo",
    rock_incense: "incense/rock",
    rose_incense: "incense/rose",
    salac_berry: "berry/salac",
    scope_lens: "hold-item/scope-lens",
    sea_incense: "incense/sea",
    sharp_beak: "hold-item/sharp-beak",
    shell_bell: "hold-item/shell-bell",
    shuca_berry: "berry/shuca",
    silk_scarf: "hold-item/silk-scarf",
    silverpowder: "hold-item/silver-powder",
    sitrus_berry: "berry/sitrus",
    soft_sand: "hold-item/soft-sand",
    spell_tag: "hold-item/spell-tag",
    stick: "hold-item/stick",
    thick_club: "hold-item/thick-club",
    toxic_orb: "hold-item/toxic-orb",
    twistedspoon: "hold-item/twisted-spoon",
    wacan_berry: "berry/wacan",
    wave_incense: "incense/wave",
    white_herb: "hold-item/white-herb",
    wide_lens: "hold-item/wide-lens",
    wise_glasses: "hold-item/wise-glasses",
    yache_berry: "berry/yache",
    zoom_lens: "hold-item/zoom-lens"
};

const dom = {
    pageTitle: document.getElementById("page-title"),
    languageToggle: document.getElementById("language-toggle"),

    trainerForm: document.getElementById("trainer-form"),
    trainerLabel: document.getElementById("trainer-label"),
    trainerTextInput: document.getElementById("trainer-text-input"),
    trainerSuggestions: document.getElementById("trainer-suggestions"),
    trainerSelect: document.getElementById("trainer-select"),

    levelLabel: document.getElementById("level-label"),
    levelInput: document.getElementById("level-input"),

    seriesFilterDropdown: document.querySelector(".series-filter-dropdown"),
    seriesFilterButton: document.getElementById("series-filter-button"),
    seriesFilterMenu: document.getElementById("series-filter-menu"),

    facilityModeLabel: document.getElementById("facility-mode-label"),
    facilityNormalLabel: document.getElementById("facility-normal-label"),
    facilityFactoryLabel: document.getElementById("facility-factory-label"),
    facilityArcadeLabel: document.getElementById("facility-arcade-label"),
    facilityHallLabel: document.getElementById("facility-hall-label"),
    facilityModeInputs: document.querySelectorAll('input[name="facility-mode"]'),

    battleFormatLabel: document.getElementById("battle-format-label"),
    battleFormatSinglesLabel: document.getElementById("battle-format-singles-label"),
    battleFormatDoublesLabel: document.getElementById("battle-format-doubles-label"),
    battleFormatMultiLabel: document.getElementById("battle-format-multi-label"),
    battleFormatInputs: document.querySelectorAll('input[name="battle-format"]'),

    resultsContainer: document.getElementById("results-container"),
    trainerTitle: document.getElementById("trainer-title"),
    trainerInfo: document.getElementById("trainer-info"),
    pokemonResults: document.getElementById("pokemon-results"),

    battleExclusionsContainer: document.getElementById("battle-exclusions-container"),

    excludedPokemonLabel: document.getElementById("excluded-pokemon-label"),
    excludedPokemonInput: document.getElementById("excluded-pokemon-input"),
    excludedPokemonTags: document.getElementById("excluded-pokemon-tags"),
    excludedPokemonSuggestions: document.getElementById("excluded-pokemon-suggestions"),

    excludedItemField: document.getElementById("excluded-item-field"),
    excludedItemLabel: document.getElementById("excluded-item-label"),
    excludedItemInput: document.getElementById("excluded-item-input"),
    excludedItemTags: document.getElementById("excluded-item-tags"),
    excludedItemSuggestions: document.getElementById("excluded-item-suggestions"),

    opponentSearchContainer: document.getElementById("opponent-search-container"),
    opponentPokemonLabel: document.getElementById("opponent-pokemon-label"),
    opponentPokemonInput: document.getElementById("opponent-pokemon-input"),
    opponentPokemonSuggestions: document.getElementById("opponent-pokemon-suggestions"),
    opponentPokemonSelect: document.getElementById("opponent-pokemon-select"),

    selectedPokemonDetails: document.getElementById("selected-pokemon-details"),

    opponentSlots: [
        {
            container: document.getElementById("opponent-slot-0"),
            label: document.getElementById("opponent-pokemon-label"),
            input: document.getElementById("opponent-pokemon-input"),
            suggestions: document.getElementById("opponent-pokemon-suggestions"),
            select: document.getElementById("opponent-pokemon-select"),
            details: document.getElementById("selected-pokemon-details")
        },
        {
            container: document.getElementById("opponent-slot-1"),
            label: document.getElementById("opponent-pokemon-label-2"),
            input: document.getElementById("opponent-pokemon-input-2"),
            suggestions: document.getElementById("opponent-pokemon-suggestions-2"),
            select: document.getElementById("opponent-pokemon-select-2"),
            details: document.getElementById("selected-pokemon-details-2")
        }
    ],
    trainerSlots: [
        {
            container: document.getElementById("trainer-slot-0"),
            label: document.getElementById("trainer-slot-label-0"),
            input: document.getElementById("trainer-text-input"),
            suggestions: document.getElementById("trainer-suggestions"),
            select: document.getElementById("trainer-select")
        },
        {
            container: document.getElementById("trainer-slot-1"),
            label: document.getElementById("trainer-slot-label-1"),
            input: document.getElementById("trainer-text-input-2"),
            suggestions: document.getElementById("trainer-suggestions-2"),
            select: document.getElementById("trainer-select-2")
        }
    ],
    singleTrainerHeader: document.getElementById("single-trainer-header"),
    trainerPanels: [
        {
            container: document.getElementById("trainer-panel-0"),
            title: document.getElementById("trainer-panel-title-0"),
            info: document.getElementById("trainer-panel-info-0"),
            table: document.getElementById("pokemon-results"),
            exclusions: {
                container: document.getElementById("battle-exclusions-container"),
                pokemonLabel: document.getElementById("excluded-pokemon-label"),
                pokemonInput: document.getElementById("excluded-pokemon-input"),
                pokemonTags: document.getElementById("excluded-pokemon-tags"),
                pokemonSuggestions: document.getElementById("excluded-pokemon-suggestions"),
                itemField: document.getElementById("excluded-item-field"),
                itemLabel: document.getElementById("excluded-item-label"),
                itemInput: document.getElementById("excluded-item-input"),
                itemTags: document.getElementById("excluded-item-tags"),
                itemSuggestions: document.getElementById("excluded-item-suggestions")
            }
        },
        {
            container: document.getElementById("trainer-panel-1"),
            title: document.getElementById("trainer-panel-title-1"),
            info: document.getElementById("trainer-panel-info-1"),
            table: document.getElementById("pokemon-results-2"),
            exclusions: {
                container: document.getElementById("battle-exclusions-container-2"),
                pokemonLabel: document.getElementById("excluded-pokemon-label-2"),
                pokemonInput: document.getElementById("excluded-pokemon-input-2"),
                pokemonTags: document.getElementById("excluded-pokemon-tags-2"),
                pokemonSuggestions: document.getElementById("excluded-pokemon-suggestions-2"),
                itemField: document.getElementById("excluded-item-field-2"),
                itemLabel: document.getElementById("excluded-item-label-2"),
                itemInput: document.getElementById("excluded-item-input-2"),
                itemTags: document.getElementById("excluded-item-tags-2"),
                itemSuggestions: document.getElementById("excluded-item-suggestions-2")
            }
        }
    ],
};
