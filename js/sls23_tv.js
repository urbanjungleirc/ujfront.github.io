/*  -------------------------------------
    Default setting
    -------------------------------------
*/
//const scoreUrl = "https://script.google.com/macros/s/AKfycbxscrr-fPwL6d-M1jiA_6YaN-HGZHLDmGmGQ6oIF_Kyh8bPdPMK6W9OMNG8aqfIiIrVTQ/exec"; // public copy data
const scoreUrl = "https://script.google.com/a/macros/urbanjungleirc.com/s/AKfycbyQtX-xInuAc6JwZ-a370PAifWNGD9z4eyRKZj2oTC-5mUOfSmmBYllC5F_wcSMezcZIA/exec" // test data

const minPageDisplay = 10000;               // minimum time for a page to be displayed
const maxPageDisplay = 20000;               // maximum time for a page to be displayed
let dataRefreshInterval = 2 * 60000;        // frequency for full data refresh
//let categoryTimeInterval = 60000;           // time for one category to be desplayed
let firstPageCallDone = false;

const rowsPerPage = 8;                         // number of rows per page
let currentCategoryIndex = 0;                       // filtering data - enter category
const categories = ["advanced", "intermediate", "youth", "novice - top rope", "youth - top rope"];
const competitionEndTime = "2023-03-21 16:30";

// setting up Modal element
let mySpinner = new bootstrap.Modal(document.getElementById('modalSpinner'), {
    keyboard: false
  });


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

// $(document).ready(function () {
//     console.clear();
//     console.log(`Table initialisation start: ${new Date().getTime()}`);
// });

$("#tableMale")
    .on("preXhr.dt", function (e, settings, json, xhr) {
        // fired when an Ajax request is completed
        mySpinner.show();
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
            { data: "gender", visible: false, title: "Gender"},
            { data: "category", visible: false, title: "Category"},
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
                }, orderable: false, class: "align-middle"
            }, 
            { data: "name", title: "Name", orderable: false, class: "align-middle" },
            { data: "score", title: "Score", orderable: false, class: "dt-right align-middle"  },
            {
                data: null,
                class: "dt-right",
                render: function (row,type) {
                    if (type === "display") { return sends(row);}
                    return;
                }, orderable: false, title: "", defaultContent: ""
            },     

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
            null,
            null
        ],

        language: {
            info: "Showing _START_ to _END_ of _TOTAL_ competitors", 
            infoFiltered: " (filtered from a total of _MAX_ participants)", 
            infoEmpty: "No competitors found", 
            lengthMenu: "Display _MENU_ competitors"
        },


        order: [[2, "asc"]],      
        dom: 'rt<"d-flex justify-content-between my-2" <"p-1 pt-0" i><"p-1" p> >',
        initComplete: function(settings, json) {
            // $('.page_link').addClass('btn-primary');
          }
        
    })

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
        moment.locale('au');
        el.innerText = " @ " + moment().format('LT'); 
        if (firstPageCallDone) {startPageRotations();}
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
            { data: "gender", visible: false, title: "Gender"},
            { data: "category", visible: false, title: "Category"},
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
                }, orderable: false, class: "align-middle"
            }, 
            { data: "name", title: "Name", orderable: false, class: "align-middle" },
            { data: "score", title: "Score", orderable: false, class: "dt-right align-middle"  },
            {
                data: null,
                class: "dt-right",
                render: function (row,type) {
                    if (type === "display") { return sends(row);}
                    return;
                }, orderable: false, title: "", defaultContent: ""
            },     

        ],

        searchCols: [
            { search: `\\bfemale\\b`, regex: true },
            { search: `\^\\b${categories[currentCategoryIndex]}\$\\b`, regex: true }, 
            null,
            null,
            null, 
            null
        ],

        //* paging setup
        lengthChange: false,
        pageLength: rowsPerPage,
        pagingType: "numbers",
        renderer: "bootstrap",

        language: {
            info: "Showing _START_ to _END_ of _TOTAL_ competitors", 
            infoFiltered: " (filtered from a total of _MAX_ participants)", 
            infoEmpty: "No competitors found", 
            lengthMenu: "Display _MENU_ competitors"
        },


        order: [[2, "asc"]],      
        dom: 'rt<"d-flex justify-content-between my-2" <"p-1 pt-0" i><"p-1" p> >',   
    })



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
        console.log ("startPageRotation - x pages, timePerPage: " + timePerPage)
    } else {
        console.log ("startPageRotation - ONE page, timePerPage: " + timePerPage)
    }

    document.querySelector("#activeCategory").innerText = categories[currentCategoryIndex].toLocaleUpperCase();
    mySpinner.hide();
    pageTimer.reset(timePerPage);
}


function pageFlipper () {

    let masterTbl = null;
    let secondaryTbl = null;

    if (tblMale.DataTable().page.info().pages > tblFemale.DataTable().page.info().pages) {
        masterTbl = tblMale.DataTable();
        secondaryTbl = tblFemale.DataTable();    
    } else {
        masterTbl = tblFemale.DataTable();
        secondaryTbl = tblMale.DataTable();    
    }

    if (masterTbl.page.info().page < masterTbl.page.info().pages - 1 ) {
        // flipping through next page in master table
        masterTbl.page("next").draw("page");
        if (secondaryTbl.page.info().page < secondaryTbl.page.info().pages - 1 ) {
            // flipping to the next page in secondary table
            secondaryTbl.page("next").draw("page");
        } else {
            // moving to first page in secondary table
            secondaryTbl.page("first").draw("page");
        }
    } else {
        // last page on master table -> cancel page change, reset category & refresh all data       
        console.log ("last page, calling data update");
        changeCategory();
        tblMale.DataTable().ajax.reload(); // reload full data table
        tblFemale.DataTable().ajax.reload();
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
$.fn.dataTable.Buttons.defaults.dom.button.className = 'btn';


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

function sends(row) {
    const routes = ["a", "b", "c", "d"];
    let ticks = "";
    // let tick = 0;
    // let bonus = 0;

    for (i=1; i<5;i++) {
        ticks = `${ticks}<span class="text-round${i}" >`;
        for (const element of routes) {
            //console.log(element);
            // tick = typeof row['r' + i + '_' + element] === "number" ? row['r' + i + '_' + element] : 0;
            // bonus = typeof row['r' + i + '_' + element + '_bonus'] === "number" ? row['r' + i + '_' + element + '_bonus'] : 0;     
            //console.log(row['r' + i + '_' + element] + ' --- ' + row['r' + i + '_' + element + '_bonus']); 
            //console.log (tick + ' --- ' + bonus);
            ticks = ticks + tickIcon (row['r' + i + '_' + element], row['r' + i + '_' + element + '_bonus']); // row.r1_a + row.r1_a_bonus
        }
        ticks = ticks + '</span>';
        if (i == 2) {ticks = ticks + "</br>"}
    }
    return `<div class="fs-4">${ticks}</div>`;

}

function tickIcon (tick=0, bonus=0) {
    switch (tick + bonus) {
        case 20:
        case 25:    
            return `<i class="bi bi-file-break"></i>`;           
        case 50:
            return `<i class="bi bi-file-fill"></i>`;
        case 60:
            if (tick==50) {    
                // tick with bonus
                return `<i class="bi bi-file-fill"></i>`;
            } else {
                // flash without bonus
                return `<i class="bi bi-lightning-fill"></i>`;
            }
        case 70:
            return `<i class="bi bi-lightning-fill"></i>`;
        default:
            return `<i class="bi bi-file"></i>`;
    }

}