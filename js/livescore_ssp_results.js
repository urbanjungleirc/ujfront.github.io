/*  Using Google Script Api to retrieve JSON data
    how to creat the api with formated json in google script
        youtube: https://www.youtube.com/watch?v=uJDLT8nh2ps
        script: https://docs.google.com/document/d/1tvJzwS7Zu_WeE77rNTnM5Q7leNanR95CnLY5Jc5p0_4/edit

    my live score api:
    https://script.google.com/macros/s/AKfycbyUXxaevlA-4_yhSS_-BvAmNiE1xf0tV2EEZ0U2r5qQA_JaYSGqhQ4ExjNiE_WvJli2/exec
*/

// set pumpfest count down
timezz(document.querySelector("#timer"), {
    date: catTimeEnd,
});

$(document).ready(function () {
    console.log(`Table initialisation start: ${new Date().getTime()}`);

    let table = $("#results")
        .on("init.dt", function () {
            // called once initialistion is complete
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

            // search: {
            //     search: filter,
            // },

            // ordering:  false,
            order: [[0, "asc"]],
            // rowReorder: true, // allows to re-order
            // columnDefs: [
            //     { orderable: true, className: "reorder", targets: 0 },
            //     { orderable: false, targets: "_all" }, // disable ordering for columns
            // ],
            // orderClasses: true, // highlight the columns which are used to order the content

            columns: [
                { data: "name", title: "Name", orderable: false},
                { data: "tops", title: "Tops", orderable: false},
                { data: "zones", title: "Zones", orderable: false},
                { data: "top_attempts", title: "att to Top", orderable: false},
                { data: "zone_attempts", title: "att to Zone", orderable: false},

                // hidden columns
                { data: "category", visible: false },
                { data: "gender", visible: false },
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
            language: {
                searchPanes: {
                    clearMessage: 'Clear selections',
                    collapse: {0: 'Filter', _: 'Filters (%d)'}
                }
            },
            buttons: [
                'searchPanes',
                {
                    text: 'Order by Name',
                    action: function ( e, dt, node, config ) {
                        dt.order([0, 'asc']).draw();
                        showHideColumns('name');
                    },
                    //className: 'btn-outline-primary'
                },
                {
                    text: 'Final ranking',
                    action: function ( e, dt, node, config ) {
                        dt.order([[1, 'desc'],[ 2, 'desc'], [3, 'asc'],[ 4, 'asc']]).draw();
                        showHideColumns('boulder');
                    },
                    //className: 'btn-primary'
                }
            ],
            dom: 'rt<"nav nav-fill" <"nav-item" B><"nav-item" i><"nav-item" p> >',
            columnDefs: [
                {
                    searchPanes: {
                        show: true
                    },
                    targets: [5,6] // 5 = category, 6 = gender
                },
                {
                    searchPanes: {
                        show: false
                    },
                    targets: [0,1,2,3,4]
                }
            ]
            
        });

});

/* default class for buttons 
   https://datatables.net/forums/discussion/comment/149769/#Comment_149769
*/
$.fn.dataTable.Buttons.defaults.dom.button.className = 'btn';


/* hide and show chosen discipline
*/
function showHideColumns(discipline){

    let table = $('#results').DataTable();

    // hide all results for all disciplines
    for ( var i=1 ; i<5 ; i++ ) {
        table.column(i).visible( false, false );
    }
    
    // display chosen 
    switch(discipline) {
        case "speed":
            table.column(23).visible(true, false);
            table.column(24).visible(true, false);
            break;
        case "boulder":
            table.column(1).visible(true, false);
            table.column(2).visible(true, false);
            table.column(3).visible(true, false);
            table.column(4).visible(true, false);
            break;
        default:
            break;
    
        }

    // adjust column sizing and redraw
    table.columns.adjust().draw(false); 


    // table.column( 0 ).visible() === true ? 'visible' : 'not visible'
}

/* Resources:

 https://datatables.net/examples/basic_init/data_rendering.html
 rendering plugins: https://github.com/DataTables/Plugins/tree/master/dataRender
 */
