/*  Using Google Script Api to retrieve JSON data
    how to creat the api with formated json in google script
        youtube: https://www.youtube.com/watch?v=uJDLT8nh2ps
        script: https://docs.google.com/document/d/1tvJzwS7Zu_WeE77rNTnM5Q7leNanR95CnLY5Jc5p0_4/edit
*/

const setting = {data: {}};
const output = document.querySelector('.output');
let myModal = new bootstrap.Modal(document.getElementById('modalTimer'), {
    keyboard: false
  });
const modalHeader = document.getElementById('modalTimerHeader');
const modalBody = document.getElementById('modalTimerBody');
const modalFooter = document.getElementById('modalTimerFooter');
  
//* set pumpfest count down
let timer = timezz(document.querySelector("#timer"), {
    date: catTimeEnd,
    stopOnZero: true
});
let timerInModal = timezz(document.querySelector("#timer2"), {
    date: catTimeEnd,
    stopOnZero: true
});

readSetting();
function readSetting(){
    //output.innerHTML = 'loading setting...';
    fetch (settingUrl)
    .then (res => res.json())
    .then (data => {
        console.log (data);
        setting.data = data;
        //outputData();
        resetCategory();
    })
}

// for testing purpose only
function outputData() {
    output.innerHTML = '';
    const el = maker('h2', output, 'text-primary','In progress:');
    maker('span',el,'text-secondary',setting.data.inProgress[0][2]);
    maker('span',output,'text-secondary',`next up: ${setting.data.nextUp[0][2]}`);
    maker('h3',output,'comp','schedule:');
    const list = maker('ul',output,'list','');
    setting.data.schedule.forEach(category => {
        console.log (category);
        if (category){ 
            const compEnd = new Date(category.to).toLocaleTimeString();
            const compStart = new Date(category.start).toLocaleTimeString();
            const val = maker('li',list,'value',`${category.name} from ${compStart} till ${compEnd}`);
        }
    })
}

function resetCategory() {
    myModal.show();
    modalHeader.innerText = '';
    modalBody.innerText = '';
    modalHeader.innerText = '';
    let currentTitle = ''
    let bodyTitle = '';
    let nextTitle = '';
    let newDate = new Date();

    if (setting.data.inProgress[0][2] == "") {
        // nothing in progress
        if (setting.data.nextUp[0][2] == "") {
            // competition finished, display Congratulation to all competitors
            currentTitle = 'Congratulation to all participants'
            bodyTitle = 'The competition is over';
            nextTitle = 'Stay fit';
            newDate = new Date();
        } else {
            // display what is next up and count down to the start of it
            currentTitle = 'Competition break, next up'
            bodyTitle = setting.data.nextUp[0][2];
            newDate = new Date(setting.data.nextUp[0][0]);
            nextTitle = 'Stay fit';
        }
    } else {
        // comp in progress
        currentTitle = `in progress: ${setting.data.inProgress[0][2]}`
        bodyTitle = 'Time left';
        newDate = new Date(setting.data.inProgress[0][1]);
        if (setting.data.nextUp[0][2] == "") {
            // this is the last category, hide what is next up
            nextTitle = '';
        } else {
            // display what is next
            const nextStart = new Date(setting.data.nextUp[0][0]).toLocaleTimeString();
            nextTitle = `Next up at ${nextStart}: ${setting.data.nextUp[0][2]}`;
        }
    }
    maker('h1', modalHeader, 'text-primary',currentTitle );
    maker('h1', modalBody, 'text-primary',bodyTitle);
    maker('h4', modalFooter, 'text-primary',nextTitle);  
    resetCountDownTimer (newDate);
}

// iniciate timer reset & modal message 
// timer.update = (event) => {
//     // properties: days, minutes, seconds, distance 
//     console.log (event);
//     if (event.hours == 0 && event.minutes == 5 && event.seconds == 0) {
//         console.log('5 mins left -> display the modal box');
//         console.log (event);
//         myModal.show();
//     } else if (event.distance === 0 || event.distance === 300000 ) {
//         console.log('distance in timer = 0 -> call resetCategory & hide modal');
//         myModal.hide();
//         resetCategory();
//     }
// };


function resetCountDownTimer(newTimeEnd) {
    timer.destroy();
    //console.log('timer destroyed');
    timer = timezz(document.querySelector("#timer"), {
        date: newTimeEnd,
        stopOnZero: true,
        update(event) {
            // properties: days, minutes, seconds, distance 
            // console.log (event);
            if (event.hours == 0 && event.minutes == 5 && event.seconds == 0) {
                console.log('5 mins left -> display the modal box');
                //console.log (event);
                myModal.show();
            } else if (event.hours == 0 && event.minutes == 0 && event.seconds == 1) {
                console.log('distance in timer = 0 -> call resetCategory & hide modal');
                myModal.hide();
                resetCategory();
        }}
    });
    timerInModal.destroy();
    timerInModal = timezz(document.querySelector("#timer2"), {
        date: newTimeEnd,
        stopOnZero: true
    });
}


//* set the table
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
                    data: "rank",
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
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.i, row.iz, row.it);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.j, row.jz, row.jt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.k, row.kz, row.kt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.l, row.lz, row.lt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.m, row.mz, row.mt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.n, row.nz, row.nt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.o, row.oz, row.ot);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.p, row.pz, row.pt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.q, row.qz, row.qt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.r, row.rz, row.rt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.s, row.sz, row.st);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.t, row.tz, row.tt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.u, row.uz, row.ut);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.v, row.vz, row.vt);
                    },
                },
                {
                    data: null,
                    class: "dt-center",
                    render: function (row) {
                        return boulder(row.w, row.wz, row.wt);
                    },
                },

                // hidden columns
                { data: "category", visible: false, title: "Category" },
                { data: "gender", visible: false, title: "Gender" },
                { data: "tops", visible: false },
                { data: "zones", visible: false },
                { data: "top_attempts", visible: false },
                { data: "zone_attempts", visible: false },
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
                    api.ajax.reload(null, false);
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

// formating speed results
function speed(data, type) {
    var number = $.fn.dataTable.render.number(",", ".", 3).display(data);

    if (type === "display") {
        let fclasses = "";
        if (data > 0) {
            if (data < 6) {
                fclasses = "text-primary fw-bold";
            } else if (data < 10) {
                fclasses = "text-primary";
            }
        }
        return `<span class="${fclasses}">${number}</span>`;
    }
    return number;
}

// formating lead results
function leed(data, type) {
    if (type === "display") {
        if (data == 99) {
            return `<div class="primary-dark bg-transparent style="width: 2rem;"><i class="bi bi-lightning-fill"></i></div>`;
        } else {
            return `<span class="primary-dark bg-transparent">${data}</span>`;
        }
    }
    return data;
}

// formating boulder results
function boulder(tries = 0, zone = 0, top = 0) {
    if (top > 0) {
        if (top == 1) {
            return `<div class="text-secondary  style="width: 2rem;"><i class="bi bi-lightning-fill"></i></div>`;
        } else {
            return `<div class="badge bg-secondary pt-4 fs-5" style="width: 3rem;">${top}</div>`;
        }
    } else if (zone > 0) {
        return `<div class="badge secondary-light text-white pt-2 fs-5" style="width: 2.9rem;">${zone}</div>`;
    } else {
        // return `<div class="badge bg-transparent text-dark text-wrap pt-2" style="width: 2rem;">${tries}</div>`;
        return `<div class="bg-transparent secondary-dark fs-5 fw-semibold">${tries}</div>`;
    }
}

/* Helper functions --------------------------------------------------------------*/

// create & return new html elements
function maker(tag, parent, cls, html) {
    const el = document.createElement(tag);
    el.classList.add(cls);
    el.textContent = html;
    return parent.appendChild(el);
}

function resetProgress(max) {
    let el = document.getElementById("updateProgressBar");
    //console.log(el.ariaValueMax); // 7
    el.ariaValueMax = max;
    el.ariaValueMin = 0;
    el.ariaValueNow = 0;
    //console.log(el.ariaValueMax); // 6
}

/* Resources:

 https://datatables.net/examples/basic_init/data_rendering.html
 rendering plugins: https://github.com/DataTables/Plugins/tree/master/dataRender
 */
