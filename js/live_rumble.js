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

            lengthChange: false,
            pageLength: rowsPerPage,
            pagingType: "numbers",
            renderer: "bootstrap",

            // search: {
            //     search: filter,
            // },

            // ordering:  false,
            order: [[0, "asc"]],
            rowReorder: true, // allows to re-order
            columnDefs: [
                { orderable: true, className: "reorder", targets: 0 },
                { orderable: false, targets: "_all" }, // disable ordering for columns
            ],
            orderClasses: true, // highlight the columns which are used to order the content

            columns: [
                { data: "name"},
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
                { data: "gender", visible: false, title: "Gender" },
                { data: "tops", visible: false },
                { data: "zones", visible: false },
                { data: "top_attempts", visible: false },
                { data: "zone_attempts", visible: false },

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


            // setting Search Panels
            language: {
                searchPanes: {
                    clearMessage: 'Clear selections',
                    collapse: {0: 'Filter', _: 'Filters (%d)'}
                }
            },
            buttons: [
                'searchPanes',
                // {
                //     text: 'Order by Name',
                //     action: function ( e, dt, node, config ) {
                //         dt.order([0, 'asc']).draw();
                //     }
                // },
                // {
                //     text: 'Final ranking',
                //     action: function ( e, dt, node, config ) {
                //         dt.order([[27, 'desc'],[ 28, 'desc'], [29, 'asc'],[ 30, 'asc']]).draw(); //27 = tops, 28 = zones, 29 top attemts, 30 zone attempts
                //     }
                // }
            ],
            dom: 'Bfrtip',
            columnDefs: [
                {
                    searchPanes: {
                        show: true
                    },
                    targets: [25,26] // 25 = category, 26 = gender
                },
                {
                    searchPanes: {
                        show: false
                    },
                    targets: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,27,28,29,30]
                }
            ]            
        });

    // hide search option
    document.getElementById("results_filter").style.display = "none";
});
