/*  Using Google Script Api to retrieve JSON data
    how to creat the api with formated json in google script
        youtube: https://www.youtube.com/watch?v=uJDLT8nh2ps
        script: https://docs.google.com/document/d/1tvJzwS7Zu_WeE77rNTnM5Q7leNanR95CnLY5Jc5p0_4/edit
*/


//* set the table

$(document).ready(function () {
    console.log(`Table initialisation start: ${new Date().getTime()}`);

    let table = $("#results")
        .on("init.dt", function () {
            console.log(`Table initialisation complete: ${new Date().getTime()}`);
        })
        .on("xhr.dt", function (e, settings, json, xhr) {
            //$("#status").html(json.status);
            let el = document.getElementById("updatedAt");
            let d = new Date();
            el.innerText = " @ " + d.getHours() + ":" + d.getMinutes();
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

            // paging setup
            lengthChange: false,
            pageLength: rowsPerPage,
            pagingType: "numbers",
            renderer: "bootstrap",

            // search: {
            //     search: filter,
            // },

            //ordering:  false,
            //rowReorder: true, // allows to re-order
            // columnDefs: [
            //     { orderable: true, targets: 1 },
            //     { orderable: false, targets: "_all" }, // disable ordering for columns
            // ],
            order: [[1, "asc"]],
            //orderClasses: true, // highlight the columns which are used to order the content

            columns: [
							
                { data: "id", visible: false, orderable: false },
                { data: "name", title: "Name"},
                { data: "bornYear", visible: false},
                { data: "gender", title: "Gender", visible: false},
                { data: "category", title: "Category", visible: false },
                // speed columns
                {
                    data: null,
                    class: "dt-body-right dt-head-center",
                    render: function (row) {
                        return comparedSpeed(row.s1, row.s2, row.s3, row.s4);
                    },
                    title: "1", orderable: false, visible: false
                },
                {
                    data: null,
                    class: "dt-body-right dt-head-center",
                    render: function (row) {
                        return comparedSpeed(row.s2, row.s1, row.s3, row.s4);
                    },
                    title: "2", orderable: false , visible: false
                },
                {
                    data: null,
                    class: "dt-body-right dt-head-center",
                    render: function (row) {
                        return comparedSpeed(row.s3, row.s1, row.s2, row.s4);
                    },
                    title: "3", orderable: false , visible: false
                },
                {
                    data: null,
                    class: "dt-body-right dt-head-center",
                    render: function (row) {
                        return comparedSpeed(row.s4, row.s1, row.s2, row.s3);
                    },
                    title: "4", orderable: false , visible: false
                },
                // Boulder columns
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.a, row.az, row.at);
                    },
                    title: "A", orderable: false , visible: false
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.b, row.bz, row.bt);
                    }, 
                    title: "B", orderable: false , visible: false
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.c, row.cz, row.ct);
                    }, 
                    title: "C", orderable: false , visible: false
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.d, row.dz, row.dt);
                    },
                    title: "D", orderable: false , visible: false
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.e, row.ez, row.et);
                    },
                    title: "E", orderable: false , visible: false
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.f, row.fz, row.ft);
                    },
                    title: "F", orderable: false , visible: false
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.g, row.gz, row.gt);
                    },
                    title: "G", orderable: false , visible: false
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.h, row.hz, row.ht);
                    },
                    title: "H", orderable: false , visible: false
                },     
                // lead columns
                {
                    data: "l1",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    }, 
                    title: "1", orderable: false , visible: false
                },
                {
                    data: "l2",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    },
                    title: "2", orderable: false , visible: false
                },
                {
                    data: "l3",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    },
                    title: "3", orderable: false , visible: false
                },
                {
                    data: "l4",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    },
                    title: "4", orderable: false , visible: false
                },
                {
                    data: "l5",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    },
                    title: "5", orderable: false , visible: false
                },
                {
                    data: "l6",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    },
                    title: "6", orderable: false , visible: false
                },

                { data: "sscore", title: "Time", visible: false, orderable: false},          // 23
                { data: "srank", title: "Rank", visible: false, orderable: false},           // 24
                { data: "btops", title: "Tops", visible: false, orderable: false},           // 25
                { data: "bzones", title: "Zones", visible: false, orderable: false},          // 26
                { data: "btopattemtps", title: "att top", visible: false, orderable: false},    // 27
                { data: "bzoneattempts", title: "att zone", visible: false, orderable: false},   // 28
                { data: "brank", title: "Rank", visible: false, orderable: false},           // 29
                { data: "ltops", title: "Tops", visible: false, orderable: false},           // 30
                { data: "lmoves", title: "Moves", visible: false, orderable: false},          // 31
                { data: "lrank", title: "Rank", visible: false, orderable: false},           // 32
                { data: "rscore", title: "Score", visible: false, orderable: false},          // 33
                {
                    data: "rrank",
                    class: "dt-center",
                    render: function (data, type) {
                        if (type === "display") {
                            switch (data) {
                                case 1:
                                    //return `<div class="primary-dark bg-transparent text-wrap style="width: 2rem;"><i class="bi bi-trophy-fill"></i></div>`;
                                    return `<div class="primary-dark bg-transparent text-wrap style="width: 2rem;"><img src="assets/champion.png" class="rounded mx-auto d-block" alt="..."></img></div>`;
                                    
                                    break;
                                case 2:
                                    return `<div class="primary-dark bg-transparent text-wrap style="width: 2rem;"><img src="assets/rumble_second.png" class="rounded mx-auto d-block" alt="..."></img></div>`;
                                    //return `<div class="primary-dark bg-transparent text-wrap style="width: 2rem;"><i class="bi bi-award-fill"></i></div>`;
                                    break;
                                case 3:
                                    return `<div class="primary-dark bg-transparent text-wrap style="width: 2rem;"><img src="assets/rumble_third.png" class="rounded mx-auto d-block" alt="..."></img></div>`;    
                                    //return `<div class="primary-dark bg-transparent text-wrap style="width: 2rem;"><i class="bi bi-award"></i></div>`;
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
                    title: "Rank", visible: false, orderable: false
                },                                          // 34

                

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

            // setting Search Panels
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
                        dt.order([1, 'asc']).draw();
                    }
                },
                {
                    text: 'Speed',
                    action: function ( e, dt, node, config ) {
                        //dt.order([[27, 'desc'],[ 28, 'desc'], [29, 'asc'],[ 30, 'asc']]).draw(); //27 = tops, 28 = zones, 29 top attemts, 30 zone attempts
                        dt.order([24, 'asc']).draw();
                        showHideColumns('speed');
                    },
                    className: 'text-speed'
                },
                {
                    text: 'Boulder',
                    action: function ( e, dt, node, config ) {
                        dt.order([29, 'asc']).draw();
                        showHideColumns('boulder');
                    },
                    className: 'text-boulder'
                },
                {
                    text: 'Lead',
                    action: function ( e, dt, node, config ) {
                        dt.order([32, 'asc']).draw();
                        showHideColumns('lead');
                    },
                    className: 'text-lead'
                },
                {
                    text: 'Rumble',
                    action: function ( e, dt, node, config ) {
                        dt.order([34, 'asc']).draw();
                        showHideColumns('rumble');
                    },
                    className: 'text-rumble'
                },

            ],
            dom: 'rt<"nav nav-fill" <"nav-item" B><"nav-item" i><"nav-item" p> >',
            columnDefs: [
                {
                    searchPanes: {
                        show: true
                    },
                    targets: [3,4] //  3 = genger, 4 = category
                },
                {
                    searchPanes: {
                        show: false
                    },
                    targets: [0,1,2,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]
                },
            ],
            // stateSave: false,
            // stateSaveParams: function (settings, data) {
            //     // if (data.search.search) {
            //     //     console.log( 'Saved filter was: '+data.search.search );
            //     // }
            //     //console.log (data);
            //     console.log (data.searchPanes.selectionList);
            // }          
        });
});



/* default class for buttons 
   https://datatables.net/forums/discussion/comment/149769/#Comment_149769
*/
$.fn.dataTable.Buttons.defaults.dom.button.className = 'btn btn-light';


/* hide and show chosen discipline
*/
function showHideColumns(discipline){

    let table = $('#results').DataTable();

    // hide all results for all disciplines
    for ( var i=23 ; i<35 ; i++ ) {
        table.column(i).visible( false, false );
    }
    
    // display chosen 
    switch(discipline) {
        case "speed":
            table.column(23).visible(true, false);
            table.column(24).visible(true, false);
            break;
        case "boulder":
            table.column(25).visible(true, false);
            table.column(26).visible(true, false);
            table.column(27).visible(true, false);
            table.column(28).visible(true, false);
            table.column(29).visible(true, false);
            break;
        case "lead":
            table.column(30).visible(true, false);
            table.column(31).visible(true, false);
            table.column(32).visible(true, false);            
            break;
        case "rumble":
            table.column(33).visible(true, false);
            table.column(34).visible(true, false);
            break;
    }

    // adjust column sizing and redraw
    table.columns.adjust().draw(false); 


    // table.column( 0 ).visible() === true ? 'visible' : 'not visible'
}

/* default class for pagination
    https://datatables.net/forums/discussion/comment/101733/#Comment_101733
    https://github.com/DataTables/DataTablesSrc/blob/master/js/ext/ext.classes.js#L7
*/
//$.fn.dataTable.ext.classes.sPageButton = 'list-group-item list-group-item-dark';