/**
 * sls_stats.js — SLS Competition Stats Page
 * Fetches leaderboard data from the same endpoint as sls.js and renders:
 * 1. Tick Distribution (doughnut)
 * 2. Flash & Bonus Rates (stat cards)
 * 3. Round Averages (bar)
 * 4. Score Distribution (histogram)
 * 5. Route Difficulty (stacked bar)
 * 6. Competitor Tick Table (sortable, tick-filterable)
 */

const scoreUrl =
    "https://script.google.com/macros/s/AKfycbxT-iCL9thSaPhjBbR2guYymQ6Q9fxuebsgbVT9tavoG1-DWmm6yU8_HR7aovXW5sS-Wg/exec";

const categories = ["open", "advanced", "intermediate", "recreational", "youth"];

// All 16 routes, in order
const ROUTE_KEYS = [];
for (let r = 1; r <= 4; r++) {
    for (const l of ["a", "b", "c", "d"]) {
        ROUTE_KEYS.push({ round: r, letter: l, key: `r${r}_${l}` });
    }
}

let allData = [];
let activeGender = "";
let activeCategory = "";
let activeTickFilter = "all";
const charts = {};

// ----------------------------------------------------------------
// Data helpers
// ----------------------------------------------------------------

/**
 * Assigns ranks per gender+category group. Ties share a rank (1,1,3…).
 * Mirrors the logic in sls.js so ranks are consistent between pages.
 */
function computeRanks(data) {
    const groups = {};
    data.forEach(row => {
        const key = `${row.gender}|${row.category}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });
    Object.values(groups).forEach(group => {
        group.sort((a, b) => b.score - a.score);
        let rank = 1;
        group.forEach((row, i) => {
            if (i > 0 && row.score < group[i - 1].score) rank = i + 1;
            row.rank = rank;
        });
    });
    return data;
}

/**
 * Returns the semantic type of a tick based on tick + bonus values.
 * Mirrors the score thresholds used in tickIcon() in sls.js.
 */
function classifyTick(tick, bonus) {
    const t = tick || 0;
    const b = bonus || 0;
    const score = t + b;
    if (score === 0) return "none";
    if (score <= 25) return "zone1";
    if (score <= 35) return "zone2";
    if (score === 50) return "top";
    if (score === 60 && t === 50) return "top";   // top + bonus
    if (score >= 60) return "flash";
    return "none";
}

/** Filters allData by current active gender/category controls. */
function filterData() {
    return allData.filter(row => {
        const gMatch = !activeGender || row.gender.toLowerCase() === activeGender;
        let cMatch = true;
        if (activeCategory === "lead") {
            cMatch = ["advanced", "intermediate", "open"].includes(row.category.toLowerCase());
        } else if (activeCategory === "tr") {
            cMatch = ["recreational", "youth"].includes(row.category.toLowerCase());
        } else if (activeCategory && activeCategory !== "all") {
            cMatch = row.category.toLowerCase() === categories[parseInt(activeCategory)];
        }
        return gMatch && cMatch;
    });
}

// ----------------------------------------------------------------
// Fetch
// ----------------------------------------------------------------

function fetchData() {
    typeof mySpinner !== "undefined" && mySpinner.show();
    $.ajax({
        url: scoreUrl,
        data: { format: "json" },
        success(response) {
            allData = computeRanks(response.data || []);
            const el = document.getElementById("updatedAt");
            if (el) el.textContent = moment().format("D MMM YY, HH:mm");
            renderAll();
            typeof mySpinner !== "undefined" && mySpinner.hide();
        },
        error() {
            typeof mySpinner !== "undefined" && mySpinner.hide();
            console.error("Failed to fetch SLS data.");
        }
    });
}

function refreshData() {
    fetchData();
}

// ----------------------------------------------------------------
// Render all sections
// ----------------------------------------------------------------

function renderAll() {
    const data = filterData();
    renderTickDist(data);
    renderFlashBonus(data);
    renderRoundAvg(data);
    renderScoreDist(data);
    renderRouteDiff(data);
    renderTickTable(data);
}

// ----------------------------------------------------------------
// 1. Tick Distribution — doughnut
// ----------------------------------------------------------------

function renderTickDist(data) {
    const counts = { none: 0, zone1: 0, zone2: 0, top: 0, flash: 0 };
    data.forEach(row => {
        ROUTE_KEYS.forEach(({ key }) => {
            counts[classifyTick(row[key], row[key + "_bonus"])]++;
        });
    });

    destroyChart("tickDist");
    const ctx = document.getElementById("tickDistChart").getContext("2d");
    charts.tickDist = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["No Score", "Zone 1", "Zone 2", "Top", "Flash"],
            datasets: [{
                data: [counts.none, counts.zone1, counts.zone2, counts.top, counts.flash],
                backgroundColor: ["#dee2e6", "#adb5bd", "#6c757d", "#0d6efd", "#ffd900"],
                borderColor: "#fff",
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                legend: { position: "bottom", labels: { boxWidth: 12, padding: 12 } }
            },
            cutout: "65%"
        }
    });
}

// ----------------------------------------------------------------
// 2. Flash & Bonus Rates — stat cards
// ----------------------------------------------------------------

function renderFlashBonus(data) {
    let tops = 0, flashes = 0, scored = 0, bonuses = 0;
    data.forEach(row => {
        ROUTE_KEYS.forEach(({ key }) => {
            const tick = row[key] || 0;
            const bonus = row[key + "_bonus"] || 0;
            const type = classifyTick(tick, bonus);
            if (type === "top" || type === "flash") tops++;
            if (type === "flash") flashes++;
            if (type !== "none") scored++;
            if (bonus > 0) bonuses++;
        });
    });

    const flashRate = tops > 0 ? Math.round((flashes / tops) * 100) : 0;
    const bonusRate = scored > 0 ? Math.round((bonuses / scored) * 100) : 0;

    setText("statFlashRate", flashRate + "%");
    setText("statFlashDetail", `${flashes} flash${flashes !== 1 ? "es" : ""} out of ${tops} tops`);
    setText("statBonusRate", bonusRate + "%");
    setText("statBonusDetail", `${bonuses} bonus${bonuses !== 1 ? "es" : ""} out of ${scored} scored ticks`);
    setText("statCompetitors", data.length);
    setText("statTotalScored", scored);
}

// ----------------------------------------------------------------
// 3. Round Averages — bar chart
// ----------------------------------------------------------------

function renderRoundAvg(data) {
    if (!data.length) return;
    const totals = [0, 0, 0, 0];
    data.forEach(row => {
        for (let r = 1; r <= 4; r++) {
            let s = 0;
            for (const l of ["a", "b", "c", "d"]) {
                s += (row[`r${r}_${l}`] || 0) + (row[`r${r}_${l}_bonus`] || 0);
            }
            totals[r - 1] += s;
        }
    });
    const avgs = totals.map(t => +(t / data.length).toFixed(1));

    destroyChart("roundAvg");
    const ctx = document.getElementById("roundAvgChart").getContext("2d");
    charts.roundAvg = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Round 1", "Round 2", "Round 3", "Round 4"],
            datasets: [{
                label: "Avg Score",
                data: avgs,
                backgroundColor: "rgba(13,110,253,0.5)",
                borderColor: "#0d6efd",
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// ----------------------------------------------------------------
// 4. Score Distribution — histogram
// ----------------------------------------------------------------

function renderScoreDist(data) {
    const bucketSize = 50;
    const maxBuckets = 16;  // covers 0–799 pts (16 routes × 50 max = 800)
    const counts = new Array(maxBuckets).fill(0);
    data.forEach(row => {
        const idx = Math.min(Math.floor((row.score || 0) / bucketSize), maxBuckets - 1);
        counts[idx]++;
    });
    const labels = counts.map((_, i) => `${i * bucketSize}–${(i + 1) * bucketSize - 1}`);

    destroyChart("scoreDist");
    const ctx = document.getElementById("scoreDistChart").getContext("2d");
    charts.scoreDist = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Competitors",
                data: counts,
                backgroundColor: "rgba(13,110,253,0.5)",
                borderColor: "#0d6efd",
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { ticks: { maxRotation: 45, font: { size: 11 } } }
            }
        }
    });
}

// ----------------------------------------------------------------
// 5. Route Difficulty — stacked bar
// ----------------------------------------------------------------

function renderRouteDiff(data) {
    const n = data.length || 1;
    const labels = ROUTE_KEYS.map(({ round, letter }) => `R${round}${letter.toUpperCase()}`);
    const zone1 = [], zone2 = [], tops = [], flashes = [];

    ROUTE_KEYS.forEach(({ key }) => {
        let z1 = 0, z2 = 0, top = 0, flash = 0;
        data.forEach(row => {
            const type = classifyTick(row[key], row[key + "_bonus"]);
            if (type === "zone1") z1++;
            else if (type === "zone2") z2++;
            else if (type === "top") top++;
            else if (type === "flash") flash++;
        });
        zone1.push(+(z1 / n * 100).toFixed(1));
        zone2.push(+(z2 / n * 100).toFixed(1));
        tops.push(+(top / n * 100).toFixed(1));
        flashes.push(+(flash / n * 100).toFixed(1));
    });

    destroyChart("routeDiff");
    const ctx = document.getElementById("routeDiffChart").getContext("2d");
    charts.routeDiff = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Flash", data: flashes, backgroundColor: "#ffd900", stack: "s" },
                { label: "Top",   data: tops,    backgroundColor: "#0d6efd", stack: "s" },
                { label: "Zone 2", data: zone2,  backgroundColor: "#6c757d", stack: "s" },
                { label: "Zone 1", data: zone1,  backgroundColor: "#adb5bd", stack: "s" }
            ]
        },
        options: {
            plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 12 } } },
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    max: 100,
                    beginAtZero: true,
                    ticks: { callback: v => v + "%" }
                }
            }
        }
    });
}

// ----------------------------------------------------------------
// 6. Competitor Tick Table
// ----------------------------------------------------------------

function renderTickTable(data) {
    // Sort: category → gender → rank
    const sorted = [...data].sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
        return (a.rank || 999) - (b.rank || 999);
    });

    const tbody = document.getElementById("tickTableBody");
    tbody.innerHTML = "";

    sorted.forEach(row => {
        const tr = document.createElement("tr");

        let cells = `
            <td class="text-end fw-semibold">${row.rank || ""}</td>
            <td class="text-nowrap">${row.name}</td>
            <td class="text-end"><span class="badge bg-primary rounded-pill">${row.score}</span></td>
            <td class="text-nowrap"><small class="text-muted">${capitalize(row.category)} / ${row.gender}</small></td>
        `;

        ROUTE_KEYS.forEach(({ round, letter, key }) => {
            const tick = row[key] || 0;
            const bonus = row[key + "_bonus"] || 0;
            const type = classifyTick(tick, bonus);
            const hasBonus = bonus > 0;
            cells += `<td class="text-center text-round${round} tick-cell" data-tick-type="${type}" data-has-bonus="${hasBonus}">${tickIcon(tick, bonus)}</td>`;
        });

        tr.innerHTML = cells;
        tbody.appendChild(tr);
    });

    applyTickFilter();
}

/** Fades cells that don't match the current tick filter. */
function applyTickFilter() {
    const filter = activeTickFilter;
    document.querySelectorAll("#tickTableBody .tick-cell").forEach(cell => {
        const type = cell.dataset.tickType;
        const hasBonus = cell.dataset.hasBonus === "true";
        let show;
        switch (filter) {
            case "flash":    show = type === "flash"; break;
            case "top":      show = type === "top" || type === "flash"; break;
            case "zone":     show = type === "zone1" || type === "zone2"; break;
            case "zone1":    show = type === "zone1"; break;
            case "zone2":    show = type === "zone2"; break;
            case "bonus":    show = hasBonus; break;
            case "no-bonus": show = type !== "none" && !hasBonus; break;
            case "none":     show = type === "none"; break;
            default:         show = true;
        }
        cell.style.opacity = show ? "1" : "0.1";
    });
}

function setTickFilter(val) {
    activeTickFilter = val;
    applyTickFilter();
}

// ----------------------------------------------------------------
// Filter controls
// ----------------------------------------------------------------

function changeGender(gender) {
    activeGender = gender || "";
    renderAll();
}

function changeCategory(cat) {
    activeCategory = cat || "";
    renderAll();
}

function handleGenderSelect(el) {
    changeGender(el.value);
}

function handleCategorySelect(el) {
    changeCategory(el.value);
}

// ----------------------------------------------------------------
// SVG Tick Icon (copied from sls.js — keep in sync)
// ----------------------------------------------------------------

function tickIcon(tick = 0, bonus = 0) {
    const score = tick + bonus;
    switch (score) {
        case 20:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/><rect style="stroke:none" width="10.508" height="4.264" x="2.876" y="10.75"/></svg>`;
        case 25:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/><rect style="stroke:none" width="10.508" height="4.264" x="2.876" y="10.75"/><path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z"/></svg>`;
        case 30:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/><rect style="stroke:none" width="10.508" height="9.106" x="2.876" y="5.908"/></svg>`;
        case 35:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/><rect style="stroke:none" width="10.508" height="9.106" x="2.876" y="5.908"/><path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z"/></svg>`;
        case 50:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/></svg>`;
        case 60:
            if (tick === 50) {
                return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/><path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z"/></svg>`;
            } else {
                return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16"><path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/></svg>`;
            }
        case 70:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16"><path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/><path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z"/></svg>`;
        default:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/></svg>`;
    }
}

// ----------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------

function destroyChart(id) {
    if (charts[id]) {
        charts[id].destroy();
        delete charts[id];
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

// ----------------------------------------------------------------
// Bootstrap tooltip init + page load
// ----------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // Apply dark-theme defaults to all Chart.js instances
    Chart.defaults.color = "rgba(254,253,251,0.85)";
    Chart.defaults.borderColor = "rgba(255,255,255,0.07)";
    Chart.defaults.plugins.legend.labels.color = "rgba(254,253,251,0.9)";

    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el =>
        new bootstrap.Tooltip(el)
    );
    fetchData();
});
