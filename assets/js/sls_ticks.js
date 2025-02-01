/*  -------------------------------------
    Default setting
    -------------------------------------
*/
const scoreUrl =
    "https://script.google.com/macros/s/AKfycbyQtX-xInuAc6JwZ-a370PAifWNGD9z4eyRKZj2oTC-5mUOfSmmBYllC5F_wcSMezcZIA/exec"; // public copy data
const ticksUrl =
    "https://script.google.com/macros/s/AKfycbyQtX-xInuAc6JwZ-a370PAifWNGD9z4eyRKZj2oTC-5mUOfSmmBYllC5F_wcSMezcZIA/exec?ticks"; // public copy data
const rowsPerPage = 10;
const categories = ["open", "advanced", "intermediate", "novice", "youth"];
const competitionEndTime = new Date("2025-04-02T19:00:00+08:00");

// setting up loading graphics
let mySpinner = new bootstrap.Modal(document.getElementById("modalSpinner"), {
    keyboard: false,
});

//* set default timers
function updateCountdown() {
    const now = new Date();

    // Use countdown library with specific units
    const timeLeft = countdown(
        now,
        competitionEndTime,
        countdown.DAYS | countdown.HOURS | countdown.MINUTES
    );

    if (timeLeft.value <= 0) {
        document.querySelector("#timer").innerHTML = "Competition Ended!";
        clearInterval(timerInterval);
        return;
    }

    // Display values
    document.querySelector("[data-days]").innerText = timeLeft.days;
    document.querySelector("[data-hours]").innerText = timeLeft.hours;
    document.querySelector("[data-minutes]").innerText = timeLeft.minutes;
}

const timerInterval = setInterval(updateCountdown, 1000);
updateCountdown();

/**
 * dataTable setup
 */

$(document).ready(function () {
    // $.fn.dataTable.moment( 'hh:mm DD/MM/YYYY' );

    $("#tableMale")
        .on("preXhr.dt", function (e, settings, json, xhr) {
            // fired when an Ajax request is completed
            mySpinner.show();
        })
        .on("xhr.dt", function (e, settings, json, xhr) {
            // fired when an Ajax request is completed
            let el = document.getElementById("updatedAt");
            let now = luxon.DateTime.local().setLocale("en-AU");
            el.innerText = now.toFormat("d MMM yy, HH:mm");
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

            columns: [
                {
                    data: "name",
                    title: "Name",
                    orderable: true,
                    render: function (data) {
                        return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch(this);">${data}</a>`;
                    },
                },
                {
                    data: "route",
                    title: "Route",
                    orderable: true,
                    render: function (data) {
                        var nameParts = data.split("_");
                        //return `R${nameParts[0]} ${nameParts[1]}`;
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
                            const roundID = row.route.charAt(0);
                            //return `<div class="text-center text-round${roundID} g-0">${tickIcon(data)}</div>`;
                            return `<a href="#" class="text-decoration-none text-center text-round${roundID} g-0" onclick="clickSearch('${data}');">${tickIcon(
                                data
                            )}</a>`;
                        }
                        // else
                        return data;
                    },
                    className: "dt-body-center",
                },
                {
                    data: "bonus",
                    title: '<i class="bi bi-plus-circle"></i>',
                    orderable: true,
                    render: function (data) {
                        return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch('${data}');">${data}</a>`;
                    },
                    className: "dt-body-center",
                },
                {
                    data: "gender",
                    visible: true,
                    title: '<i class="bi bi-gender-ambiguous">',
                    render: function (data, type, row) {
                        if (type === "display") {
                            const icon =
                                data == "Male"
                                    ? '<i class="bi bi-gender-male">'
                                    : '<i class="bi bi-gender-female">';
                            return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch('${data}');">${icon}</a>`;
                        }
                        // else
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
                            if (data.includes("top rope")) {
                                return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch('${data}');">${data.replace(
                                    /top rope/g,
                                    "TR"
                                )}</a>`;
                            } else {
                                return `<a href="#" class="link-dark text-decoration-none" onclick="clickSearch('${data}');">${data}</a>`;
                            }
                        }
                        // else
                        return data;
                    },
                },
                {
                    data: "date",
                    visible: true,
                    title: "Date",
                    render: function (data, type, row) {
                        return modifyTime(data, type);
                    },
                },
            ],

            order: [[6, "desc"]],

            language: {
                info: "Showing _START_ to _END_ of _TOTAL_ ticks",
                infoFiltered: "</br>(filtered from a total of _MAX_ ticks)",
                infoEmpty: "No ticks found",
                lengthMenu: "Display _MENU_ ticks",
            },

            buttons: [
                {
                    text: '<i class="bi bi-arrow-clockwise"></i> Reload',
                    action: function (e, dt, node, config) {
                        refreshData();
                    },
                    className: "btn-primary",
                },
            ],

            //* paging setup
            lengthChange: true,
            pageLength: rowsPerPage,
            pagingType: "simple_numbers",
            renderer: "bootstrap",

            layout: {
                topStart: "buttons",
                topEnd: "search",
                bottomStart: "info",
                bottomEnd: "paging",
                bottom1: "pageLength",
            },
            initComplete: function () {
                // wrapping the table with a new div to improve the appearance (adding styles)
                let tableElement = this.api().table().node(); // Get the main table element
                let $newWrapper = $("<div>", {
                    class: "bg-primary rounded rounded-3 px-0 py-1",
                });
                $(tableElement).wrap($newWrapper);
            },
        });
});

let tblMale = $("#tableMale");

function refreshData() {
    tblMale.DataTable().ajax.reload();
}

/* default class for buttons 
   https://datatables.net/forums/discussion/comment/149769/#Comment_149769
*/
$.fn.dataTable.Buttons.defaults.dom.button.className = "btn";

//* helper functions/objects

function clickSearch(e) {
    if (e instanceof Element) {
        switch (e.value) {
            default:
                tblMale.DataTable().search(`"${e.innerText}"`, false).draw();
        }
    } else {
        console.log("looking for " & e);
        tblMale.DataTable().search(`\\b${e}\\b`, true).draw();
    }
}

// format date&time
function modifyTime(data, type) {
    try {
        // Parse the input date string using Luxon for ISO 8601 format
        var date = luxon.DateTime.fromISO(data)
            .setZone("Australia/Perth")
            .setLocale("en-AU");

        // Additional checks
        if (!date.isValid) {
            console.error("Invalid date:", data);
            return "Invalid Date";
        }

        // Format the date and time in the user's local time zone using Luxon
        var now = luxon.DateTime.local();
        var dateString;
        var diffDays = now
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

        if (type === "sort") {
            // If sorting, return the date as a number (number of milliseconds since epoch)
            return date.valueOf();
        }

        // Otherwise, return the formatted date string
        return dateString;
    } catch (error) {
        console.error("Error parsing date:", data, error);
        return "Error";
    }
}

function sends(row) {
    const routes = ["a", "b", "c", "d"];
    let ticks = "";

    for (i = 1; i < 5; i++) {
        ticks = `${ticks}<div class="col text-round${i}" >`;
        for (const element of routes) {
            ticks =
                ticks +
                tickIcon(
                    row["r" + i + "_" + element],
                    row["r" + i + "_" + element + "_bonus"]
                ); // row.r1_a + row.r1_a_bonus
        }
        ticks = ticks + "</div>";
    }

    return ` <div class="row row-cols-4 text-center g-0">
                <div class="col">R1</div>
                <div class="col">R2</div>
                <div class="col">R3</div>
                <div class="col">R4</div>
            </div>
            <div class="row row-cols-4 text-center g-0">${ticks}</div>`;
}

function tickIcon(tick = 0, bonus = 0) {
    switch (tick + bonus) {
        case 20:
        case 25:
            //return `<i class="bi bi-file-break"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
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
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke: none;" id="rect1119" 
                            width="10.508" 
                            height="9.106" 
                            x="2.876" 
                            y="5.908"/>
                    </svg>`;
        case 50:
            //return `<i class="bi bi-file-fill"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                    </svg>`;
        case 60:
            if (tick == 50) {
                // tick with bonus
                // return `<i class="bi bi-file-fill"></i>`;
                return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                        </svg>`;
            } else {
                // flash without bonus
                // return `<i class="bi bi-lightning-fill"></i>`;
                return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                            <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
                        </svg>`;
            }
        case 70:
            // return `<i class="bi bi-lightning-fill"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                        <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
                    </svg>`;
        default:
            //return `<i class="bi bi-file"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                    </svg>`;
    }
}


