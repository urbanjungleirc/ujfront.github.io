/*  Using Google Script Api to retrieve JSON data
    how to creat the api with formated json in google script
        youtube: https://www.youtube.com/watch?v=uJDLT8nh2ps
        script: https://docs.google.com/document/d/1tvJzwS7Zu_WeE77rNTnM5Q7leNanR95CnLY5Jc5p0_4/edit

    my live score api:
    https://script.google.com/macros/s/AKfycbyUXxaevlA-4_yhSS_-BvAmNiE1xf0tV2EEZ0U2r5qQA_JaYSGqhQ4ExjNiE_WvJli2/exec
*/

/* -------------------------------------
    Default setting
   -------------------------------------
*/
const minPageDisplay = 10000; // minimum time for a page to be displayed
let dataRefreshInterval = 1 * 60000; // frequency for data refresh (1min = 60000)
const rowsPerPage = 8; // number of rows per page
const filter = "Punks"; // filtering data - enter category
const catTimeEnd = "2022-10-15 08:00";

/* ------------------------------------- 
    To do 
   -------------------------------------
    knowtable scores ?? 
        speed under: 10+ bold, 6- red?
        lead 1 over: 20+ bold; top: red?
    width/hight of boulder blocks
    add current ranking, rumble only or all categories ??
*/

const score =
    "https://script.google.com/macros/s/AKfycbyUXxaevlA-4_yhSS_-BvAmNiE1xf0tV2EEZ0U2r5qQA_JaYSGqhQ4ExjNiE_WvJli2/exec";

// set pumpfest count down
timezz(document.querySelector("#timer"), {
    date: catTimeEnd,
});

$(document).ready(function () {
    console.log(`Table initialisation start: ${new Date().getTime()}`);

    let table = $("#results")
        .on("init.dt", function () {
            console.log(
                `Table initialisation complete: ${new Date().getTime()}`
            );
        })
        .on("xhr.dt", function (e, settings, json, xhr) {
            //$("#status").html(json.status);
            let el = document.getElementById("updatedAt");
            let d = new Date();
            el.innerText = " @ " + d.getHours() + ":" + d.getMinutes();
        })
        .dataTable({
            ajax: {
                url: score,
                cache: true,
                data: function (d) {
                    d.format = "json";
                },
                dataSrc: "data",
            },

            lengthChange: false,
            pageLength: rowsPerPage,
            pagingType: "numbers",
            renderer: "bootstrap",

            search: {
                search: filter,
            },

            // ordering:  false,
            order: [[0, "asc"]],
            rowReorder: true, // allows to re-order
            columnDefs: [
                { orderable: true, className: "reorder", targets: 0 },
                { orderable: false, targets: "_all" }, // disable ordering for columns
            ],
            orderClasses: true, // highlight the columns which are used to order the content

            columns: [
                { data: "name", title: filter },
                {
                    data: "rrank",
                    class: "dt-center",
                    render: function (data, type) {
                        if (type === "display") {
                            switch (data) {
                                case 1:
                                    return `<div class="primary-dark bg-transparent text-wrap style="width: 2rem;"><i class="bi bi-trophy-fill"></i></div>`;
                                    break;
                                case 2:
                                    return `<div class="primary-dark bg-transparent text-wrap style="width: 2rem;"><i class="bi bi-award-fill"></i></div>`;
                                    break;
                                case 3:
                                    return `<div class="primary-dark bg-transparent text-wrap style="width: 2rem;"><i class="bi bi-award"></i></div>`;
                                    break;
                                case 4:
                                case 5:
                                case 6:
                                    return `<span class="primary-dark bg-transparent fw-semibold">${data}</span>`;
                                    break;
                                default:
                                    return `<span class="primary-dark bg-transparent">${data}</span>`;
                            }
                        }
                        return data;
                    },
                },

                // speed columns
                {
                    data: "s1",
                    class: "dt-body-right dt-head-center",
                    render: function (data, type) {
                        return speed(data, type);
                    },
                },
                {
                    data: "s2",
                    class: "dt-body-right dt-head-center",
                    render: function (data, type) {
                        return speed(data, type);
                    },
                },
                {
                    data: "s3",
                    class: "dt-body-right dt-head-center",
                    render: function (data, type) {
                        return speed(data, type);
                    },
                },
                {
                    data: "s4",
                    class: "dt-body-right dt-head-center",
                    render: function (data, type) {
                        return speed(data, type);
                    },
                },

                // boulder columns
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.a, row.az, row.at);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.b, row.bz, row.bt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.c, row.cz, row.ct);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.d, row.dz, row.dt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.e, row.ez, row.et);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.f, row.fz, row.ft);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.g, row.gz, row.gt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.h, row.hz, row.ht);
                    },
                },

                // lead columns
                {
                    data: "l1",
                    class: "dt-center",
                    render: function (data, type) {
                        return leed(data, type);
                    },
                },
                {
                    data: "l2",
                    class: "dt-center",
                    render: function (data, type) {
                        return leed(data, type);
                    },
                },
                {
                    data: "l3",
                    class: "dt-center",
                    render: function (data, type) {
                        return leed(data, type);
                    },
                },
                {
                    data: "l4",
                    class: "dt-center",
                    render: function (data, type) {
                        return leed(data, type);
                    },
                },
                {
                    data: "l5",
                    class: "dt-center",
                    render: function (data, type) {
                        return leed(data, type);
                    },
                },
                {
                    data: "l6",
                    class: "dt-center",
                    render: function (data, type) {
                        return leed(data, type);
                    },
                },

                // category
                { data: "category", visible: false },

                // results
            ],

            initComplete: function () {
                // calculate time intervals for the page rotating and updates
                let api = this.api();
                let tableInfo = api.page.info(); // https://datatables.net/reference/api/page.info()

                if (tableInfo.pages > 1) {
                    // more than one page
                    let timePerPage = dataRefreshInterval / tableInfo.pages;
                    if (timePerPage < minPageDisplay) {
                        dataRefreshInterval = minPageDisplay * tableInfo.pages;
                        timePerPage = minPageDisplay;
                    } else {
                        timePerPage = timePerPage.toFixed();
                    }

                    // set interval for flipping pages
                    setInterval(function () {
                        if (api.page.info().page == api.page.info().pages - 1) {
                            api.page("first").draw("page");
                        } else {
                            api.page("next").draw("page");
                        }
                    }, timePerPage);
                }

                // set interval for data refresh
                setInterval(function () {
                    //console.log("Table refreshed: " + new Date().getTime());
                    api.ajax.reload();
                }, dataRefreshInterval);
            },
        });

    // hide search option
    document.getElementById("results_filter").style.display = "none";
});

// formating speed results
function speed(data, type) {
    return data;
    // var number = $.fn.dataTable.render.number(",", ".", 3).display(data);

    // if (type === "display") {
    //     let fclasses = "";
    //     if (data > 0) {
    //         if (data < 6) {
    //             fclasses = "text-primary fw-bold";
    //         } else if (data < 10) {
    //             fclasses = "text-primary";
    //         }
    //     }
    //     return `<span class="${fclasses}">${number}</span>`;
    // }
    // return number;
}

// formating lee results
function leed(data, type) {
    return data;
    // if (type === "display") {
    //     if (data == 99) {
    //         return `<div class="primary-dark bg-transparent text-wrap style="width: 2rem;"><i class="bi bi-lightning-fill"></i></div>`;
    //     } else {
    //         return `<span class="primary-dark bg-transparent">${data}</span>`;
    //     }
    // }
    // return data;
}

// formating boulder results
function boulder(tries = 0, zone = 0, top = 0) {
    return tries;
}
// function boulder(tries = 0, zone = 0, top = 0) {
//     if (top > 0) {
//         if (top == 1) {
//             return `<div class="text-secondary text-wrap style="width: 2rem;"><i class="bi bi-lightning-fill"></i></div>`;
//         } else {
//             return `<div class="badge bg-secondary text-wrap pt-4" style="width: 2rem;">${top}</div>`;
//         }
//     } else if (zone > 0) {
//         return `<div class="badge secondary-light text-white text-wrap pt-2" style="width: 2rem;">${zone}</div>`;
//     } else {
//         // return `<div class="badge bg-transparent text-dark text-wrap pt-2" style="width: 2rem;">${tries}</div>`;
//         return `<div class="bg-transparent secondary-dark fs-5 fw-semibold">${tries}</div>`;
//     }
// }

// function resetProgress(max) {
//     let el = document.getElementById("updateProgressBar");
//     //console.log(el.ariaValueMax); // 7
//     el.ariaValueMax = max;
//     el.ariaValueMin = 0;
//     el.ariaValueNow = 0;
//     //console.log(el.ariaValueMax); // 6
// }

/* Resources:

 https://datatables.net/examples/basic_init/data_rendering.html
 rendering plugins: https://github.com/DataTables/Plugins/tree/master/dataRender
 */
