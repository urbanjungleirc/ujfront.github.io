/*  -------------------------------------
    Default setting
    -------------------------------------
*/
//const scoreUrl = "https://script.google.com/macros/s/AKfycbxscrr-fPwL6d-M1jiA_6YaN-HGZHLDmGmGQ6oIF_Kyh8bPdPMK6W9OMNG8aqfIiIrVTQ/exec"; // public copy data
const scoreUrl = "https://script.google.com/a/macros/urbanjungleirc.com/s/AKfycbyQtX-xInuAc6JwZ-a370PAifWNGD9z4eyRKZj2oTC-5mUOfSmmBYllC5F_wcSMezcZIA/exec" // test data

const minPageDisplay = 3000;               // minimum time for a page to be displayed
const maxPageDisplay = 5000;               // maximum time for a page to be displayed
let dataRefreshInterval = 2 * 60000;        // frequency for full data refresh (1min = 60000)
let categoryTimeInterval = 60000;           // time for one category to be desplayed
let firstPageCallDone = false;

const rowsPerPage = 3;                         // number of rows per page
let currentCategoryIndex = 0;                       // filtering data - enter category
const categories = ["advanced", "intermediate", "youth", "novice - top rope", "youth - top rope"];
const competitionEndTime = "2023-03-21 16:30";



//* set default timers
let timer = timezz(document.querySelector("#timer"), {
    date: competitionEndTime,
    stopOnZero: true
});


/** 
* dataTable setup
*/
let tblMale = $("#tableMale");
let tblFemale = $("#tableFemale");
let pageTimer = new Timer (pageFlipper,600000);

$(document).ready(function () {
    console.clear();
    console.log(`Table initialisation start: ${new Date().getTime()}`);
});

$("#tableMale")
    .on("init.dt", function () {
        //  fired when DataTables has been fully initialised and data loaded
        console.log(`Table initialisation complete: ${new Date().getTime()}`);
        startPageRotations();
    })
    .on("xhr.dt", function (e, settings, json, xhr) {
        // fired when an Ajax request is completed
        //$("#status").html(json.status);
        let el = document.getElementById("updatedAt");
        let d = new Date();
        el.innerText = " @ " + d.getHours() + ":" + d.getMinutes();
        console.log ('xhr event completed');        
        if (firstPageCallDone) {startPageRotations();}
    })
    .on('search.dt', function () { 
        // fired when the table is filtered
        
    })
    .on("page.dt", function () { 
        // fired when the table's paging is updated
        var info = tblMale.DataTable().page.info();
        console.log ( `${categories[currentCategoryIndex]}  page ${info.page+1} of ${info.pages}` );
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
            { data: "gender", visible: true, title: "Gender"},
            { data: "category", visible: true, title: "Category"},
            {
                data: "rank",
                class: "dt-center",
                render: function (data, type) {
                    if (type === "display") {
                        switch (data) {
                            case 1:
                            case 2:
                            case 3:
                                return `<span class="text-primary bg-transparent fw-semibold">${data}</span>`;
                                break;
                            case 4:
                            case 5:
                            case 6:
                                return `<span class="text-black bg-transparent fw-semibold">${data}</span>`;
                                break;
                            default:
                                return `<span class="text-black bg-transparent">${data}</span>`;
                        }
                    }
                    return data;
                }, orderable: false 
            }, 
            { data: "name", title: "Name", orderable: false },
            { data: "score", title: "Score", orderable: false },
        ],

        //* paging setup
        lengthChange: false,
        pageLength: rowsPerPage,
        pagingType: "numbers",
        renderer: "bootstrap",

        searchCols: [
            { search: `\\bmale\\b`, regex:  true }, //   (?i)(?<= |^)rum(?= |$)    ---   (?i)\bmale\b
            { search: `\^\\b${categories[currentCategoryIndex]}\$\\b`, regex: true }, 
            null,
            null,
            null
        ],

        order: [[2, "asc"]],      
        dom: 'rt<"nav nav-fill" <"nav-item" B> <"nav-item" i><"nav-item" p> >',
        
    }).on( 'draw.dt', function () {
            //console.log( 'Redraw occurred at: '+new Date().getTime() );
})

// Female table setup
$("#tableFemale")
    .on("init.dt", function () {
        //  fired when DataTables has been fully initialised and data loaded
        console.log(`Female table initialisation complete: ${new Date().getTime()}`);
    })
    .on("xhr.dt", function (e, settings, json, xhr) {
        // fired when an Ajax request is completed
    })
    .on('search.dt', function () { 
        // fired when the table is filtered        
    })
    .on("page.dt", function () { 
        // fired when the table's paging is updated
        var info = tblFemale.DataTable().page.info();
        console.log ( `Female category - ${categories[currentCategoryIndex]}  page ${info.page+1} of ${info.pages}` );
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
            { data: "gender", visible: true, title: "Gender"},
            { data: "category", visible: true, title: "Category"},
            {
                data: "rank",
                class: "dt-center",
                render: function (data, type) {
                    if (type === "display") {
                        switch (data) {
                            case 1:
                            case 2:
                            case 3:
                                return `<span class="text-primary bg-transparent fw-semibold">${data}</span>`;
                                break;
                            case 4:
                            case 5:
                            case 6:
                                return `<span class="text-black bg-transparent fw-semibold">${data}</span>`;
                                break;
                            default:
                                return `<span class="text-black bg-transparent">${data}</span>`;
                        }
                    }
                    return data;
                }, orderable: false 
            }, 
            { data: "name", title: "Name", orderable: false },
            { data: "score", title: "Score", orderable: false },
        ],

        //* paging setup
        lengthChange: false,
        pageLength: rowsPerPage,
        pagingType: "numbers",
        renderer: "bootstrap",

        searchCols: [
            { search: `\\bfemale\\b`, regex: true },
            { search: `\^\\b${categories[currentCategoryIndex]}\$\\b`, regex: true }, 
            null,
            null,
            null
        ],

        order: [[2, "asc"]],      
        dom: 'rt<"nav nav-fill" <"nav-item" B> <"nav-item" i><"nav-item" p> >',
        
    }).on( 'draw.dt', function () {
            //console.log( 'Redraw occurred at: '+new Date().getTime() );
})

function startPageRotations() {
    // calculate time intervals for the page rotating and updates
    firstPageCallDone = true;
    let tableInfo = tblMale.DataTable().page.info(); // https://datatables.net/reference/api/page.info()
    let timePerPage = maxPageDisplay;

    document.querySelector("#activeCategory").innerText = categories[currentCategoryIndex].toLocaleUpperCase();

    if (tableInfo.pages > 1) {
        // more than one page
        timePerPage = dataRefreshInterval / tableInfo.pages;
        if (timePerPage < minPageDisplay) {
            dataRefreshInterval = minPageDisplay * tableInfo.pages;
            timePerPage = minPageDisplay;
        } else if (timePerPage > maxPageDisplay) {
            timePerPage = maxPageDisplay;
        } else {
            timePerPage = timePerPage.toFixed();
        }
        console.log ("startPageRotation - x pages, timePerPage: " + timePerPage)
    } else {
        console.log ("startPageRotation - ONE page, timePerPage: " + timePerPage)
    }
    pageTimer.reset(timePerPage);
}

function pageFlipper () {
    // flipping through MALE
    if (tblMale.DataTable().page.info().page < tblMale.DataTable().page.info().pages - 1 ) {
        tblMale.DataTable().page("next").draw("page");
    } else {
        // last page - cancel page change, reset category & refresh all data       
        console.log ("last page, calling data update");
        changeCategory();
        tblMale.DataTable().ajax.reload(); // reload full data table
    }
}

function changeCategory() {
    if (currentCategoryIndex == categories.length-1) {
        currentCategoryIndex = 0;
    } else {
        currentCategoryIndex = currentCategoryIndex +1 ;
    }
    // apply filter
    tblMale.DataTable().columns(1).search(`\^\\b${categories[currentCategoryIndex]}\$\\b`, true );
    tblFemale.DataTable().columns(1).search(`\^\\b${categories[currentCategoryIndex]}\$\\b`, true );
    console.log ('category changed to ' + categories[currentCategoryIndex].toLocaleUpperCase());
}


/* default class for buttons 
   https://datatables.net/forums/discussion/comment/149769/#Comment_149769
*/
$.fn.dataTable.Buttons.defaults.dom.button.className = 'btn btn-light';


//* helper functions/objects


/** a timer object that offers a reset feature
 * @param fn function to execute
 * @param t time interval for the function
 * @returns an object with events START / STOP / RESTART(newTimeInterval)
 * @description https://stackoverflow.com/questions/8126466/how-do-i-reset-the-setinterval-timer
*/
function Timer(fn, t) {
    var timerObj = setInterval(fn, t);

    this.stop = function() {
        if (timerObj) {
            clearInterval(timerObj);
            timerObj = null;
        }
        return this;
    }

    // start timer using current settings (if it's not already running)
    this.start = function() {
        if (!timerObj) {
            this.stop();
            timerObj = setInterval(fn, t);
        }
        return this;
    }

    // start with new or original interval, stop current interval
    this.reset = function(newT = t) {
        t = newT;
        return this.stop().start();
    }
}