/*  Fixed live_ssp.js with working automatic category filtering
*/

// Global variables
let activeCategories = [];
let currentTable = null;

// Initialize when page loads
$(document).ready(function () {
    console.log(`Table initialisation start: ${new Date().getTime()}`);
    
    // Setup admin controls
    setupAdminControls();
    
    // Initialize the table
    initializeTable();
});

function setupAdminControls() {
    // Toggle admin panel
    $('#adminToggle').on('click', function(e) {
        e.stopPropagation();
        $('#adminPanel').toggleClass('show');
    });
    
    // Close admin panel when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.admin-controls').length) {
            $('#adminPanel').removeClass('show');
        }
    });
    
    // Admin button events
    $('#btnShowActive').on('click', function() {
        applyActiveFilter();
        updateButtonStates('active');
    });
    
    $('#btnShowAll').on('click', function() {
        clearAllFilters();
        updateButtonStates('all');
    });
    
    $('#btnRefreshNow').on('click', function() {
        if (typeof refreshData === 'function') {
            refreshData(true);
        }
        if (typeof refreshSettings === 'function') {
            refreshSettings(true);
        }
    });
}

function updateButtonStates(activeMode) {
    if (activeMode === 'active') {
        $('#btnShowActive').removeClass('btn-outline-primary').addClass('btn-primary');
        $('#btnShowAll').removeClass('btn-primary').addClass('btn-outline-secondary');
    } else {
        $('#btnShowAll').removeClass('btn-outline-secondary').addClass('btn-primary');
        $('#btnShowActive').removeClass('btn-primary').addClass('btn-outline-primary');
    }
}

function initializeTable() {
    currentTable = $("#results")
        .on("init.dt", function () {
            console.log(`Table initialisation complete: ${new Date().getTime()}`);
        })
        .on("xhr.dt", function (e, settings, json, xhr) {   
            updateLastUpdateTime();
            
            // Apply filtering after data loads if we have active categories
            setTimeout(() => {
                if (AUTO_FILTER_ACTIVE && activeCategories.length > 0) {
                    applyActiveFilter();
                }
            }, 100);
        })
        .DataTable({
            ajax: {
                url: scoreUrl,
                dataType: "jsonp",
                cache: false,
                dataSrc: "data",
                data: function (d) {    
                    d.format = "json";
                    d._t = new Date().getTime();
                },
            },      
            lengthChange: false,
            pageLength: rowsPerPage,
            pagingType: "numbers",
            renderer: "bootstrap",
            
            // Order by name (alphabetical) since rank is hidden
            order: [[0, "asc"]], // Name column ascending
            
            columnDefs: [
                { orderable: true, targets: [0] }, // Only name column orderable
                { orderable: false, targets: "_all" },
            ],
            
            columns: [
                { 
                    data: "name", 
                    width: "200px",
                    title: "Climber"
                },
                {
                    data: "rank",
                    class: "dt-center",
                    width: "60px",
                    title: "Rank",
                    render: function (data, type) {
                        // Hide rank column - competitors shouldn't see rankings
                        return '';
                    },
                    visible: false, // Hide rank column completely
                },
                // Boulder columns A-T (20 problems)
                ...Array.from({length: 20}, (_, i) => {
                    const letter = String.fromCharCode(97 + i); // a, b, c, ... t
                    return {
                        data: null,
                        class: "dt-center",
                        width: "50px",
                        orderable: false,
                        title: letter.toUpperCase(),
                        render: function (row) {
                            const tries = row[letter] || '';
                            const zone = row[letter + 'z'] || '';
                            const top = row[letter + 't'] || '';
                            return boulder(tries, zone, top);
                        }
                    };
                }),
                // U and V columns (hidden by default)
                {
                    data: null,
                    class: "dt-center",
                    orderable: false,
                    title: "U",
                    render: function (row) {
                        return boulder(row.u || '', row.uz || '', row.ut || '');
                    },
                    visible: false,
                },
                {
                    data: null,
                    class: "dt-center",
                    orderable: false,
                    title: "V",
                    render: function (row) {
                        return boulder(row.v || '', row.vz || '', row.vt || '');
                    },
                    visible: false,
                },
                {
                    data: null,
                    class: "dt-center",
                    orderable: false,
                    title: "W",
                    render: function (row) {
                        return boulder(row.w || '', row.wz || '', row.wt || '');
                    },
                    visible: false,
                },

                // Hidden columns for filtering and sorting
                { data: "category", visible: false, title: "Category" },
                { data: "gender", visible: false, title: "Gender" },
                { data: "tops", visible: false },
                { data: "zones", visible: false },
                { data: "top_attempts", visible: false },
                { data: "zone_attempts", visible: false },
            ],
            
            initComplete: function (settings, json) {
                console.log("DataTables initialized with data:", json);
                
                // Apply initial filtering if we already have active categories
                if (AUTO_FILTER_ACTIVE && activeCategories.length > 0) {
                    setTimeout(() => {
                        applyActiveFilter();
                    }, 100);
                }

                // Set up page rotation if multiple pages
                setupPageRotation();
            },
            
            language: {
                info: "Showing _START_ to _END_ of _TOTAL_ climbers",
                infoEmpty: "No climbers found",
                infoFiltered: "(filtered from _MAX_ total climbers)",
                paginate: {
                    next: "Next",
                    previous: "Previous"
                }
            },
            
            dom: 'rt<"nav nav-fill mt-2" <"nav-item" i><"nav-item" p> >',
        });

    // Hide the default search box
    const filterElement = document.getElementById("results_filter");
    if (filterElement) {
        filterElement.style.display = "none";
    }
}

function setupPageRotation() {
    const api = currentTable;
    const tableInfo = api.page.info();
    
    if (tableInfo.pages > 1) {
        console.log(`Setting up auto page rotation: ${tableInfo.pages} pages total`);
        let timePerPage = dataRefreshInterval / tableInfo.pages;
        if (timePerPage < minPageDisplay) {
            timePerPage = minPageDisplay;
        }

        // Auto-flip through pages for TV display
        setInterval(function () {
            const currentPageInfo = api.page.info();
            if (currentPageInfo.page == currentPageInfo.pages - 1) {
                // Last page, go back to first
                api.page("first").draw("page");
                console.log("Page rotation: Back to page 1");
            } else {
                // Go to next page
                api.page("next").draw("page");
                console.log(`Page rotation: Moving to page ${currentPageInfo.page + 2}`);
            }
        }, timePerPage);
        
        console.log(`Page will flip every ${timePerPage}ms (${timePerPage/1000}s)`);
    } else {
        console.log("Only one page - no auto rotation needed");
    }
}

/* Function to apply filtering based on active categories */
function applyActiveFilter() {
    if (!currentTable) {
        console.log("Table not initialized yet");
        return;
    }
    
    if (activeCategories.length > 0) {
        console.log("Applying filter for active categories:", activeCategories);
        
        // Create search pattern for category column (case insensitive)
        const searchPattern = activeCategories.map(cat => 
            cat.toString().toLowerCase().trim()
        ).join('|');
        
        // Apply search to category column (index 25)
        currentTable.column(25).search(searchPattern, true, false).draw();
        
        // Update UI
        updateButtonStates('active');
        updateCategoryDisplay();
        updateActiveCategoriesDisplay();
        
        console.log("Filter applied with pattern:", searchPattern);
    } else {
        console.log("No active categories to filter");
        clearAllFilters();
    }
}

function clearAllFilters() {
    if (!currentTable) return;
    
    console.log("Clearing all filters");
    currentTable.search('').columns().search('').draw();
    updateButtonStates('all');
    updateCategoryDisplay();
}

/* Function to update active categories from schedule */
function updateActiveCategories(scheduleData) {
    if (!scheduleData || !Array.isArray(scheduleData)) {
        console.log("No valid schedule data provided");
        return;
    }

    const now = new Date();
    const newActiveCategories = [];

    scheduleData.forEach((category, index) => {
        if (category && category.name && category.start && category.to) {
            const startTime = new Date(category.start);
            const endTime = new Date(category.to);
            
            if (startTime <= now && now <= endTime) {
                newActiveCategories.push(category.name.toString().toLowerCase().trim());
                console.log(`Active category found: ${category.name}`);
            }
        }
    });

    // Update global variable
    const categoriesChanged = JSON.stringify(newActiveCategories.sort()) !== JSON.stringify(activeCategories.sort());
    
    if (categoriesChanged) {
        activeCategories = newActiveCategories;
        console.log("Updated active categories:", activeCategories);
        
        // Apply filtering automatically if enabled
        if (AUTO_FILTER_ACTIVE) {
            setTimeout(() => {
                applyActiveFilter();
            }, 100);
        }
        
        updateActiveCategoriesDisplay();
        updateCategoryDisplay();
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                      now.getMinutes().toString().padStart(2, '0');
    
    const el = document.getElementById("updatedAt");
    if (el) {
        el.textContent = "Last updated: " + timeString;
    }
    
    const adminEl = document.getElementById("lastUpdateDisplay");
    if (adminEl) {
        adminEl.textContent = timeString;
    }
}

function updateActiveCategoriesDisplay() {
    const display = document.getElementById("activeCategoriesDisplay");
    if (display) {
        if (activeCategories.length > 0) {
            display.textContent = activeCategories.map(cat => 
                cat.charAt(0).toUpperCase() + cat.slice(1)
            ).join(', ');
        } else {
            display.textContent = "None active";
        }
    }
}

function updateCategoryDisplay() {
    const display = document.getElementById("currentCategoryDisplay");
    if (display) {
        if (activeCategories.length > 0) {
            const categoryText = activeCategories.map(cat => 
                cat.charAt(0).toUpperCase() + cat.slice(1)
            ).join(', ');
            display.textContent = categoryText;
            display.style.display = 'inline-block';
        } else {
            display.textContent = "All Categories";
            display.style.display = 'inline-block';
        }
    }
}