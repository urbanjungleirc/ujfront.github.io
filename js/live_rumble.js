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
            console.log(
                `Table initialisation complete: ${new Date().getTime()}`
            );
        })
        // .on("xhr.dt", function (e, settings, json, xhr) {
        //     //$("#status").html(json.status);
        //     let el = document.getElementById("updatedAt");
        //     let d = new Date();
        //     el.innerText = " @ " + d.getHours() + ":" + d.getMinutes();
        // })
        .dataTable({
            ajax: {
                url: scoreUrl,
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

            // // search: {
            // //     search: filter,
            // // },

            // // ordering:  false,
            order: [[0, "asc"]],
            rowReorder: true, // allows to re-order
            columnDefs: [
                { orderable: true, className: "reorder", targets: 0 },
                { orderable: false, targets: "_all" }, // disable ordering for columns
            ],
            orderClasses: true, // highlight the columns which are used to order the content

            columns: [
							
                { data: "id", visible: false},
                { data: "name", title: "Name"},
                { data: "bornYear", visible: false},
                { data: "gender", title: "Gender", visible: false},
                { data: "category", title: "Category", visible: false },
                // speed columns
                {
                    data: "s1",
                    class: "dt-body-right dt-head-center",
                    render: function (data, type) {
                        return speed(data, type);
                    },
                    title: "1"
                },
                {
                    data: "s2",
                    class: "dt-body-right dt-head-center",
                    render: function (data, type) {
                        return speed(data, type);
                    },
                    title: "2"
                },
                {
                    data: "s3",
                    class: "dt-body-right dt-head-center",
                    render: function (data, type) {
                        return speed(data, type);
                    },
                    title: "3"
                },
                {
                    data: "s4",
                    class: "dt-body-right dt-head-center",
                    render: function (data, type) {
                        return speed(data, type);
                    },
                    title: "4"
                },
                // Boulder columns
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.a, row.az, row.at);
                    },
                    title: "A"
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.b, row.bz, row.bt);
                    }, 
                    title: "B"
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.c, row.cz, row.ct);
                    }, 
                    title: "C"
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.d, row.dz, row.dt);
                    },
                    title: "D"
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.e, row.ez, row.et);
                    },
                    title: "E"
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.f, row.fz, row.ft);
                    },
                    title: "F"
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.g, row.gz, row.gt);
                    },
                    title: "G"
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.h, row.hz, row.ht);
                    },
                    title: "H"
                },     
                // lead columns
                {
                    data: "l1",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    }, 
                    title: "1"
                },
                {
                    data: "l2",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    },
                    title: "2"
                },
                {
                    data: "l3",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    },
                    title: "3"
                },
                {
                    data: "l4",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    },
                    title: "4"
                },
                {
                    data: "l5",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    },
                    title: "5"
                },
                {
                    data: "l6",
                    class: "dt-center",
                    render: function (data, type) {
                        return lead(data, type);
                    },
                    title: "6"
                },

                { data: "sscore", visible: false},
                { data: "srank", visible: false},
                { data: "btops", visible: false},
                { data: "bzones", visible: false},
                { data: "btopattemtps", visible: false},
                { data: "bzoneattempts", visible: false},
                { data: "brank", visible: false},
                { data: "ltops", visible: false},
                { data: "lmoves", visible: false},
                { data: "lrank", visible: false},
                { data: "rscore", visible: false},
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
                    visible: false
                },

                

            ],

            // initComplete: function () {
            //     // calculate time intervals for the page rotating and updates
            //     let api = this.api();
            //     let tableInfo = api.page.info(); // https://datatables.net/reference/api/page.info()

            //     if (tableInfo.pages > 1) {
            //         // more than one page
            //         let timePerPage = dataRefreshInterval / tableInfo.pages;
            //         if (timePerPage < minPageDisplay) {
            //             dataRefreshInterval = minPageDisplay * tableInfo.pages;
            //             timePerPage = minPageDisplay;
            //         } else {
            //             timePerPage = timePerPage.toFixed();
            //         }

            //         // set interval for flipping pages
            //         setInterval(function () {
            //             if (api.page.info().page == api.page.info().pages - 1) {
            //                 api.page("first").draw("page");
            //             } else {
            //                 api.page("next").draw("page");
            //             }
            //         }, timePerPage);
            //     }

            //     // set interval for data refresh
            //     setInterval(function () {
            //         //console.log("Table refreshed: " + new Date().getTime());
            //         api.ajax.reload();
            //     }, dataRefreshInterval);
            // },

            // // setting Search Panels
            // language: {
            //     searchPanes: {
            //         clearMessage: 'Clear selections',
            //         collapse: {0: 'Filter', _: 'Filters (%d)'}
            //     }
            // },
            // buttons: [
            //     'searchPanes',
            //     // {
            //     //     text: 'Order by Name',
            //     //     action: function ( e, dt, node, config ) {
            //     //         dt.order([0, 'asc']).draw();
            //     //     }
            //     // },
            //     // {
            //     //     text: 'Final ranking',
            //     //     action: function ( e, dt, node, config ) {
            //     //         dt.order([[27, 'desc'],[ 28, 'desc'], [29, 'asc'],[ 30, 'asc']]).draw(); //27 = tops, 28 = zones, 29 top attemts, 30 zone attempts
            //     //     }
            //     // }
            // ],
            // dom: 'Bfrtip',
            // columnDefs: [
            //     {
            //         searchPanes: {
            //             show: true
            //         },
            //         targets: [25,26] // 25 = category, 26 = gender
            //     },
            //     {
            //         searchPanes: {
            //             show: false
            //         },
            //         targets: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,27,28,29,30]
            //     }
            // ]            
        });

    // hide search option
    document.getElementById("results_filter").style.display = "none";
});
