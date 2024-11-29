/*  Using Google Script Api to retrieve JSON data
    how to creat the api with formated json in google script
        youtube: https://www.youtube.com/watch?v=uJDLT8nh2ps
        script: https://docs.google.com/document/d/1tvJzwS7Zu_WeE77rNTnM5Q7leNanR95CnLY5Jc5p0_4/edit
*/

const setting = {data: {}};
const output = document.querySelector('.output');

// setting up Modal element
let myModal = new bootstrap.Modal(document.getElementById('modalTimer'), {
    keyboard: false
  });
let modalIsOn = false;
let forceModal = false;
document.getElementById('modalTimer').addEventListener("show.bs.modal", function(event) {
    modalIsOn = true; 
});
document.getElementById('modalTimer').addEventListener("hide.bs.modal", function(event) {
    modalIsOn = false; 
});
const modalHeader = document.getElementById('modalTimerHeader');
const modalBody = document.getElementById('modalTimerBody');
const modalFooter = document.getElementById('modalTimerFooter');
  
//* set default timers
let timer = timezz(document.querySelector("#timer"), {
    date: catTimeEnd,
    stopOnZero: true
});
let timerInModal = timezz(document.querySelector("#timer2"), {
    date: catTimeEnd,
    stopOnZero: true
});

// read data from setting sheet and iniciate Modal/timer
if (allowModalTimer) {
    readSetting();
}
function readSetting(){
    //output.innerHTML = 'loading setting...';
    console.log("loading setting data...");
    // fetch (settingUrl)  
    // .then (res => res.json())
    // .then (data => {
    //     console.log (data);
    //     setting.data = data;
    //     //outputData();
    //     findCurrentNext();
    //     resetCategory();
    // })

    const proxyUrl = "https://cors-anywhere.herokuapp.com/"; // Public proxy
    const targetUrl = settingUrl;

    fetch(proxyUrl + targetUrl)
        .then((res) => res.json())
        .then((data) => {
            console.log(data);  
            setting.data = data; // Update your settings object
            findCurrentNext();   // Call your custom function
            resetCategory();     // Call your custom function
        })
        .catch((error) => console.error("Error loading settings:", error));


}

// find Current and Next category
let currentCatID = -1;
let nextCatID = -1;
function findCurrentNext() {
    currentCatID = -1;
    nextCatID = -1;
    const dNow = new Date();
    setting.data.schedule.forEach((category,ind) => {
        if (category){
            const compEnd = new Date(category.to);
            const compStart = new Date(category.start);
            if (compStart.valueOf() <= dNow.valueOf() && dNow.valueOf() <= compEnd.valueOf()) {
                currentCatID = ind;
            }
            if (nextCatID == -1 ) {
                if (compStart.valueOf() > dNow.valueOf()){nextCatID = ind;}
            }
            console.log (`ID ${ind} - ${currentCatID} / ${nextCatID}`);
        }
    })
    console.log (`findCurrentNext() -> current category: ${currentCatID} next: ${nextCatID}`);
}

function resetCategory() {
    //myModal.show();
    modalHeader.innerText = '';
    modalBody.innerText = '';
    modalFooter.innerText = '';
    let currentTitle = '';
    let bodyTitle = '';
    let nextTitle = '';
    let newDate = new Date();
    if (currentCatID == -1 ) {
        // nothing in progress
        forceModal = true;
        if ( nextCatID == -1 ) {
            // competition finished, display Congratulation to all competitors
            currentTitle = 'Congratulations to all competitors!';
            bodyTitle = 'Well done to everyone for participating.';
            nextTitle = 'Stay tuned for future events from UJ Team!';
            newDate = new Date();
        } else {
            // a break between a categories - display what is next up and count down to the start of it
            currentTitle = 'Competition break, next category';
            bodyTitle = setting.data.schedule[nextCatID].name.toLocaleUpperCase();
            newDate = new Date(setting.data.schedule[nextCatID].start);
            nextTitle = 'Warm up and prepare to give it your best!';
        }
    } else {
        // comp in progress
        forceModal = false;
        currentTitle = setting.data.schedule[currentCatID].name.toLocaleUpperCase();
        bodyTitle = 'Time left';
        newDate = new Date(setting.data.schedule[currentCatID].to);
        if (nextCatID == -1) {
            // this is the last category, hide what is next up
            nextTitle = '';
        } else {
            // display what is next
            const nextStart = new Date(setting.data.schedule[nextCatID].start).toLocaleTimeString();
            nextTitle = `Next category ${setting.data.schedule[nextCatID].name.toLocaleUpperCase()} at ${nextStart}`;
        } 
    }
    console.log(`resetCategory() -> currentTitle: ${currentTitle}, nextTitle: ${nextTitle}`);
    maker('h1', modalHeader, 'text-white',currentTitle );
    maker('h1', modalBody, 'text-white',bodyTitle);
    maker('h4', modalFooter, 'text-secondary',nextTitle);  
    resetCountDownTimer (newDate);
}

function resetCountDownTimer(newTimeEnd) {
    timerInModal.destroy();
    timerInModal = timezz(document.querySelector("#timer2"), {
        date: newTimeEnd,
        stopOnZero: true
    });
    timer.destroy();
    //console.log('timer destroyed');
    timer = timezz(document.querySelector("#timer"), {
        date: newTimeEnd,
        stopOnZero: true,
        beforeUpdate(){},
        update(event) { // properties: days, minutes, seconds, distance 
            // console.log (event);
            if (event.hours == 0 && event.minutes == 5 && event.seconds == 0) {
                // display Modal countdown for last 5 mins
                myModal.show();
            } else if (event.hours == 0 && event.minutes == 0 && event.seconds == 1) {
                // display Modal countdown for Time break
                timer.pause = true;
                delay();
                myModal.hide();
                readSetting();
            } else if (event.hours == 0 && event.minutes < 5 && modalIsOn == false ){
                // display Modal if 5 last minutes for the comp and it's not displayed yet
                myModal.show();
            } else if (forceModal) {
                // forcing displaying the Modal for break time
                myModal.show();
            }
        }
    });
}


// formating speed results
function speed(data, type) {
    var number = $.fn.dataTable.render.number(",", ".", 3).display(data);

    if (type === "display") {
        let fclasses = "";
        if (data > 0) {
            if (data < 6) {
                fclasses = "text-speed fw-bold";
            } else if (data < 10) {
                fclasses = "text-primary";
            }
        }
        return `<span class="${fclasses}">${number}</span>`;
    }
    return number;
}

// highligt the fastest time on speed
function comparedSpeed(active, other1, other2, other3) {

    if (active) {
        let fclasses = "";
        if (isNaN(active)) {
            //return active.toUpperCase();
            return active;
        } else {
            //console.log(`comparing ${active} and ${other1} and ${other2} and ${other3}`);
            // compare & format
            let time1 = typeof other1 == "string" ? 300 : other1;
            let time2 = typeof other2 == "string" ? 300 : other2;
            let time3 = typeof other3 == "string" ? 300 : other3;
            const fastest = Math.min(active, time1, time2, time3);
            const number = $.fn.dataTable.render.number(",", ".", 3).display(active);
            if (active == fastest) {
                fclasses = "text-speed fw-bold";    
            }
            return `<span class="${fclasses}">${number}</span>`;
        }        
    } else {
        return "";
    } 

    
}


// formating lead results
function lead(data, type) {
    if (type === "display") {
        if (data == 30) {
            // flash
            return `<div class="text-lead bg-transparent style="width: 2rem;"><i class="bi bi-lightning-fill"></i></div>`;
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
            // flash
            return `<div class="text-boulder style="width: 2rem;"><i class="bi bi-lightning-fill"></i></div>`;
        } else {
            // topped in X attempts
            return `<div class="badge bg-boulder text-white pt-4 fs-5" style="width: 3rem;">${top}</div>`;
        }
    } else if (zone > 0) {
        // zone in X attempts
        return `<div class="badge bg-dark bg-opacity-50 text-white pt-2 fs-5" style="width: 2.9rem;">${zone}</div>`;
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

function resolveAfter1Second(x) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(x);
      }, 1000);
    });
  }
async function delay() {
    const x = await resolveAfter1Second(10);
    console.log(x); // 10
  }



/*  Not in use - for testing purpose only 
*   -----------------------------------------
*/


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


function resetProgress(max) {
    let el = document.getElementById("updateProgressBar");
    //console.log(el.ariaValueMax); // 7
    el.ariaValueMax = max;
    el.ariaValueMin = 0;
    el.ariaValueNow = 0;
    //console.log(el.ariaValueMax); // 6
}

function resetCategoryOld() {
    //myModal.show();
    modalHeader.innerText = '';
    modalBody.innerText = '';
    modalHeader.innerText = '';
    let currentTitle = '';
    let bodyTitle = '';
    let nextTitle = '';
    let newDate = new Date();
    if (setting.data.inProgress[0][2] == "") {
        // nothing in progress
        forceModal = true;
        if (setting.data.nextUp[0][2] == "") {
            // competition finished, display Congratulation to all competitors
            currentTitle = 'The competition is over :(';
            bodyTitle = 'Well done all and thx for coming';
            newDate = new Date();
            nextTitle = 'UJ Team';
        } else {
            // display what is next up and count down to the start of it
            currentTitle = 'Competition break, next category';
            bodyTitle = setting.data.nextUp[0][2].toLocaleUpperCase();
            newDate = new Date(setting.data.nextUp[0][0]);
            nextTitle = 'Send hard, try harder and HAVE FUN';
        }
    } else {
        // comp in progress
        forceModal = false;
        currentTitle = setting.data.inProgress[0][2].toLocaleUpperCase();
        bodyTitle = 'Time left';
        newDate = new Date(setting.data.inProgress[0][1]);
        if (setting.data.nextUp[0][2] == "") {
            // this is the last category, hide what is next up
            nextTitle = '';
        } else {
            // display what is next
            const nextStart = new Date(setting.data.nextUp[0][0]).toLocaleTimeString();
            nextTitle = `Next category ${setting.data.nextUp[0][2].toLocaleUpperCase()} at ${nextStart}`;
        } 
    }
    maker('h1', modalHeader, 'text-white',currentTitle );
    maker('h1', modalBody, 'text-white',bodyTitle);
    maker('h4', modalFooter, 'text-secondary',nextTitle);  
    resetCountDownTimer (newDate);
}


/* Resources:

 https://datatables.net/examples/basic_init/data_rendering.html
 rendering plugins: https://github.com/DataTables/Plugins/tree/master/dataRender
 */
