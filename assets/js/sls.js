/**
 * -------------------------------------
 * Default Settings and Global Variables
 * -------------------------------------
 */

// URL for retrieving scores (public data)
const scoreUrl =
    "https://script.google.com/macros/s/AKfycbyQtX-xInuAc6JwZ-a370PAifWNGD9z4eyRKZj2oTC-5mUOfSmmBYllC5F_wcSMezcZIA/exec";
// URL for retrieving ticks (public data)
const ticksUrl =
    "https://script.google.com/macros/s/AKfycbyQtX-xInuAc6JwZ-a370PAifWNGD9z4eyRKZj2oTC-5mUOfSmmBYllC5F_wcSMezcZIA/exec?ticks";
// Number of rows to display per page in the DataTable
const rowsPerPage = 10;
const categories = ["open", "advanced", "intermediate", "novice", "youth"];
const competitionEndTime = new Date("2025-04-02T19:00:00+08:00");

// Bootstrap modal for loading spinner (non-dismissible)
let mySpinner = new bootstrap.Modal(document.getElementById("modalSpinner"), {
    keyboard: false,
});

// On DOM ready, load filters from the URL (if any)
document.addEventListener("DOMContentLoaded", loadFiltersFromURL);

/**
 * -------------------------------------
 * Countdown Timer Functionality
 * -------------------------------------
 */

/**
 * Updates the countdown timer display.
 * Uses a countdown library to calculate days, hours, and minutes until competitionEndTime.
 */
function updateCountdown() {
    const now = new Date();

    // Calculate the remaining time in days, hours, and minutes
    const timeLeft = countdown(
        now,
        competitionEndTime,
        countdown.DAYS | countdown.HOURS | countdown.MINUTES
    );

    // If the countdown has reached or passed zero, display a message and clear the timer.
    if (timeLeft.value <= 0) {
        document.querySelector("#timer").innerHTML = "Competition Ended!";
        clearInterval(timerInterval);
        return;
    }

    // Update the display with remaining time
    document.querySelector("[data-days]").innerText = timeLeft.days;
    document.querySelector("[data-hours]").innerText = timeLeft.hours;
    document.querySelector("[data-minutes]").innerText = timeLeft.minutes;
}

// Initialize the timer to update every second
const timerInterval = setInterval(updateCountdown, 1000);
updateCountdown();

/**
 * -------------------------------------
 * DataTable Configuration and Functions
 * -------------------------------------
 */

const tblMale = $("#tableMale");

// Initialize DataTable with Ajax data source and configuration
$("#tableMale")
    // Show loading spinner when an Ajax request starts
    .on("preXhr.dt", function (e, settings, json, xhr) {
        mySpinner.show();
    })
    // Hide spinner and update "Last Updated" time when Ajax request completes
    .on("xhr.dt", function (e, settings, json, xhr) {
        let updatedAtEl = document.getElementById("updatedAt");
        moment.locale("au");
        updatedAtEl.innerText = moment().format("D MMM YY, HH:mm");
        mySpinner.hide();
    })
    .dataTable({
        ajax: {
            url: scoreUrl,
            cache: true,
            data: function (d) {
                d.format = "json";
            },
            dataSrc: "data",
        },

        // Define table columns
        columns: [
            { data: "gender", visible: false, title: "Gender" },
            { data: "category", visible: false, title: "Category" },
            {
                data: "rank",
                title: "#",
                class: "dt-right align-middle",
                orderable: true,
                render: function (data, type) {
                    if (type === "display") {
                        // Apply custom styling for top ranks
                        switch (data) {
                            case 1:
                            case 2:
                            case 3:
                                return `<span class="text-primary bg-transparent fw-semibold">${data}</span>`;
                            case 4:
                            case 5:
                            case 6:
                                return `<span class="text-black bg-transparent fw-semibold">${data}</span>`;
                            default:
                                return `<span class="text-black bg-transparent">${data}</span>`;
                        }
                    }
                    return data;
                },
            },
            {
                data: "name",
                title: "Name",
                orderable: true,
                class: "align-middle",
            },
            {
                data: "score",
                title: "Score",
                orderable: true,
                class: "dt-right align-middle details-control",
                render: function (data, type) {
                    if (type === "display") {
                        // Render score as a styled button
                        return `<span class="btn btn-sm btn-outline-primary">${data}</span>`;
                    }
                    return data;
                },
            },
        ],

        // Language settings for DataTable
        language: {
            info: "Showing _START_ to _END_ of _TOTAL_ competitors",
            infoFiltered: "</br>(filtered from a total of _MAX_ participants)",
            infoEmpty: "No competitors in this category/gender",
            emptyTable:
                "No climbers registered yet – the wall's waiting for your sends!",
            zeroRecords:
                "No climbers registered yet – the wall's waiting for your sends!",
            lengthMenu: "Display _MENU_ competitors",
        },

        // Paging and length settings
        lengthChange: true,
        pageLength: rowsPerPage,
        pagingType: "simple_numbers",
        renderer: "bootstrap",
        order: [[2, "asc"]],

        // Layout configuration
        layout: {
            topStart: null,
            topEnd: null,
            bottomStart: "info",
            bottomEnd: "paging",
            bottom1: "pageLength",
        },

        // On initialization complete, wrap the table in a styled div for improved appearance
        initComplete: function () {
            let tableElement = this.api().table().node();
            let $newWrapper = $("<div>", {
                class: "bg-primary rounded rounded-3 px-0 py-1",
            });
            $(tableElement).wrap($newWrapper);
        },
    });

/**
 * -------------------------------------
 * Event Listeners for DataTable Interactions
 * -------------------------------------
 */

// Toggle display of child rows when a cell with the "details-control" class is clicked
$("#tableMale").on("click", "td.details-control", function () {
    let tr = $(this).closest("tr");
    let row = tblMale.DataTable().row(tr);
    const bgClass = tr.hasClass("odd") ? "odd" : "even";

    if (row.child.isShown()) {
        // If already open, close the child row
        row.child.hide();
        tr.removeClass("shown");
    } else {
        // Open the child row with detailed data
        row.child(sends(row.data()), bgClass).show();
        tr.addClass("shown");
    }
});

/**
 * -------------------------------------
 * DataTable Helper Functions
 * -------------------------------------
 */

/**
 * Refreshes the data in the DataTable.
 */
function refreshData() {
    tblMale.DataTable().ajax.reload();
}

/**
 * Filters the DataTable by gender.
 * @param {string|null} gender - The gender filter value. If null, clears the filter.
 */
function changeGender(gender) {
    if (gender) {
        tblMale.DataTable().columns(0).search(`\\b${gender}\\b`, true).draw();
    } else {
        tblMale.DataTable().columns(0).search("").draw();
    }
    urlWithCurrentFilter();
}

/**
 * Filters the DataTable by category based on the selected value.
 * @param {HTMLElement} e - The event element containing the filter value.
 */
function filterCategory(e) {
    const table = tblMale.DataTable();
    switch (e.value) {
        case "tr":
            table.columns(1).search(`\\b(novice|youth)\\b`, true).draw();
            break;
        case "lead":
            table
                .columns(1)
                .search(`\\b(advanced|intermediate|open)\\b`, true)
                .draw();
            break;
        default:
            table
                .columns(1)
                .search(`\\b${categories[e.value]}\\b`, true)
                .draw();
    }
    urlWithCurrentFilter();
}

// Function to update the active filter heading
function updateActiveFilterDisplay() {
    let table = $("#tableMale").DataTable();
    let gender = table.column(0).search().trim();
    let category = table.column(1).search().trim();
    let displayText = "";

    const leadCategories = ["advanced", "intermediate", "open"];
    const topRopeCategories = ["novice", "youth"];

    if (category) {
        let filteredCategories = category
            .replace(/\\b/g, "")
            .replace(/[()]/g, "")
            .split("|");
        if (filteredCategories.length > 1) {
            if (
                leadCategories.every((cat) => filteredCategories.includes(cat))
            ) {
                displayText = "All lead categories";
            } else if (
                topRopeCategories.every((cat) =>
                    filteredCategories.includes(cat)
                )
            ) {
                displayText = "All top rope categories";
            }
        } else {
            displayText =
                filteredCategories[0].charAt(0).toUpperCase() +
                filteredCategories[0].slice(1);
        }
    }

    if (gender) {
        gender = gender.replace(/\\b/g, "");
        gender = gender.charAt(0).toUpperCase() + gender.slice(1);
        displayText += displayText ? ` - ${gender}` : gender;
    }

    if (!displayText) { 
        displayText = "Leaderboard";
    }

    document.getElementById("activeFilter").textContent = displayText;
}

/**
 * -------------------------------------
 * Helper Functions for Rendering Detailed Data
 * -------------------------------------
 */

/**
 * Constructs the HTML for detailed row data.
 * @param {Object} row - The data object for the row.
 * @returns {string} - The HTML string for the child row.
 */
function sends(row) {
    const routes = ["a", "b", "c", "d"];
    let ticks = "";

    // Iterate through rounds 1 to 4
    for (let i = 1; i < 5; i++) {
        ticks += `<div class="col text-round${i}">`;
        // Iterate through each route
        for (const element of routes) {
            ticks += tickIcon(
                row["r" + i + "_" + element],
                row["r" + i + "_" + element + "_bonus"]
            );
        }
        ticks += "</div>";
    }

    // Build and return the complete HTML layout
    return `
    <div class="row row-cols-4 text-center g-0">
      <div class="col">R1</div>
      <div class="col">R2</div>
      <div class="col">R3</div>
      <div class="col">R4</div>
    </div>
    <div class="row row-cols-4 text-center g-0">${ticks}</div>
  `;
}

/**
 * Returns the appropriate SVG icon based on tick and bonus values.
 * @param {number} [tick=0] - The tick value.
 * @param {number} [bonus=0] - The bonus value.
 * @returns {string} - The SVG icon as a string.
 */
function tickIcon(tick = 0, bonus = 0) {
    // Determine the combined score
    const score = tick + bonus;
    switch (score) {
        case 20:
            // First zone
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-file" viewBox="0 0 16 16">
          <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
          <rect style="stroke:none" id="rect1119" width="10.508" height="4.2642632"
                x="2.8761711" y="10.7501478" />
        </svg>`;
        case 25:
            // First zone with a bonus
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-file" viewBox="0 0 16 16">
          <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
          <rect style="stroke:none" id="rect1119" width="10.508" height="4.2642632"
                x="2.8761711" y="10.7501478" />
          <path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z" />
        </svg>`;
        case 30:
            // Second zone
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-file" viewBox="0 0 16 16">
          <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
          <rect style="stroke: none;" id="rect1119" width="10.508" height="9.106"
                x="2.876" y="5.908"/>
        </svg>`;
        case 35:
            // Second zone with a bonus
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-file" viewBox="0 0 16 16">
          <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
          <rect style="stroke: none;" id="rect1119" width="10.508" height="9.106"
                x="2.876" y="5.908"/>
          <path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z" />
        </svg>`;
        case 50:
            // Top score icon
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-file-fill" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
        </svg>`;
        case 60:
            if (tick === 50) {
                // Top score with bonus
                return `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
               class="bi bi-file-fill" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
            <path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z" />
          </svg>`;
            } else {
                // Flash icon
                return `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
               class="bi bi-lightning-fill" viewBox="0 0 16 16">
            <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
          </svg>`;
            }
        case 70:
            // Flash icon with bonus
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-lightning-fill" viewBox="0 0 16 16">
          <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
          <path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z" />
        </svg>`;
        default:
            // Default icon when no score matches
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-file" viewBox="0 0 16 16">
          <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
        </svg>`;
    }
}

/**
 * -------------------------------------
 * URL Filter Functions
 * -------------------------------------
 */

/**
 * Generates a URL with the current DataTable filters applied and updates the browser history.
 * @returns {string} The new URL with filter parameters.
 */
function urlWithCurrentFilter() {
    let table = $("#tableMale").DataTable();
    let genderSearch = table.column(0).search().trim();
    let categorySearch = table.column(1).search().trim();

    let params = new URLSearchParams();

    if (genderSearch) {
        params.set("gender", encodeURIComponent(genderSearch));
    }
    if (categorySearch) {
        params.set("category", encodeURIComponent(categorySearch));
    }

    let newUrl =
        window.location.origin +
        window.location.pathname +
        "?" +
        params.toString();
    window.history.replaceState({}, "", newUrl);

    updateActiveFilterDisplay();

    return newUrl;
}

/**
 * Reads URL parameters on page load and applies filters to the DataTable.
 */
function loadFiltersFromURL() {
    let params = new URLSearchParams(window.location.search);
    let gender = params.get("gender")
        ? decodeURIComponent(params.get("gender"))
        : null;
    let category = params.get("category")
        ? decodeURIComponent(params.get("category"))
        : null;

    try {
        if (gender) {
            gender = decodeURIComponent(gender);
        }
        if (category) {
            category = decodeURIComponent(category);
        }
    } catch (e) {
        console.error("Error decoding parameters:", e);
    }

    let table = $("#tableMale").DataTable();

    if (gender) {
        table.column(0).search(gender, true, false).draw();
    }
    if (category) {
        table.column(1).search(category, true, false).draw();
    }

    updateActiveFilterDisplay();
}

/**
 * -------------------------------------
 * Social Media Sharing Functionality
 * -------------------------------------
 */

/**
 * Opens a Facebook share window using the current URL with applied filters.
 * Also updates the Open Graph meta tag for 'og:url' dynamically.
 */
function shareOnFacebook() {
    let url = urlWithCurrentFilter();

    // Update Open Graph meta tag with the new URL
    document
        .querySelector('meta[property="og:url"]')
        .setAttribute("content", url);

    let facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
    )}`;
    window.open(facebookShareUrl, "_blank");
}

// Latest Tick Functions

function fetchLatestTicks() {
    $.ajax({
        url: ticksUrl,
        method: "GET",
        dataType: "json",
        success: function (response) {
            if (response.data) {
                displayLatestTicks(response.data);
            }
        },
        error: function () {
            console.error("Failed to fetch tick data.");
        },
    });
}

function displayLatestTicks(data) {
    const groupedData = {};

    data.forEach(({ date, name, route, tick, bonus, category, gender }) => {
        const normalizedDate = luxon.DateTime.fromISO(date).toISODate();
        const key = `${normalizedDate}-${name}`;

        if (!groupedData[key]) {
            groupedData[key] = {
                date: normalizedDate,
                name,
                category,
                gender,
                ticks: [],
            };
        }

        const score = tick + bonus;
        groupedData[key].ticks.push({
            route: route.toUpperCase(),
            score,
            tick,
            bonus,
        });
    });

    const latestTicks = Object.values(groupedData)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    const container = document.getElementById("latest-ticks");
    container.innerHTML = "";

    latestTicks.forEach(({ date, name, category, gender, ticks }) => {
        const item = document.createElement("div");
        item.className = "list-group-item list-group-item-action align-items-center";

        // Category (first 3 letters)
        const categoryShort = category
            ? category.toUpperCase()
            : "";
        // alternatively to shorten the category: category.substring(0, 3).toUpperCase()

        // Gender Icon
        const genderIcon =
            gender === "Male"
                ? '<i class="bi bi-gender-male"></i>'
                : gender === "Female"
                ? '<i class="bi bi-gender-female"></i>'
                : '<i class="bi bi-gender-ambiguous"></i>';

        // Render tick icons with colours based on round number
        const tickIcons = ticks
            .map(({ route, tick, bonus }) => {
                const roundNumber = parseInt(route.charAt(0)); // Extract round number from route
                const routeLetter = route.charAt(2); // Extract route letter (e.g., 'D' from '1_D')

                return `
                <span class="text-round${roundNumber}">
                    R${roundNumber}${routeLetter}${tickIcon(tick, bonus)}
                </span>
            `;
            })
            .join(" - ");

        item.innerHTML = `
                <strong>${name}</strong> 
                <small >${categoryShort} - ${genderIcon}</small></br>
                <strong>${tickIcons}<strong>
        `;
        // to add date: ${luxon.DateTime.fromISO(date).toFormat("dd MMM yy")}

        container.appendChild(item);
    });
}

// Trigger the fetch latest ticks on page load
$(document).ready(function () {
    fetchLatestTicks();
});
