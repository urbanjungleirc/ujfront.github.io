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

/**
 * -------------------------------------
 * Countdown Timer Functionality
 * -------------------------------------
 */

/**
 * Updates the countdown timer display.
 * Uses the countdown library to calculate the remaining days, hours, and minutes
 * until competitionEndTime.
 */
function updateCountdown() {
    const now = new Date();

    // Calculate remaining time using specific units (days, hours, minutes)
    const timeLeft = countdown(
        now,
        competitionEndTime,
        countdown.DAYS | countdown.HOURS | countdown.MINUTES
    );

    // If the countdown has reached zero, display a message and clear the timer.
    if (timeLeft.value <= 0) {
        document.querySelector("#timer").innerHTML = "Competition Ended!";
        clearInterval(timerInterval);
        return;
    }

    // Update the countdown display with the remaining time.
    document.querySelector("[data-days]").innerText = timeLeft.days;
    document.querySelector("[data-hours]").innerText = timeLeft.hours;
    document.querySelector("[data-minutes]").innerText = timeLeft.minutes;
}

// Initialize the timer to update every second.
const timerInterval = setInterval(updateCountdown, 1000);
updateCountdown();

/**
 * -------------------------------------
 * DataTable Setup and Configuration
 * -------------------------------------
 */

$(document).ready(function () {
    // Initialize the DataTable when the DOM is ready.
    $("#tableMale")
        // Show the spinner when an Ajax request starts.
        .on("preXhr.dt", function (e, settings, json, xhr) {
            mySpinner.show();
        })
        // Hide the spinner and update the "Last Updated" time when the Ajax request completes.
        .on("xhr.dt", function (e, settings, json, xhr) {
            let updatedAtEl = document.getElementById("updatedAt");
            // Use Luxon to get the current date/time in en-AU locale.
            let now = luxon.DateTime.local().setLocale("en-AU");
            updatedAtEl.innerText = now.toFormat("d MMM yy, HH:mm");
            mySpinner.hide();
        })
        .dataTable({
            ajax: {
                url: ticksUrl,
                cache: true,
                data: function (d) {
                    d.format = "json";
                },
                dataSrc: "data",
            },

            // Define DataTable columns.
            columns: [
                {
                    data: "name",
                    title: "Name",
                    orderable: true,
                    render: function (data) {
                        // Render the name as a clickable link.
                        return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch(this);">${data}</a>`;
                    },
                },
                {
                    data: "route",
                    title: "Route",
                    orderable: true,
                    render: function (data) {
                        // Split the route data and render as a clickable link.
                        const nameParts = data.split("_");
                        return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch(this);">r${nameParts[0]} ${nameParts[1]}</a>`;
                    },
                    className: "dt-body-center",
                },
                {
                    data: "tick",
                    title: '<i class="bi bi-check-circle"></i>',
                    orderable: true,
                    render: function (data, type, row) {
                        if (type === "display") {
                            // Determine the round from the route value.
                            const roundID = row.route.charAt(0);
                            return `<a href="#" class="text-decoration-none text-center text-round${roundID} g-0" onclick="clickSearch('${data}');">${tickIcon(
                                data
                            )}</a>`;
                        }
                        return data;
                    },
                    className: "dt-body-center",
                },
                {
                    data: "bonus",
                    title: '<i class="bi bi-plus-circle"></i>',
                    orderable: true,
                    render: function (data) {
                        // Render bonus data as a clickable link.
                        return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch('${data}');">${data}</a>`;
                    },
                    className: "dt-body-center",
                },
                {
                    data: "gender",
                    visible: true,
                    title: '<i class="bi bi-gender-ambiguous"></i>',
                    render: function (data, type, row) {
                        if (type === "display") {
                            // Determine the appropriate gender icon.
                            const icon =
                                data === "Male"
                                    ? '<i class="bi bi-gender-male"></i>'
                                    : '<i class="bi bi-gender-female"></i>';
                            return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch('${data}');">${icon}</a>`;
                        }
                        return data;
                    },
                    className: "dt-body-center",
                },
                {
                    data: "category",
                    visible: true,
                    title: "Category",
                    render: function (data, type, row) {
                        if (type === "display") {
                            // Replace "top rope" with "TR" if applicable.
                            if (data.includes("top rope")) {
                                return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch('${data}');">${data.replace(
                                    /top rope/g,
                                    "TR"
                                )}</a>`;
                            } else {
                                return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch('${data}');">${data}</a>`;
                            }
                        }
                        return data;
                    },
                },
                {
                    data: "date",
                    visible: true,
                    title: "Date",
                    render: function (data, type, row) {
                        // Use modifyTime() to format the date and time.
                        return modifyTime(data, type);
                    },
                },
            ],

            // Set the default order for the DataTable.
            order: [[6, "desc"]],

            // Language settings for DataTable.
            language: {
                info: "Showing _START_ to _END_ of _TOTAL_ ticks and sends",
                infoFiltered: "</br>(filtered from a total of _MAX_ ticks and sends)",
                infoEmpty: "No ticks or sends found",
                lengthMenu: "Display _MENU_ ticks",
                emptyTable: "No ticks or sends yet – the wall's waiting for yours!",
                zeroRecords: "No ticks or sends yet – the wall's waiting for yours!",    
            },

            // Define table buttons.
            buttons: [
                {
                    text: '<i class="bi bi-arrow-clockwise"></i> Reload',
                    action: function (e, dt, node, config) {
                        refreshData();
                    },
                    className: "btn-primary",
                },
            ],

            // Paging setup.
            lengthChange: true,
            pageLength: rowsPerPage,
            pagingType: "simple_numbers",
            renderer: "bootstrap",

            // Layout configuration.
            layout: {
                topStart: "buttons",
                topEnd: "search",
                bottomStart: "info",
                bottomEnd: "paging",
                bottom1: "pageLength",
            },

            // On initialization complete, wrap the table in a styled div.
            initComplete: function () {
                let tableElement = this.api().table().node();
                let $newWrapper = $("<div>", {
                    class: "bg-primary rounded rounded-3 px-0 py-1",
                });
                $(tableElement).wrap($newWrapper);
            },
        });
});

// Store reference to the DataTable for later use.
let tblMale = $("#tableMale");

/**
 * -------------------------------------
 * DataTable Refresh and Search Functions
 * -------------------------------------
 */

/**
 * Reloads the DataTable via Ajax.
 */
function refreshData() {
    tblMale.DataTable().ajax.reload();
}

/**
 * Sets the default class for DataTable buttons.
 * (Reference: https://datatables.net/forums/discussion/comment/149769/#Comment_149769)
 */
$.fn.dataTable.Buttons.defaults.dom.button.className = "btn";

/**
 * Performs a search on the DataTable based on the clicked element or value.
 * @param {Element|string} e - The clicked element or search value.
 */
function clickSearch(e) {
    // If the parameter is an HTML element.
    if (e instanceof Element) {
        // Default behavior: search for the element's inner text.
        tblMale.DataTable().search(`"${e.innerText}"`, false).draw();
    } else {
        // If a string is passed, use regex search.
        tblMale.DataTable().search(`\\b${e}\\b`, true).draw();
    }
}

/**
 * -------------------------------------
 * Date & Time Formatting Function
 * -------------------------------------
 */

/**
 * Formats a date string using Luxon.
 * @param {string} data - The ISO 8601 date string.
 * @param {string} type - The render type (e.g., "sort" or "display").
 * @returns {string|number} - A formatted date string for display or a numeric value for sorting.
 */
function modifyTime(data, type) {
    try {
        // Parse the date string using Luxon and set the zone to Australia/Perth.
        const date = luxon.DateTime.fromISO(data)
            .setZone("Australia/Perth")
            .setLocale("en-AU");

        // Check for invalid date.
        if (!date.isValid) {
            console.error("Invalid date:", data);
            return "Invalid Date";
        }

        // Determine how many days differ from today.
        const now = luxon.DateTime.local();
        let dateString;
        const diffDays = now
            .startOf("day")
            .diff(date.startOf("day"), "days")
            .as("days");

        if (diffDays === 0) {
            dateString = "today @ " + date.toFormat("HH:mm");
        } else if (diffDays === 1) {
            dateString = "yest. @ " + date.toFormat("HH:mm");
        } else {
            dateString = date.toFormat("dd MMM',' HH:mm");
        }

        // If sorting, return the date value as milliseconds.
        if (type === "sort") {
            return date.valueOf();
        }

        // Return the formatted date string.
        return dateString;
    } catch (error) {
        console.error("Error parsing date:", data, error);
        return "Error";
    }
}

/**
 * -------------------------------------
 * Helper Functions for Detailed Row Rendering
 * -------------------------------------
 */

/**
 * Constructs the HTML for detailed tick data.
 * @param {Object} row - The data object for the row.
 * @returns {string} - The HTML string for the detailed row.
 */
function sends(row) {
    const routes = ["a", "b", "c", "d"];
    let ticks = "";

    // Loop through rounds 1 to 4.
    for (let i = 1; i < 5; i++) {
        ticks += `<div class="col text-round${i}">`;
        for (const element of routes) {
            ticks += tickIcon(
                row["r" + i + "_" + element],
                row["r" + i + "_" + element + "_bonus"]
            );
        }
        ticks += "</div>";
    }

    // Return the combined HTML structure.
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
 * Returns an SVG icon based on tick and bonus values.
 * @param {number} [tick=0] - The tick value.
 * @param {number} [bonus=0] - The bonus value.
 * @returns {string} - The SVG icon as an HTML string.
 */
function tickIcon(tick = 0, bonus = 0) {
    const score = tick + bonus;
    switch (score) {
        case 20:
        case 25:
            // Icon for score 20 or 25.
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-file" viewBox="0 0 16 16">
          <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
          <rect style="stroke:none"
                id="rect1119"
                width="10.508"
                height="4.2642632"
                x="2.8761711"
                y="10.7501478" />
        </svg>`;
        case 30:
        case 35:
            // Icon for score 30 or 35.
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-file" viewBox="0 0 16 16">
          <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
          <rect style="stroke: none;" id="rect1119"
                width="10.508"
                height="9.106"
                x="2.876"
                y="5.908"/>
        </svg>`;
        case 50:
            // Icon for top score (50).
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-file-fill" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
        </svg>`;
        case 60:
            if (tick === 50) {
                // Icon for a top score (50) with bonus.
                return `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
               class="bi bi-file-fill" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
          </svg>`;
            } else {
                // Icon for a flash (score 60 without tick 50).
                return `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
               class="bi bi-lightning-fill" viewBox="0 0 16 16">
            <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
          </svg>`;
            }
        case 70:
            // Icon for flash with bonus.
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-lightning-fill" viewBox="0 0 16 16">
          <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
        </svg>`;
        default:
            // Default icon when no conditions match.
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor"
             class="bi bi-file" viewBox="0 0 16 16">
          <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
        </svg>`;
    }
}
