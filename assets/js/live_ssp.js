/*  Fixed live_ssp.js with working automatic category filtering for multiple categories
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
                // Boulder columns A-T (21 problems)
                ...Array.from({length: 21}, (_, i) => {
                    const letter = String.fromCharCode(97 + i); // a, b, c, ... t, u
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

/* FIXED: Function to apply filtering - handle comma-separated categories correctly */
function applyActiveFilter() {
    if (!currentTable) {
        console.log("Table not initialized yet");
        return;
    }
    
    if (activeCategories.length > 0) {
        console.log("Applying filter for active categories:", activeCategories);
        
        // Handle categories that might be comma-separated strings
        const allCategoryVariants = [];
        activeCategories.forEach(cat => {
            const catStr = cat.toString().trim();
            // Add the full category string
            allCategoryVariants.push(catStr.toLowerCase());
            
            // If it contains commas, also add individual parts
            if (catStr.includes(',')) {
                const parts = catStr.split(',').map(part => part.trim().toLowerCase());
                allCategoryVariants.push(...parts);
            }
        });
        
        // Remove duplicates and create regex pattern
        const uniqueCategories = [...new Set(allCategoryVariants)];
        const searchPattern = uniqueCategories.map(cat => {
            // Escape special regex characters
            return cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('|');
        
        console.log("All category variants:", uniqueCategories);
        console.log("Search pattern:", searchPattern);
        
        // Apply search to category column (index 25) with regex enabled and case-insensitive
        currentTable.column(25).search(searchPattern, true, false, false).draw();
        
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

/* UPDATED: Function to update active categories with consistent case handling */
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
                // Store original case but normalize for comparison
                const originalName = category.name.toString().trim();
                newActiveCategories.push(originalName);
                console.log(`Active category found: ${originalName}`);
            }
        }
    });

    // Compare normalized versions for change detection
    const normalizedNew = newActiveCategories.map(cat => cat.toLowerCase()).sort();
    const normalizedCurrent = activeCategories.map(cat => cat.toLowerCase()).sort();
    const categoriesChanged = JSON.stringify(normalizedNew) !== JSON.stringify(normalizedCurrent);
    
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
            // FIXED: Display categories in proper capitalization
            display.textContent = activeCategories.map(cat => 
                cat.charAt(0).toUpperCase() + cat.slice(1)
            ).join(', ');
        } else {
            display.textContent = "None active";
        }
    }
}

/* UPDATED: Display function to handle comma-separated categories properly */
function updateCategoryDisplay() {
    const display = document.getElementById("currentCategoryDisplay");
    if (display) {
        if (activeCategories.length > 0) {
            // Handle comma-separated category strings and convert to uppercase
            const categoryText = activeCategories.map(cat => {
                const catStr = cat.toString().trim();
                // If it contains commas, split and format each part
                if (catStr.includes(',')) {
                    return catStr.split(',').map(part => part.trim().toUpperCase()).join(' • ');
                } else {
                    return catStr.toUpperCase();
                }
            }).join(' • ');
            
            display.textContent = categoryText;
            display.style.display = 'inline-block';
        } else {
            display.textContent = "ALL CATEGORIES";
            display.style.display = 'inline-block';
        }
    }
}