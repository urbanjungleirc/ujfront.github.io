/*  TV-Optimized Results Page with Smart Filtering and Ranking Display
*/

// Global variables
let currentTable = null;
let allCategories = [];
let showRankings = false;
let currentFilters = {
    category: '',
    gender: ''
};

// Initialize when page loads
$(document).ready(function () {
    console.log(`Results table initialisation start: ${new Date().getTime()}`);
    
    // Setup admin controls
    setupAdminControls();
    
    // Initialize the table
    initializeTable();
});

function setupAdminControls() {
    // Toggle admin panel with animation
    $('#adminToggle').on('click', function(e) {
        console.log("Admin toggle clicked");
        e.stopPropagation();
        const panel = $('#adminPanel');
        
        if (panel.hasClass('show')) {
            console.log("Hiding admin panel");
            panel.removeClass('show');
        } else {
            console.log("Showing admin panel");
            panel.addClass('show');
            // Force a reflow to ensure animation plays
            panel[0].offsetHeight;
        }
    });
    
    // Close admin panel when clicking outside - but not on dropdowns
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.admin-controls').length && 
            !$(e.target).closest('#adminPanel').length &&
            !$(e.target).closest('.modern-select').length) {
            console.log("Closing admin panel - clicked outside");
            $('#adminPanel').removeClass('show');
        }
    });
    
    // Filter change events - prevent event bubbling
    $('#categoryFilter').on('change click', function(e) {
        console.log("Category filter changed:", $(this).val());
        e.stopPropagation();
        e.preventDefault();
        currentFilters.category = $(this).val();
        applyFilters();
    });
    
    $('#genderFilter').on('change click', function(e) {
        console.log("Gender filter changed:", $(this).val());
        e.stopPropagation();
        e.preventDefault();
        currentFilters.gender = $(this).val();
        applyFilters();
    });
    
    // Prevent admin panel from closing when clicking on dropdown elements
    $('#adminPanel').on('click', function(e) {
        e.stopPropagation();
    });
    
    // Specifically handle select dropdowns
    $('#categoryFilter, #genderFilter').on('mousedown focus', function(e) {
        e.stopPropagation();
    });
    
    // Button events
    $('#btnShowRankings').on('click', function() {
        console.log("Show Rankings clicked");
        showRankings = true;
        applyRankingDisplay();
        updateButtonStates();
    });
    
    $('#btnShowNames').on('click', function() {
        console.log("Show Names clicked");
        showRankings = false;
        applyRankingDisplay();
        updateButtonStates();
    });
    
    $('#btnClearFilters').on('click', function() {
        console.log("Clear Filters clicked");
        clearAllFilters();
    });
}

function updateButtonStates() {
    if (showRankings) {
        $('#btnShowRankings').removeClass('btn-outline-primary').addClass('btn-primary');
        $('#btnShowNames').removeClass('btn-primary').addClass('btn-outline-secondary');
    } else {
        $('#btnShowNames').removeClass('btn-outline-secondary').addClass('btn-primary');
        $('#btnShowRankings').removeClass('btn-primary').addClass('btn-outline-primary');
    }
}

function initializeTable() {
    currentTable = $("#results")
        .on("init.dt", function () {
            console.log(`Results table initialisation complete: ${new Date().getTime()}`);
        })
        .on("xhr.dt", function (e, settings, json, xhr) {
            if (json && json.data) {
                populateCategoryFilter(json.data);
                updateCompetitorCounts();
            }
        })
        .DataTable({
            ajax: {
                url: score,
                dataType: "jsonp",
                cache: true,
                dataSrc: "data",
                data: function (d) {
                    d.format = "json";
                },
            },

            lengthChange: false,
            pageLength: rowsPerPage,
            pagingType: "numbers",
            renderer: "bootstrap",

            // Default: Sort by rank to show rankings initially
            order: [[1, "asc"]], // Rank column ascending
            
            columnDefs: [
                { orderable: true, targets: [0] }, // Name column orderable
                { orderable: false, targets: "_all" },
            ],

            columns: [
                { 
                    data: "name", 
                    title: "Climber", 
                    orderable: true,
                    width: "250px"
                },
                {
                    data: "rank",
                    title: "Rank",
                    class: "dt-center",
                    width: "80px",
                    render: function (data, type, row) {
                        console.log("Rank render called:", data, type, showRankings);
                        if (type === "display") {
                            if (!data) {
                                return '<span class="text-muted">-</span>';
                            }
                            
                            const rank = parseInt(data);
                            console.log("Rendering rank:", rank);
                            
                            if (showRankings) {
                                if (rank === 1) {
                                    return `<div style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1em; margin: 0 auto; background: linear-gradient(45deg, #FFD700, #FFA500, #FF8C00); color: #1C121B; border: 3px solid #FFD700; box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); animation: goldPulse 2s ease-in-out infinite alternate;">${rank}</div>`;
                                } else if (rank === 2) {
                                    return `<div style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1em; margin: 0 auto; background: linear-gradient(45deg, #E5E5E5, #C0C0C0, #A8A8A8); color: #1C121B; border: 3px solid #C0C0C0; box-shadow: 0 0 20px rgba(192, 192, 192, 0.6);">${rank}</div>`;
                                } else if (rank === 3) {
                                    return `<div style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1em; margin: 0 auto; background: linear-gradient(45deg, #CD7F32, #B8860B, #A0522D); color: white; border: 3px solid #CD7F32; box-shadow: 0 0 20px rgba(205, 127, 50, 0.6);">${rank}</div>`;
                                } else {
                                    return `<div style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1em; margin: 0 auto; background: linear-gradient(45deg, #999999, #757575); color: white; border: 2px solid #999999;">${rank}</div>`;
                                }
                            } else {
                                return `<span class="fw-bold">${rank}</span>`;
                            }
                        }
                        return data || '';
                    },
                    visible: true,
                },
                { 
                    data: "tops", 
                    title: "Tops", 
                    class: "dt-center",
                    orderable: false,
                    visible: true, // Show by default for testing
                    render: function(data, type) {
                        if (type === "display" && showRankings) {
                            return `<span style="border-radius: 12px; padding: 8px 12px; font-weight: bold; font-size: 1em; background: linear-gradient(45deg, #63a623, #4caf50); color: white; box-shadow: 0 4px 15px rgba(99, 166, 35, 0.4);">${data || 0}</span>`;
                        }
                        return data || 0;
                    }
                },
                { 
                    data: "zones", 
                    title: "Zones", 
                    class: "dt-center",
                    orderable: false,
                    visible: true, // Show by default for testing
                    render: function(data, type) {
                        if (type === "display" && showRankings) {
                            return `<span style="border-radius: 12px; padding: 8px 12px; font-weight: bold; font-size: 1em; background: linear-gradient(45deg, #e7750d, #ff9800); color: #1C121B; box-shadow: 0 4px 15px rgba(231, 117, 13, 0.4);">${data || 0}</span>`;
                        }
                        return data || 0;
                    }
                },
                { 
                    data: "top_attempts", 
                    title: "Top Attempts", 
                    class: "dt-center",
                    orderable: false,
                    visible: true, // Show by default for testing
                    render: function(data, type) {
                        if (type === "display" && showRankings) {
                            return `<span style="border-radius: 12px; padding: 8px 12px; font-weight: bold; font-size: 1em; background: linear-gradient(45deg, #999999, #757575); color: white; box-shadow: 0 4px 15px rgba(153, 153, 153, 0.3);">${data || 0}</span>`;
                        }
                        return data || 0;
                    }
                },
                { 
                    data: "zone_attempts", 
                    title: "Zone Attempts", 
                    class: "dt-center",
                    orderable: false,
                    visible: true, // Show by default for testing
                    render: function(data, type) {
                        if (type === "display" && showRankings) {
                            return `<span style="border-radius: 12px; padding: 8px 12px; font-weight: bold; font-size: 1em; background: linear-gradient(45deg, #999999, #757575); color: white; box-shadow: 0 4px 15px rgba(153, 153, 153, 0.3);">${data || 0}</span>`;
                        }
                        return data || 0;
                    }
                },

                // Hidden columns for filtering
                { data: "category", visible: false },
                { data: "gender", visible: false },
            ],

            initComplete: function (settings, json) {
                console.log("Results DataTables initialized");
                console.log("Data received:", json);
                console.log("showRankings:", showRankings);
                
                updateCompetitorCounts();
                updateButtonStates();
                
                // Force a redraw to ensure rank badges appear
                setTimeout(() => {
                    currentTable.draw(false);
                    console.log("Table redrawn");
                }, 100);
            },

            language: {
                info: "Showing _START_ to _END_ of _TOTAL_ competitors",
                infoEmpty: "No competitors found",
                infoFiltered: "(filtered from _MAX_ total competitors)",
                paginate: {
                    next: "Next",
                    previous: "Previous"
                }
            },

            dom: 'rt<"nav nav-fill mt-2" <"nav-item" i><"nav-item" p> >'
        });
}

function populateCategoryFilter(data) {
    const categories = [...new Set(data.map(item => item.category).filter(cat => cat))];
    allCategories = categories;
    
    const categorySelect = $('#categoryFilter');
    categorySelect.find('option:not(:first)').remove(); // Keep "All Categories" option
    
    categories.forEach(category => {
        categorySelect.append(`<option value="${category}">${category.charAt(0).toUpperCase() + category.slice(1)}</option>`);
    });
}

function applyFilters() {
    if (!currentTable) return;
    
    console.log("Applying filters:", currentFilters);
    
    // Apply category filter
    if (currentFilters.category) {
        currentTable.column(6).search(currentFilters.category, true, false);
    } else {
        currentTable.column(6).search('');
    }
    
    // Apply gender filter
    if (currentFilters.gender) {
        currentTable.column(7).search(currentFilters.gender, true, false);
    } else {
        currentTable.column(7).search('');
    }
    
    currentTable.draw();
    updateFilterDisplay();
    updateCompetitorCounts();
    
    // Auto-show rankings when filtering
    if ((currentFilters.category || currentFilters.gender) && !showRankings) {
        setTimeout(() => {
            showRankings = true;
            applyRankingDisplay();
            updateButtonStates();
        }, 500);
    }
}

function applyRankingDisplay() {
    if (!currentTable) return;
    
    console.log("applyRankingDisplay called, showRankings:", showRankings);
    
    // Show/hide ranking columns
    currentTable.column(1).visible(showRankings); // Rank
    currentTable.column(2).visible(showRankings); // Tops
    currentTable.column(3).visible(showRankings); // Zones
    currentTable.column(4).visible(showRankings); // Top Attempts
    currentTable.column(5).visible(showRankings); // Zone Attempts
    
    // Force redraw to update the render functions
    currentTable.draw(false);
    console.log("Table redrawn with showRankings:", showRankings);
    
    // Change sorting
    if (showRankings) {
        // Sort by rank when showing rankings
        currentTable.order([[1, 'asc']]).draw();
        console.log("Sorted by rank");
    } else {
        // Sort by name when hiding rankings
        currentTable.order([[0, 'asc']]).draw();
        console.log("Sorted by name");
    }
    
    currentTable.columns.adjust();
}

function clearAllFilters() {
    console.log("Clearing all filters");
    
    // Reset filter selects
    $('#categoryFilter').val('');
    $('#genderFilter').val('');
    
    // Reset filter object
    currentFilters = {
        category: '',
        gender: ''
    };
    
    // Clear table filters
    if (currentTable) {
        currentTable.search('').columns().search('').draw();
    }
    
    // Hide rankings and sort by name
    showRankings = false;
    applyRankingDisplay();
    updateButtonStates();
    updateFilterDisplay();
    updateCompetitorCounts();
}

function updateFilterDisplay() {
    const filterDisplay = document.getElementById("filterDisplay");
    if (!filterDisplay) return;
    
    let displayText = "All Competitors";
    const filters = [];
    
    if (currentFilters.category) {
        filters.push(currentFilters.category.charAt(0).toUpperCase() + currentFilters.category.slice(1));
    }
    
    if (currentFilters.gender) {
        filters.push(currentFilters.gender.charAt(0).toUpperCase() + currentFilters.gender.slice(1));
    }
    
    if (filters.length > 0) {
        displayText = filters.join(' • ');
        filterDisplay.style.display = 'inline-block';
    } else {
        filterDisplay.style.display = 'none';
    }
    
    filterDisplay.textContent = displayText;
}

function updateCompetitorCounts() {
    if (!currentTable) return;
    
    const totalDisplay = document.getElementById("totalCompetitorsDisplay");
    const filteredDisplay = document.getElementById("filteredCompetitorsDisplay");
    
    const info = currentTable.page.info();
    
    if (totalDisplay) {
        totalDisplay.textContent = info.recordsTotal;
    }
    
    if (filteredDisplay) {
        filteredDisplay.textContent = info.recordsDisplay;
    }
}

/* Default class for buttons */
$.fn.dataTable.Buttons.defaults.dom.button.className = 'btn';