/*  -------------------------------------
    Default setting
    -------------------------------------
*/
//const scoreUrl = "https://script.google.com/macros/s/AKfycbxscrr-fPwL6d-M1jiA_6YaN-HGZHLDmGmGQ6oIF_Kyh8bPdPMK6W9OMNG8aqfIiIrVTQ/exec"; // public copy data
const scoreUrl = "https://script.google.com/a/macros/urbanjungleirc.com/s/AKfycbyQtX-xInuAc6JwZ-a370PAifWNGD9z4eyRKZj2oTC-5mUOfSmmBYllC5F_wcSMezcZIA/exec" // test data
const rowsPerPage = 10;                         // number of rows per page
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

// //* update width of select element based on the longest value
// let select = document.getElementById("categorySelect");
// let options = select.options;
// let width = 0;
// for (let i = 0; i < options.length; i++) {
//     let optionWidth = options[i].text.length;
//     if (optionWidth > width) {
//         width = optionWidth;
//     }
// }
// select.style.width = (width * 10 + 26) + "px";


/** 
* dataTable setup
*/

// $(document).ready(function () {
//     console.clear();
//     console.log(`Table initialisation start: ${new Date().getTime()}`);
// });

$("#tableMale")
    .on("preXhr.dt", function (e, settings, json, xhr) {
        // fired when an Ajax request is completed
        mySpinner.show();
    })
    .on("xhr.dt", function (e, settings, json, xhr) {
        // fired when an Ajax request is completed
        let el = document.getElementById("updatedAt");
        moment.locale('au');
        el.innerText = moment().format('Do MMM YY, h:mm a'); 
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

        searchCols: [
            { search: `\\bmale\\b`, regex: true },
            null, 
            null,
            null,
            null
        ],

        language: {
            info: "Showing _START_ to _END_ of _TOTAL_ competitors", 
            infoFiltered: "</br>(filtered from a total of _MAX_ participants)", 
            infoEmpty: "No competitors found", 
            lengthMenu: "Display _MENU_ competitors"
        },

        //* paging setup
        lengthChange: true,
        pageLength: rowsPerPage,
        pagingType: "numbers",
        renderer: "bootstrap",

        order: [[2, "asc"]],      

        dom: 'rt<"row row-cols-1 text-center mb-3" <"col mb-0" p><"col text-secondary mb-3" i> <"col" l> >',
        
        
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
    tblMale.DataTable().columns(0).search(`\\b${gender}\\b`, true ).draw();
}

function changeCategory(e) {
    tblMale.DataTable().columns(1).search(`\^\\b${categories[e.value]}\$\\b`, true ).draw();
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
    switch (tick + bonus) {
        case 20:
        case 25:    
            //return `<i class="bi bi-file-break"></i>`;           
            return  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <rect style="stroke:none"
                            id="rect1119"
                            width="10.507964"
                            height="7.2642632"
                            x="2.8761711"
                            y="7.7501478" />
                    </svg>`;
        case 50:
            //return `<i class="bi bi-file-fill"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                    </svg>`;
        case 60:
            if (tick==50) {    
                // tick with bonus
                // return `<i class="bi bi-file-fill"></i>`;
                return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-fill" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
            </svg>`;

            } else {
                // flash without bonus
                // return `<i class="bi bi-lightning-fill"></i>`;
                return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                            <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
                        </svg>`
            }
        case 70:
            // return `<i class="bi bi-lightning-fill"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-lightning-fill" viewBox="0 0 16 16">
                        <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"/>
                    </svg>`
        default:
            //return `<i class="bi bi-file"></i>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-file" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                    </svg>`

    }
}