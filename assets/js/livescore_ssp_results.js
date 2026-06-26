/*  TV-Optimized Results Page with Smart Filtering and Ranking Display
*/

/*  Pure helpers for filter search strings (unit-tested under Node).
    Keep these free of jQuery/DataTables references so the file can be required in tests. */
function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAnchoredRegex(values) {
    if (!values || values.length === 0) return '';
    return '^(' + values.map(escapeRegex).join('|') + ')$';
}

// Global variables
let currentTable = null;
let allCategories = [];
let showRankings = false;
let currentFilters = {
    categories: [],
    genders: []
};

// Initialize when page loads (browser only; skipped when required under Node for tests)
if (typeof window !== 'undefined' && typeof window.jQuery !== 'undefined') {
    jQuery(function () {
        console.log(`Results table initialisation start: ${new Date().getTime()}`);

        // Setup admin controls
        setupAdminControls();

        // Initialize the table
        initializeTable();
    });
}

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
            !$(e.target).closest('.modern-select').length &&
            !$(e.target).closest('.cat-combo').length) {
            console.log("Closing admin panel - clicked outside");
            $('#adminPanel').removeClass('show');
        }
    });
    
    // Category combo: toggle the menu open/closed
    $('#categoryComboTrigger').on('click', function(e) {
        e.stopPropagation();
        const menu = document.getElementById('categoryComboMenu');
        const open = menu.hidden;
        menu.hidden = !open;
        $(this).attr('aria-expanded', open ? 'true' : 'false');
    });

    // Category combo: checkbox toggles a category (event-delegated; options are injected later)
    $('#categoryComboMenu').on('change', 'input[type="checkbox"]', function(e) {
        e.stopPropagation();
        const value = this.value;
        if (this.checked) {
            if (!currentFilters.categories.includes(value)) {
                currentFilters.categories.push(value);
            }
        } else {
            currentFilters.categories = currentFilters.categories.filter(c => c !== value);
        }
        updateCategoryTriggerLabel();
        applyFilters();
    });

    // Gender combo: toggle the menu open/closed
    $('#genderComboTrigger').on('click', function(e) {
        e.stopPropagation();
        const menu = document.getElementById('genderComboMenu');
        const open = menu.hidden;
        menu.hidden = !open;
        $(this).attr('aria-expanded', open ? 'true' : 'false');
    });

    // Gender combo: checkbox toggles a gender (event-delegated; options are injected later)
    $('#genderComboMenu').on('change', 'input[type="checkbox"]', function(e) {
        e.stopPropagation();
        const value = this.value;
        if (this.checked) {
            if (!currentFilters.genders.includes(value)) {
                currentFilters.genders.push(value);
            }
        } else {
            currentFilters.genders = currentFilters.genders.filter(g => g !== value);
        }
        updateGenderTriggerLabel();
        applyFilters();
    });

    // Keep clicks inside either combo from bubbling up and closing the admin panel
    $('#categoryCombo, #genderCombo').on('click', function(e) {
        e.stopPropagation();
    });

    // Prevent admin panel from closing when clicking on dropdown elements
    $('#adminPanel').on('click', function(e) {
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
                populateGenderFilter(json.data);
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
                            
                            // if (showRankings) {
                                if (rank === 1) {
                                    return `<div style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1em; margin: 0 auto; background: linear-gradient(45deg, #FFD700, #FFA500, #FF8C00); color: #1C121B; border: 3px solid #FFD700; box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); animation: goldPulse 2s ease-in-out infinite alternate;">${rank}</div>`;
                                } else if (rank === 2) {
                                    return `<div style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1em; margin: 0 auto; background: linear-gradient(45deg, #E5E5E5, #C0C0C0, #A8A8A8); color: #1C121B; border: 3px solid #C0C0C0; box-shadow: 0 0 20px rgba(192, 192, 192, 0.6);">${rank}</div>`;
                                } else if (rank === 3) {
                                    return `<div style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1em; margin: 0 auto; background: linear-gradient(45deg, #CD7F32, #B8860B, #A0522D); color: white; border: 3px solid #CD7F32; box-shadow: 0 0 20px rgba(205, 127, 50, 0.6);">${rank}</div>`;
                                } else {
                                    return `<div style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1em; margin: 0 auto; color: #999999; border: 2px solid #999999;">${rank}</div>`;
                                }
                            // } else {
                            //     return `<span class="fw-bold">${rank}</span>`;
                            // }
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
    renderCategoryOptions(categories);
}

function renderCategoryOptions(categories) {
    const menu = document.getElementById('categoryComboMenu');
    if (!menu) return;
    menu.innerHTML = '';
    categories.forEach(category => {
        const label = document.createElement('label');
        label.className = 'cat-combo-option';
        const checked = currentFilters.categories.includes(category) ? 'checked' : '';
        const display = category.charAt(0).toUpperCase() + category.slice(1);
        label.innerHTML = `<input type="checkbox" value="${category}" ${checked}><span>${display}</span>`;
        menu.appendChild(label);
    });
    updateCategoryTriggerLabel();
}

function updateCategoryTriggerLabel() {
    const labelEl = document.getElementById('categoryComboLabel');
    if (!labelEl) return;
    const n = currentFilters.categories.length;
    if (n === 0) {
        labelEl.textContent = 'All categories';
    } else if (n === 1) {
        const c = currentFilters.categories[0];
        labelEl.textContent = c.charAt(0).toUpperCase() + c.slice(1);
    } else {
        labelEl.textContent = `${n} categories`;
    }
}

function populateGenderFilter(data) {
    const genders = [...new Set(data.map(item => item.gender).filter(g => g))];
    renderGenderOptions(genders);
}

function renderGenderOptions(genders) {
    const menu = document.getElementById('genderComboMenu');
    if (!menu) return;
    menu.innerHTML = '';
    genders.forEach(gender => {
        const label = document.createElement('label');
        label.className = 'cat-combo-option';
        const checked = currentFilters.genders.includes(gender) ? 'checked' : '';
        const display = gender.charAt(0).toUpperCase() + gender.slice(1);
        label.innerHTML = `<input type="checkbox" value="${gender}" ${checked}><span>${display}</span>`;
        menu.appendChild(label);
    });
    updateGenderTriggerLabel();
}

function updateGenderTriggerLabel() {
    const labelEl = document.getElementById('genderComboLabel');
    if (!labelEl) return;
    const n = currentFilters.genders.length;
    if (n === 0) {
        labelEl.textContent = 'All genders';
    } else if (n === 1) {
        const g = currentFilters.genders[0];
        labelEl.textContent = g.charAt(0).toUpperCase() + g.slice(1);
    } else {
        labelEl.textContent = `${n} genders`;
    }
}

function applyFilters() {
    if (!currentTable) return;
    
    console.log("Applying filters:", currentFilters);
    
    // Apply category filter (anchored alternation across all selected categories)
    currentTable.column(6).search(buildAnchoredRegex(currentFilters.categories), true, false);
    
    // Apply gender filter (anchored alternation so "male" does not also match "female")
    currentTable.column(7).search(buildAnchoredRegex(currentFilters.genders), true, false);

    currentTable.draw();
    updateFilterDisplay();
    updateCompetitorCounts();

    // Auto-show rankings when filtering
    if ((currentFilters.categories.length || currentFilters.genders.length) && !showRankings) {
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
    
    // Reset filter object
    currentFilters = {
        categories: [],
        genders: []
    };

    // Uncheck and relabel both combos
    $('#categoryComboMenu input[type="checkbox"], #genderComboMenu input[type="checkbox"]').prop('checked', false);
    updateCategoryTriggerLabel();
    updateGenderTriggerLabel();
    $('#categoryComboTrigger, #genderComboTrigger').attr('aria-expanded', 'false');
    document.getElementById('categoryComboMenu').hidden = true;
    document.getElementById('genderComboMenu').hidden = true;

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
    
    if (currentFilters.categories.length) {
        const pretty = currentFilters.categories
            .map(c => c.charAt(0).toUpperCase() + c.slice(1))
            .join(', ');
        filters.push(pretty);
    }
    
    if (currentFilters.genders.length) {
        const pretty = currentFilters.genders
            .map(g => g.charAt(0).toUpperCase() + g.slice(1))
            .join(', ');
        filters.push(pretty);
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

/* Default class for buttons (browser only) */
if (typeof window !== 'undefined' && window.jQuery && jQuery.fn.dataTable) {
    jQuery.fn.dataTable.Buttons.defaults.dom.button.className = 'btn';
}

/* Export pure helpers for unit tests under Node. No-op in the browser. */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeRegex, buildAnchoredRegex };
}