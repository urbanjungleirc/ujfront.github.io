/*  Using Google Script Api to retrieve JSON data
    how to creat the api with formated json in google script
        youtube: https://www.youtube.com/watch?v=uJDLT8nh2ps
        script: https://docs.google.com/document/d/1tvJzwS7Zu_WeE77rNTnM5Q7leNanR95CnLY5Jc5p0_4/edit
*/

const setting = {data: {}};
const output = document.querySelector('.output');


//* set default timers
let timer = timezz(document.querySelector("#timer"), {
    date: catTimeEnd,
    stopOnZero: true
});

/* Resources:
 https://datatables.net/examples/basic_init/data_rendering.html
 rendering plugins: https://github.com/DataTables/Plugins/tree/master/dataRender
 */


/** 
* dataTable setup
*/
$(document).ready(function () {
    console.log(`Table initialisation start: ${new Date().getTime()}`);

    let tblMale = $("#tableMale")
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

            searchCols: [
                { "search": "Male" },
                null,
                null,
                null,
                null
              ],
            // search: {
            //     search: "Male",
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
							
                { data: "gender", visible: false},
                { data: "category", visible: false },
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
            
            dom: 'rt<"nav nav-fill" <"nav-item" B><"nav-item" i><"nav-item" p> >',
          
        });

    let tblFemale = $("#tableFemale")
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
							
                { data: "gender", visible: false},
                { data: "category", visible: false },
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

            dom: 'rt<"nav nav-fill" <"nav-item" B><"nav-item" i><"nav-item" p> >',
       
        });

});

/* default class for buttons 
   https://datatables.net/forums/discussion/comment/149769/#Comment_149769
*/
$.fn.dataTable.Buttons.defaults.dom.button.className = 'btn btn-light';

/* default class for pagination
    https://datatables.net/forums/discussion/comment/101733/#Comment_101733
    https://github.com/DataTables/DataTablesSrc/blob/master/js/ext/ext.classes.js#L7
*/
//$.fn.dataTable.ext.classes.sPageButton = 'list-group-item list-group-item-dark';