/*  -------------------------------------
    Default setting
    -------------------------------------
*/
const scoreUrl =
    "https://script.google.com/macros/s/AKfycbyQtX-xInuAc6JwZ-a370PAifWNGD9z4eyRKZj2oTC-5mUOfSmmBYllC5F_wcSMezcZIA/exec"; // public copy data in JSON format
const minPageDisplay = 10000; // minimum time for a page to be displayed
const maxPageDisplay = 15000; // maximum time for a page to be displayed
let dataRefreshInterval = 2 * 60000; // frequency for full data refresh
//let categoryTimeInterval = 60000;           // time for one category to be desplayed
let firstPageCallDone = false;

const rowsPerPage = 7; // number of rows per page
let currentCategoryIndex = 0; // filtering data - enter category
const categories = ["open", "advanced", "intermediate", "novice", "youth"];
const competitionEndTime = new Date("2025-04-02T19:00:00+08:00");

// setting up Modal element
let mySpinner = new bootstrap.Modal(document.getElementById("modalSpinner"), {
    keyboard: false,
});

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
    // document.querySelector("[data-hours]").innerText = timeLeft.hours;
    // document.querySelector("[data-minutes]").innerText = timeLeft.minutes;
}

const timerInterval = setInterval(updateCountdown, 1000);
updateCountdown();

/**
 * dataTable setup
 */
let tblMale = $("#tableMale");
let tblFemale = $("#tableFemale");
let pageTimer = new Timer(pageFlipper, 600000);

$("#tableMale")
    .on("preXhr.dt", function (e, settings, json, xhr) {
        // fired when an Ajax request is completed
        mySpinner.show();
    })
    .on("page.dt", function () {
        tblMale.fadeOut("fast");
        tblMale.fadeIn("fast");
    })
    .dataTable({
        ajax: {
            url: scoreUrl,
            cache: true,
            dataSrc: "data",
            data: function (d) {
                d.format = "json";
            },
        },

        columns: [
            { data: "gender", visible: false, title: "Gender" },
            { data: "category", visible: false, title: "Category" },
            {
                data: "rank",
                class: "dt-center",
                render: function (data, type) {
                    if (type === "display") {
                        switch (data) {
                            case 1:
                            case 2:
                            case 3:
                                return `<span class="text-secondary bg-transparent fw-bold">${data}</span>`;
                                break;
                            case 4:
                            case 5:
                            case 6:
                                return `<span class="text-secondary bg-transparent">${data}</span>`;
                                break;
                            default:
                                return `<span class="text-primary bg-transparent">${data}</span>`;
                        }
                    }
                    return data;
                },
                orderable: false,
                class: "align-middle",
            },
            {
                data: "name",
                title: "Name",
                orderable: false,
                class: "align-middle name-cell",
                render: function (data, type) {
                    if (type === "display") {
                        return shortName(data);
                    }
                    return data;
                },
            },
            {
                data: "score",
                title: "Score",
                orderable: false,
                class: "dt-right align-middle",
            },
            {
                data: null,
                class: "dt-right py-1",
                render: function (row, type) {
                    if (type === "display") {
                        return sends(row);
                    }
                    return;
                },
                orderable: false,
                title: "",
                defaultContent: "",
            },
        ],

        //* paging setup
        lengthChange: false,
        pageLength: rowsPerPage,
        pagingType: "numbers",
        renderer: "bootstrap",

        searchCols: [
            { search: `\\bmale\\b`, regex: true },
            {
                search: `\^\\b${categories[currentCategoryIndex]}\$\\b`,
                regex: true,
            },
            null,
            null,
            null,
            null,
        ],

        language: {
            info: '<div class="d-flex justify-content-between mt-0 mb-2 me-1 fs-4 bg-white text-primary pt-0 px-1"><div>Competitors: <strong>_TOTAL_</strong></div><div>page <strong>_PAGE_</strong> of _PAGES_</div></div>',
            infoFiltered: "",
            infoEmpty: "",
            emptyTable:
                "No climbers registered yet – the wall's waiting for your sends!",
            zeroRecords:
                "No climbers registered yet – the wall's waiting for your sends!",
            lengthMenu: "Display _MENU_ competitors",
        },

        order: [[2, "asc"]],
        dom: "irt",
    });

// Female table setup
$("#tableFemale")
    .one("init.dt", function () {
        //  fired when DataTables has been fully initialised and data loaded
        startPageRotations();
    })
    .on("xhr.dt", function (e, settings, json, xhr) {
        // fired when an Ajax request is completed
        // updates time and Restart Page Roatation
        let el = document.getElementById("updatedAt");
        moment.locale("au");
        el.innerText = " @ " + moment().format("LT");
        if (firstPageCallDone) {
            startPageRotations();
        }
    })
    .on("page.dt", function () {
        tblFemale.fadeOut("fast");
        tblFemale.fadeIn("fast");
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

        columns: [
            { data: "gender", visible: false, title: "Gender" },
            { data: "category", visible: false, title: "Category" },
            {
                data: "rank",
                class: "dt-center",
                render: function (data, type) {
                    if (type === "display") {
                        switch (data) {
                            case 1:
                            case 2:
                            case 3:
                                return `<span class="text-secondary bg-transparent fw-bold">${data}</span>`;
                                break;
                            case 4:
                            case 5:
                            case 6:
                                return `<span class="text-secondary bg-transparent">${data}</span>`;
                                break;
                            default:
                                return `<span class="text-primary bg-transparent">${data}</span>`;
                        }
                    }
                    return data;
                },
                orderable: false,
                class: "align-middle",
            },
            {
                data: "name",
                title: "Name",
                orderable: false,
                class: "align-middle name-cell",
                render: function (data, type) {
                    if (type === "display") {
                        return shortName(data);
                    }
                    return data;
                },
            },
            {
                data: "score",
                title: "Score",
                orderable: false,
                class: "dt-right align-middle",
            },
            {
                data: null,
                class: "dt-right py-1",
                render: function (row, type) {
                    if (type === "display") {
                        return sends(row);
                    }
                    return;
                },
                orderable: false,
                title: "",
                defaultContent: "",
            },
        ],
        // columnDefs: [{ width: 200, targets: 3 }],

        searchCols: [
            { search: `\\bfemale\\b`, regex: true },
            {
                search: `\^\\b${categories[currentCategoryIndex]}\$\\b`,
                regex: true,
            },
            null,
            null,
            null,
            null,
        ],

        //* paging setup
        lengthChange: false,
        pageLength: rowsPerPage,
        pagingType: "numbers",
        renderer: "bootstrap",

        language: {
            info: '<div class="d-flex justify-content-between mt-0 mb-2 me-1 fs-4 bg-white text-primary pt-0 px-1"><div>Competitors: <strong>_TOTAL_</strong></div><div>page <strong>_PAGE_</strong> of _PAGES_</div></div>',
            infoFiltered: "",
            infoEmpty: "",
            lengthMenu: "Display _MENU_ competitors",
            emptyTable:
                "No climbers registered yet – the wall's waiting for your sends!",
            zeroRecords:
                "No climbers registered yet – the wall's waiting for your sends!",
        },

        order: [[2, "asc"]],
        dom: "irt",
    });

function startPageRotations() {
    // calculate time intervals for the page rotating and updates
    firstPageCallDone = true;
    let timePerPage = maxPageDisplay;
    // set the time interval based on gender with more competitors
    let numberOfPages = tblMale.DataTable().page.info().pages;
    if (numberOfPages < tblFemale.DataTable().page.info().pages) {
        numberOfPages = tblFemale.DataTable().page.info().pages;
    }

    if (numberOfPages > 1) {
        // more than one page
        timePerPage = dataRefreshInterval / numberOfPages;
        if (timePerPage < minPageDisplay) {
            dataRefreshInterval = minPageDisplay * numberOfPages;
            timePerPage = minPageDisplay;
        } else if (timePerPage > maxPageDisplay) {
            timePerPage = maxPageDisplay;
        } else {
            timePerPage = timePerPage.toFixed();
        }
        // console.log ("startPageRotation - x pages, timePerPage: " + timePerPage)
    } else {
        // console.log ("startPageRotation - ONE page, timePerPage: " + timePerPage)
    }

    document.querySelector("#activeCategory").innerText =
        categories[currentCategoryIndex].toLocaleUpperCase();
    mySpinner.hide();
    pageTimer.reset(timePerPage);
}

function pageFlipper() {
    let maleDT = tblMale.DataTable();
    let femaleDT = tblFemale.DataTable();

    if (categories[currentCategoryIndex] === "advanced") {
        let totalPages = maleDT.page.info().pages; // Both tables share the same data
        let currentMalePage = maleDT.page.info().page;

        // Only change category once we've flipped through all pages
        if (currentMalePage >= totalPages - 2) {
            changeCategory();
            maleDT.ajax.reload();
            femaleDT.ajax.reload();
        } else {
            // Corrected logic for flipping pages in pairs
            let newMalePage = Math.min(currentMalePage + 2, totalPages - 1);
            let newFemalePage = Math.min(currentMalePage + 3, totalPages - 1);

            maleDT.page(newMalePage).draw("page");
            femaleDT.page(newFemalePage).draw("page");

        }
    } else {
        // Default behavior for other categories
        let masterTbl, secondaryTbl;
        let malePages = maleDT.page.info().pages;
        let femalePages = femaleDT.page.info().pages;

        // Set master table as the one with more pages
        if (malePages > femalePages) {
            masterTbl = maleDT;
            secondaryTbl = femaleDT;
        } else {
            masterTbl = femaleDT;
            secondaryTbl = maleDT;
        }

        let currentMasterPage = masterTbl.page.info().page;
        let totalMasterPages = masterTbl.page.info().pages;
        let currentSecondaryPage = secondaryTbl.page.info().page;
        let totalSecondaryPages = secondaryTbl.page.info().pages;

        if (currentMasterPage < totalMasterPages - 1) {
            // Move to the next page
            masterTbl.page("next").draw("page");

            if (currentSecondaryPage < totalSecondaryPages - 1) {
                secondaryTbl.page("next").draw("page");
            } else {
                secondaryTbl.page("first").draw("page"); // Reset secondary table when it reaches the last page
            }
        } else {
            // If Master Table reaches the last page, reset and switch category
            // and Ensure both start at the first page
            masterTbl.page("first").draw("page");
            secondaryTbl.page("first").draw("page");

            changeCategory();
            maleDT.ajax.reload(null, false);
            femaleDT.ajax.reload(null, false);
        }
    }
}

function changeCategory() {
    // Cycle through categories
    if (currentCategoryIndex === categories.length - 1) {
        currentCategoryIndex = 0;
    } else {
        currentCategoryIndex++;
    }

    document.querySelector("#activeCategory").innerText =
        categories[currentCategoryIndex].toLocaleUpperCase();

    // Apply gender filters for both tables
    if (categories[currentCategoryIndex] === "advanced") {
        // For 'advanced', both tables use male data
        tblMale.DataTable().columns(0).search(`\\bmale\\b`, true);
        tblFemale.DataTable().columns(0).search(`\\bmale\\b`, true);
        document.querySelector("#femaleHeading").style.visibility = "hidden";
    } else {
        tblMale.DataTable().columns(0).search(`\\bmale\\b`, true);
        tblFemale.DataTable().columns(0).search(`\\bfemale\\b`, true);
        document.querySelector("#femaleHeading").style.visibility = "visible";
    }

    // Apply category filter for both tables
    tblMale
        .DataTable()
        .columns(1)
        .search(`^\\b${categories[currentCategoryIndex]}\\b$`, true);
    tblFemale
        .DataTable()
        .columns(1)
        .search(`^\\b${categories[currentCategoryIndex]}\\b$`, true);

    // For advanced, explicitly set the initial page offset:
    if (categories[currentCategoryIndex] === "advanced") {
        let maleDT = tblMale.DataTable();
        let femaleDT = tblFemale.DataTable();
        let totalPages = maleDT.page.info().pages; // should be identical for both tables

        // Set male table to first page (index 0)
        maleDT.page(0).draw("page");
        // Set female table to page 1 if it exists, otherwise page 0
        if (totalPages > 1) {
            femaleDT.page(1).draw("page");
        } else {
            femaleDT.page(0).draw("page");
        }
    }
    // console.log ('category changed to ' + categories[currentCategoryIndex].toLocaleUpperCase());
}

/* default class for buttons 
   https://datatables.net/forums/discussion/comment/149769/#Comment_149769
*/
$.fn.dataTable.Buttons.defaults.dom.button.className = "btn";

//* helper functions/objects

function shortName(fullName = "") {
    let maxLetters = 12; // Base limit
    const wideLetters = /[WMwm]/g; // Regex to match wide letters

    // Count the number of wide letters in the name
    const wideLetterCount = (fullName.match(wideLetters) || []).length;

    // Adjust maxLetters: reduce by 1 for every 2 wide letters
    maxLetters -= Math.floor(wideLetterCount / 2);

    if (fullName.length > maxLetters) {
        let name = fullName.split(" ");
        if (name.length <= 2) {
            return fullName.substring(0, maxLetters - 1) + "...";
        } else {
            let firstName = name[0];
            let middleInitials = "";
            let lastName = name[name.length - 1];
            for (let i = 1; i <= name.length - 2; i++) {
                middleInitials += name[i][0];
            }
            return (
                `${firstName} ${middleInitials} ${lastName}`.substring(
                    0,
                    maxLetters - 1
                ) + "..."
            );
        }
    } else {
        return fullName;
    }
}

// shorten competitors name
function shortNameOriginal(fullName = "") {
    const maxLetters = 12;
    if (fullName.length > maxLetters) {
        let name = fullName.split(" ");
        if (name.length <= 2) {
            return fullName.substring(0, maxLetters - 1) + "...";
        } else {
            let firstName = name[0];
            let middleInitials = "";
            let lastName = name[name.length - 1];
            for (let i = 1; i <= name.length - 2; i++) {
                middleInitials += name[i][0];
            }
            return (
                `${firstName} ${middleInitials} ${lastName}`.substring(
                    0,
                    maxLetters - 1
                ) + "..."
            );
        }
    } else {
        return fullName;
    }
}

/** a timer object that offers a reset feature
 * @param fn function to execute
 * @param t time interval for the function
 * @returns an object with events START / STOP / RESTART(newTimeInterval)
 * @description https://stackoverflow.com/questions/8126466/how-do-i-reset-the-setinterval-timer
 */
function Timer(fn, t) {
    var timerObj = setInterval(fn, t);

    this.stop = function () {
        if (timerObj) {
            clearInterval(timerObj);
            timerObj = null;
        }
        return this;
    };

    // start timer using current settings (if it's not already running)
    this.start = function () {
        if (!timerObj) {
            this.stop();
            timerObj = setInterval(fn, t);
        }
        return this;
    };

    // start with new or original interval, stop current interval
    this.reset = function (newT = t) {
        t = newT;
        return this.stop().start();
    };
}

function sends(row) {
    const routes = ["a", "b", "c", "d"];
    let ticks = "";

    for (i = 1; i < 5; i++) {
        ticks = `${ticks}<span class="p-0 m-0 text-round${i}" >`;
        for (const element of routes) {
            ticks += tickIcon(
                row["r" + i + "_" + element],
                row["r" + i + "_" + element + "_bonus"]
            );
        }
        ticks += "</span>";
        if (i == 2) {
            ticks += "</br>";
        }
    }
    return `<div class="fs-6 p-0 m-0">${ticks}</div>`;
}

function tickIcon(tick = 0, bonus = 0) {
    switch (tick + bonus) {
        case 20:
        case 25:
            //return `<i class="bi bi-file-break"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
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
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke: none;" id="rect1119" 
                            width="10.508" 
                            height="9.106" 
                            x="2.876" 
                            y="5.908"/>
                    </svg>`;
        case 50:
            //return `<i class="bi bi-file-fill"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                    </svg>`;
        case 60:
            if (tick == 50) {
                // tick with bonus
                // return `<i class="bi bi-file-fill"></i>`;
                return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                        </svg>`;
            } else {
                // flash without bonus
                // return `<i class="bi bi-lightning-fill"></i>`;
                return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                            <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
                        </svg>`;
            }
        case 70:
            // return `<i class="bi bi-lightning-fill"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                        <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
                    </svg>`;
        default:
            //return `<i class="bi bi-file"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                    </svg>`;
    }
}
