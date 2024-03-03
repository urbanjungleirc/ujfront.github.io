/*  -------------------------------------
    Default setting
    -------------------------------------
*/
const scoreUrl = "https://script.google.com/macros/s/AKfycbyQtX-xInuAc6JwZ-a370PAifWNGD9z4eyRKZj2oTC-5mUOfSmmBYllC5F_wcSMezcZIA/exec"; // public copy data
const rowsPerPage = 10;                         // number of rows per page
const categories = ["advanced", "intermediate", "youth", "novice - top rope", "youth - top rope"];
const competitionEndTime = "2024-03-21 19:00";

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


$("#tableMale")
    .on("preXhr.dt", function (e, settings, json, xhr) {
        // fired when an Ajax request is completed
        mySpinner.show();
    })
    .on("xhr.dt", function (e, settings, json, xhr) {
        // fired when an Ajax request is completed
        let el = document.getElementById("updatedAt");
        moment.locale('au');
        el.innerText = moment().format('D MMM YY, HH:mm'); 
        mySpinner.hide();
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
                class: "dt-right",
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
                }, orderable: true, class: "align-middle", title: "#"
            }, 
            { data: "name", title: "Name", orderable: true, class: "align-middle" },
            { data: "score", title: "Score", orderable: true, class: "dt-right align-middle details-control ", 
                render: function (data, type) {
                    if (type === "display") {
                        //return `<a href="#" rel="noopener noreferrer" >${data}</a>`; //class="btn btn-outline-primary"
                        return `<span class="btn btn-sm btn-outline-primary border-0">${data}</span>`; //class="btn btn-outline-primary"
                    }
                    else { return data;}
                } 
            },
            
        ],

        // searchCols: [
        //     { search: `\\bmale\\b`, regex: true },
        //     null, 
        //     null,
        //     null,
        //     null
        // ],

        language: {
            info: "Showing _START_ to _END_ of _TOTAL_ competitors", 
            infoFiltered: "</br>(filtered from a total of _MAX_ participants)", 
            infoEmpty: "No competitors found", 
            lengthMenu: "Display _MENU_ competitors"
        },

        //* paging setup
        lengthChange: true,
        pageLength: rowsPerPage,
        pagingType: "simple_numbers",
        renderer: "bootstrap",

        order: [[2, "asc"]],      

        dom: 'rt<"row row-cols-1 text-center mb-3" <"col mb-0 pe-4" p><"col text-secondary mb-3" i> <"col" l> >',
        
    })

let tblMale = $("#tableMale");

// an event listener for displaying child rows
$("#tableMale").on("click", "td.details-control", function () {
    let tr = $(this).closest("tr");
    let row = tblMale.DataTable().row(tr);
    const bgClass = tr.is('.odd') ? 'odd' : 'even' ;
    
    if (row.child.isShown()) {
        row.child.hide();
        tr.removeClass("shown");
    } else {
        console.log(tr.c)
        row.child(sends(row.data()),bgClass).show();
        tr.addClass("shown");
    }
});


function refreshData() {
    tblMale.DataTable().ajax.reload();
}

function changeGender(gender) {
    if (gender) {
        tblMale.DataTable().columns(0).search(`\\b${gender}\\b`, true ).draw();
    } 
    else {
        tblMale.DataTable().columns(0).search("").draw();
    }
}

function changeCategory(e) {
    switch (e.value) {
        case 'tr':
            tblMale.DataTable().columns(1).search(`\\brope\\b`, true ).draw();
            break;
        case 'lead':
            tblMale.DataTable().columns(1).search(`\^\\b(advanced|intermediate|youth)\$\\b`, true ).draw();
            break;
        default:
            tblMale.DataTable().columns(1).search(`\^\\b${categories[e.value]}\$\\b`, true ).draw();
    }
    
}


/* default class for buttons 
   https://datatables.net/forums/discussion/comment/149769/#Comment_149769
*/
$.fn.dataTable.Buttons.defaults.dom.button.className = 'btn';


//* helper functions/objects

function sends(row) {
    const routes = ["a", "b", "c", "d"];
    let ticks = "";

    for (i=1; i<5;i++) {
        ticks = `${ticks}<div class="col text-round${i}" >`;
        for (const element of routes) {
            ticks = ticks + tickIcon (row['r' + i + '_' + element], row['r' + i + '_' + element + '_bonus']); // row.r1_a + row.r1_a_bonus
        }
        ticks = ticks + '</div>';
    }

    return ` <div class="row row-cols-4 text-center g-0">
                <div class="col">R1</div>
                <div class="col">R2</div>
                <div class="col">R3</div>
                <div class="col">R4</div>
            </div>
            <div class="row row-cols-4 text-center g-0">${ticks}</div>`;
    

}

function tickIcon (tick=0, bonus=0) {
    // a plus under:    <path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z" />
    // a dot under:     <circle cx="8" cy="18" r="2"  />
    switch (tick + bonus) {
        case 20: // first zone
            return  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke:none" id="rect1119" width="10.508" height="4.2642632" x="2.8761711" y="10.7501478" />
                    </svg>`;
        case 25: // first zone with a bonus
            return  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke:none" id="rect1119" width="10.508" height="4.2642632" x="2.8761711" y="10.7501478" />
                        <path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z" />
                    </svg>`;
        case 30: // second zone
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke: none;" id="rect1119" width="10.508" height="9.106" x="2.876" y="5.908"/>
                    </svg>`        
        case 35: // second zone with a bonus
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke: none;" id="rect1119" width="10.508" height="9.106" x="2.876" y="5.908"/>
                        <path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z" />
                    </svg>`        
        case 50: // top
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                    </svg>`;
        case 60:
            if (tick==50) {    
                // top with bonus
                 return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                            <path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z" />
                        </svg>`;
            } else {
                // flash
                 return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                            <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
                        </svg>`
            }
        case 70: // flash with a bonus
             return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                        <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
                        <path d="m6,17.38l1.29,0l0,-1.28l1.33,0l0,1.28l1.29,0l0,1.31l-1.29,0l0,1.28l-1.33,0l0,-1.28l-1.29,0z" />
                    </svg>`
        default: // no score
             return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                    </svg>`

    }
}