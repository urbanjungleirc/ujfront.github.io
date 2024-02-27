// todo: optimise speed, fetch data once only: https://chat.openai.com/share/14e3149d-0a23-4467-86e2-d67502a781d2

// todo: page swap annimations - https://datatables.net/forums/discussion/57176/how-to-add-animated-effect-for-auto-datatable-switching
// or https://www.stechies.com/make-text-blink-javascript/#:~:text=Code%20Explanation&text=To%20make%20it%20blink%2C%20we,This%20makes%20the%20text%20blink.


/*  -------------------------------------
    Default setting
    -------------------------------------
*/
const scoreUrl = "https://script.google.com/macros/s/AKfycbyQtX-xInuAc6JwZ-a370PAifWNGD9z4eyRKZj2oTC-5mUOfSmmBYllC5F_wcSMezcZIA/exec"; // public copy data
const minPageDisplay = 10000; // minimum time for a page to be displayed
const maxPageDisplay = 15000; // maximum time for a page to be displayed
let dataRefreshInterval = 2 * 60000; // frequency for full data refresh
//let categoryTimeInterval = 60000;  // time for one category to be desplayed
let firstPageCallDone = false;

const rowsPerPage = 7; // number of rows per page
let currentCategoryIndex = 0; // filtering data - enter category
const categories = [
    "advanced",
    "intermediate",
    "youth",
    "novice - top rope",
    "youth - top rope",
];
const competitionEndTime = "2024-03-21 19:00";

// setting up Modal element
let mySpinner = new bootstrap.Modal(document.getElementById("modalSpinner"), {
    keyboard: false,
});

//* set default timers
let timer = timezz(document.querySelector("#timer"), {
    date: competitionEndTime,
    stopOnZero: true,
});

/**
 * dataTable setup
 */
let tblMale = $("#tableMale");
let tblFemale = $("#tableFemale");
let pageTimer = new Timer(pageFlipper, 600000);

// $(document).ready(function () {
//     console.clear();
//     console.log(`Table initialisation start: ${new Date().getTime()}`);
// });

$("#tableMale")
    .on("preXhr.dt", function (e, settings, json, xhr) {
        // fired when an Ajax request is completed
        mySpinner.show();
    })
    .on('page.dt', function () {
        tblMale.fadeOut("fast");
        tblMale.fadeIn("fast"); 
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
                class: "align-middle",
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
            { search: `\\bmale\\b`, regex: true }, //   (?i)(?<= |^)rum(?= |$)    ---   (?i)\bmale\b
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
            infoEmpty: "No competitors found",
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
        // updates time and start Restarts Page Roatation
        let el = document.getElementById("updatedAt");
        moment.locale("au");
        el.innerText = " @ " + moment().format("LT");
        if (firstPageCallDone) {
            startPageRotations();
        }
    })
    .on('page.dt', function () {
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
                class: "align-middle",
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
            infoEmpty: "No competitors found",
            lengthMenu: "Display _MENU_ competitors",
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
    let masterTbl = null;
    let secondaryTbl = null;

    if (tblMale.DataTable().page.info().pages > tblFemale.DataTable().page.info().pages) {
        masterTbl = tblMale.DataTable();
        secondaryTbl = tblFemale.DataTable();
    } else {
        masterTbl = tblFemale.DataTable();
        secondaryTbl = tblMale.DataTable();
    }

    if (masterTbl.page.info().page < masterTbl.page.info().pages - 1) {
        // flipping through next page in master table
        masterTbl.page("next").draw("page");
        if (secondaryTbl.page.info().page < secondaryTbl.page.info().pages - 1) {
            // flipping to the next page in secondary table
            secondaryTbl.page("next").draw("page");
        } else {
            // moving to first page in secondary table
            secondaryTbl.page("first").draw("page");
        }
    } else {
        // last page on master table -> cancel page change, reset category & refresh all data
        // console.log ("last page, calling data update");
        changeCategory();
        tblMale.DataTable().ajax.reload(); // reload full data table
        tblFemale.DataTable().ajax.reload();
    }
}

function changeCategory() {
    if (currentCategoryIndex == categories.length - 1) {
        currentCategoryIndex = 0;
    } else {
        currentCategoryIndex = currentCategoryIndex + 1;
    }
    // apply filter
    tblMale
        .DataTable()
        .columns(1)
        .search(`\^\\b${categories[currentCategoryIndex]}\$\\b`, true);
    tblFemale
        .DataTable()
        .columns(1)
        .search(`\^\\b${categories[currentCategoryIndex]}\$\\b`, true);
    // console.log ('category changed to ' + categories[currentCategoryIndex].toLocaleUpperCase());
}

/* default class for buttons 
   https://datatables.net/forums/discussion/comment/149769/#Comment_149769
*/
$.fn.dataTable.Buttons.defaults.dom.button.className = "btn";

//* helper functions/objects

// shorten name
function shortName(fullName = "") {
    const maxLetters = 14;
    if (fullName.length > maxLetters) {
        let name = fullName.split(" ");
        if (name.length <= 2) {
            return fullName.substring(0,maxLetters-1) + "...";
        } else {
            let firstName = name[0];
            let middleInitials = "";
            let lastName = name[name.length-1];
            console.log(firstName + " " + lastName);
            for (let i = 1; i <= name.length - 2; i++) {
                middleInitials += name[i][0];
            }
            return `${firstName} ${middleInitials} ${lastName}`.substring(0,maxLetters-1) + "...";       
        }
    } else {
        return fullName;
    }
}
function firstNameWithInitials(fullName = "") {
    if (fullName.length >= 15) {
        let name = fullName.split(" ");
        let firstName = name[0];
        let middleInitials = "";
        let lastInitial = "";
        for (let i = 1; i <= name.length - 1; i++) {
            middleInitials += name[i][0];
        }
        //   if (name.length > 2) {
        //     lastInitial = name[name.length - 1][0];
        //   }
        console.log(`${firstName} ${middleInitials}${lastInitial}`);
        return `${firstName} ${middleInitials}${lastInitial}`;
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
            ticks =
                ticks +
                tickIcon(
                    row["r" + i + "_" + element],
                    row["r" + i + "_" + element + "_bonus"]
                );
        }
        ticks = ticks + "</span>";
        if (i == 2) {
            ticks = ticks + "</br>";
        }
    }
    return `<div class="fs-6 py-0">${ticks}</div>`;
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
                    </svg>`
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
