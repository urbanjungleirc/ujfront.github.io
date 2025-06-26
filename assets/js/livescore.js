/*  Enhanced livescore.js with better category integration and TV display
*/

const setting = { data: {} };
const output = document.querySelector(".output");

// Modal setup
let myModal = new bootstrap.Modal(document.getElementById("modalTimer"), {
    keyboard: false,
});
let modalIsOn = false;
let forceModal = false;

document.getElementById("modalTimer").addEventListener("show.bs.modal", function (event) {
    modalIsOn = true;
});

document.getElementById("modalTimer").addEventListener("hide.bs.modal", function (event) {
    modalIsOn = false;
});

const modalHeader = document.getElementById("modalTimerHeader");
const modalBody = document.getElementById("modalTimerBody");
const modalFooter = document.getElementById("modalTimerFooter");

// Timer instances
let timer = null;
let timerInModal = null;

// Progress bar management
let progressBar = null;
let progressInterval = null;

// Initialize when page loads
$(document).ready(function() {
    progressBar = document.getElementById("refreshProgressBar");
    setupProgressIndicator();
    initializeTimers();
    
    // Start the system
    if (allowModalTimer) {
        readSetting();
        setInterval(() => {
            refreshSettings();
        }, settingRefreshInterval);
    }
});

function setupProgressIndicator() {
    let progress = 0;
    const increment = 100 / (dataRefreshInterval / 1000);
    
    progressInterval = setInterval(() => {
        progress += increment;
        if (progress >= 100) {
            progress = 0;
            refreshData();
        }
        
        if (progressBar) {
            progressBar.style.width = progress + '%';
            progressBar.setAttribute('aria-valuenow', Math.round(progress));
        }
    }, 1000);
}

function initializeTimers() {
    console.log("Initializing countdown timers");
    
    timer = createCountdown(document.querySelector("#timer"), {
        date: catTimeEnd,
        stopOnZero: true,
        update: handleTimerUpdate
    });

    timerInModal = createCountdown(document.querySelector("#timer2"), {
        date: catTimeEnd,
        stopOnZero: true
    });
}

function handleTimerUpdate(event) {
    // 5-minute warning
    if (event.hours == 0 && event.minutes == 5 && event.seconds == 0) {
        myModal.show();
    } 
    // Time up - category ended
    else if (event.hours == 0 && event.minutes == 0 && event.seconds <= 1) {
        console.log("Category time ended - refreshing schedule");
        setTimeout(() => {
            myModal.hide();
            refreshSettings(true); // Force refresh to get new active category
        }, 2000);
    } 
    // Show modal for last 5 minutes
    else if (event.hours == 0 && event.minutes < 5 && !modalIsOn) {
        myModal.show();
    } 
    // Force modal during breaks
    else if (forceModal && !modalIsOn) {
        myModal.show();
    }
}

// Smart refresh functions
function refreshData(force = false) {
    const now = Date.now();
    if (!force && (now - lastDataRefresh) < MIN_REFRESH_GAP) {
        console.log("Data refresh skipped - too soon");
        return;
    }
    
    lastDataRefresh = now;
    if (currentTable) {
        console.log("Refreshing table data");
        currentTable.ajax.reload(function() {
            // Reapply active filter after data refresh
            if (AUTO_FILTER_ACTIVE && activeCategories.length > 0) {
                setTimeout(() => {
                    applyActiveFilter();
                }, 100);
            }
        }, false);
    }
}

function refreshSettings(force = false) {
    const now = Date.now();
    if (!force && (now - lastSettingRefresh) < MIN_REFRESH_GAP) {
        console.log("Settings refresh skipped - too soon");
        return;
    }
    
    lastSettingRefresh = now;
    readSetting();
}

function readSetting() {
    console.log("Loading setting data...");

    const script = document.createElement("script");
    const callbackName = 'jsonpCallback' + Date.now();

    window[callbackName] = function (data) {
        console.log("JSONP Settings Data Received:", data);

        if (data && data.schedule) {
            setting.data = data;
            console.log("Setting Data Updated");
            
            findCurrentNext();
            resetCategory();
            
            // Update active categories for table filtering
            if (typeof updateActiveCategories === 'function') {
                updateActiveCategories(setting.data.schedule);
            }
        } else {
            console.error("Invalid data structure received:", data);
        }

        delete window[callbackName];
        document.body.removeChild(script);
    };

    script.src = `${settingUrl}&callback=${callbackName}`;
    document.body.appendChild(script);
}

// Find Current and Next category
let currentCatID = -1;
let nextCatID = -1;

function findCurrentNext() {
    currentCatID = -1;
    nextCatID = -1;

    if (!setting.data.schedule || !Array.isArray(setting.data.schedule)) {
        console.error("Schedule data is missing or invalid.");
        return;
    }

    const dNow = new Date();
    setting.data.schedule.forEach((category, ind) => {
        if (category !== null && category.name) {
            const compEnd = new Date(category.to);
            const compStart = new Date(category.start);

            if (compStart <= dNow && dNow <= compEnd) {
                currentCatID = ind;
            }
            if (nextCatID == -1 && compStart > dNow) {
                nextCatID = ind;
            }
        }
    });

    console.log(`Current category ID: ${currentCatID}, Next category ID: ${nextCatID}`);
}

function resetCategory() {
    if (!setting.data.schedule || !Array.isArray(setting.data.schedule)) {
        console.error("Schedule data is missing or invalid.");
        return;
    }

    modalHeader.innerText = "";
    modalBody.innerText = "";
    modalFooter.innerText = "";

    let currentTitle = "";
    let bodyTitle = "";
    let nextTitle = "";
    let newDate = new Date();

    if (currentCatID == -1) {
        // Nothing in progress - break time
        forceModal = true;

        if (nextCatID == -1) {
            // Competition completely finished
            currentTitle = "🏆 Competition Complete! 🏆";
            bodyTitle = "Congratulations to all competitors!";
            nextTitle = "Thank you for participating in the Super Social Pumpfest!";
            newDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
        } else {
            // Break between categories
            currentTitle = "Competition Break";
            bodyTitle = `Next up: ${setting.data.schedule[nextCatID].name.toUpperCase()}`;
            newDate = new Date(setting.data.schedule[nextCatID].start);
            nextTitle = "Get ready to climb! 🧗‍♀️🧗‍♂️";
        }
    } else {
        // Competition in progress
        forceModal = false;
        currentTitle = `🧗‍♀️ ${setting.data.schedule[currentCatID].name.toUpperCase()} 🧗‍♂️`;
        bodyTitle = "Time Remaining";
        newDate = new Date(setting.data.schedule[currentCatID].to);

        if (nextCatID == -1) {
            nextTitle = "Final category in progress!";
        } else {
            const nextStart = new Date(setting.data.schedule[nextCatID].start).toLocaleTimeString();
            nextTitle = `Next: ${setting.data.schedule[nextCatID].name.toUpperCase()} at ${nextStart}`;
        }
    }

    console.log(`Modal - Current: ${currentTitle}, Next: ${nextTitle}`);

    // Update modal content
    maker("h1", modalHeader, "text-white", currentTitle);
    maker("h1", modalBody, "text-white", bodyTitle);
    maker("h4", modalFooter, "text-secondary", nextTitle);
    
    // Reset countdown timer
    resetCountDownTimer(newDate);
}

function resetCountDownTimer(newTimeEnd) {
    console.log("Resetting countdown timer to:", newTimeEnd);
    
    // Destroy existing timers
    if (timer) {
        timer.destroy();
    }
    if (timerInModal) {
        timerInModal.destroy();
    }
    
    // Create new timers
    timer = createCountdown(document.querySelector("#timer"), {
        date: newTimeEnd,
        stopOnZero: true,
        update: handleTimerUpdate
    });
    
    timerInModal = createCountdown(document.querySelector("#timer2"), {
        date: newTimeEnd,
        stopOnZero: true
    });
}

// Modern boulder formatting function with unified color and shapes
function boulder(tries = 0, zone = 0, top = 0) {
    // Convert to numbers and handle empty strings
    const triesNum = tries === '' ? 0 : parseInt(tries) || 0;
    const zoneNum = zone === '' ? 0 : parseInt(zone) || 0;
    const topNum = top === '' ? 0 : parseInt(top) || 0;
    
    if (topNum > 0) {
        if (topNum === 1) {
            // Flash (topped on first attempt) - circle with lightning
            return `<div class="boulder-flash"><i class="bi bi-lightning-fill"></i></div>`;
        } else {
            // Topped in X attempts - full rectangle
            return `<div class="boulder-top">${topNum}</div>`;
        }
    } else if (zoneNum > 0) {
        // Zone in X attempts - half-filled rectangle
        return `<div class="boulder-zone">${zoneNum}</div>`;
    } else if (triesNum > 0) {
        // Attempts but no zone or top
        return `<div class="text-muted fw-bold" style="font-size: 0.9em;">${triesNum}</div>`;
    } else {
        // No attempts or empty
        return `<div class="text-black-50">—</div>`;
    }
}

// Helper function to create HTML elements
function maker(tag, parent, cls, html) {
    // Clear parent first
    parent.innerHTML = '';
    
    const el = document.createElement(tag);
    if (cls) {
        el.classList.add(cls);
    }
    el.textContent = html;
    return parent.appendChild(el);
}

// Utility functions for manual refresh (called from buttons)
window.refreshData = refreshData;
window.refreshSettings = refreshSettings;