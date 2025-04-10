// js/main.js

// Global variable to hold the current session configuration.
let currentConfig = null; // Will store the config object returned by getConfig().
let sessionData = {}; // Object to hold the current tick counts, keyed by student and grade.

// Sample arrays for classes and scoring systems. In production, use API calls.
const sampleClasses = ["Class A", "Class B", "Class C"];
const sampleScoringSystems = ["System 1", "System 2"];

// List of V Grades from V0 to V17.
const vGrades = Array.from({ length: 18 }, (_, i) => "V" + i);

// ------ Utility Functions ------

/**
 * Sorts an array of strings alphabetically.
 */
function sortAlphabetically(arr) {
    return arr.sort((a, b) => a.localeCompare(b));
}

// ------ Session Choice ------

document.addEventListener("DOMContentLoaded", function () {
    // Populate the dropdowns in configuration section.
    populateDropdown("classSelect", sampleClasses);
    populateDropdown("scoringSelect", sampleScoringSystems);

    // Attach event listeners to session choice buttons.
    document.getElementById("newSessionBtn").addEventListener("click", () => {
        // Show the configuration section for a new session.
        document.getElementById("sessionChoice").classList.add("d-none");
        document.getElementById("configSection").classList.remove("d-none");
    });

    document
        .getElementById("continueSessionBtn")
        .addEventListener("click", () => {
            // For this demo, we assume configuration is saved in localStorage.
            const storedConfig = JSON.parse(
                localStorage.getItem("sessionConfig")
            );
            if (storedConfig) {
                currentConfig = storedConfig;
                // Lock configuration (disable editing) and generate table.
                disableConfig();
                generateScoringTable(currentConfig.climbers);
            } else {
                alert("No previous session found. Please start a new session.");
            }
        });

    // Confirm configuration button
    document
        .getElementById("confirmConfigBtn")
        .addEventListener("click", function () {
            const cls = document.getElementById("classSelect").value;
            const system = document.getElementById("scoringSelect").value;
            // Call API to get configuration.
            // For production, you would do: api.getConfig(cls, system).then(config => { ... });
            // For demo purposes, we simulate config data:
            const simulatedConfig = {
                climbers: sortAlphabetically(["Alice", "Bob", "Charlie"]),
                sendTypes: ["flash", "top", "att"], // For example – although our table will be per V grade.
                // You can add scoring multipliers etc. here.
                // Optionally include gradeValues if used.
            };
            currentConfig = simulatedConfig;
            // Save configuration to localStorage for session continuity.
            localStorage.setItem(
                "sessionConfig",
                JSON.stringify(currentConfig)
            );
            disableConfig();
            generateScoringTable(currentConfig.climbers);
        });

    // Save Scores button functionality (placeholder)
    document
        .getElementById("saveScoresBtn")
        .addEventListener("click", function () {
            // For demo, log the sessionData object.
            console.log("Session Data to be saved:", sessionData);
            // Here you could loop through sessionData and call an API endpoint to save each cell.
            alert("Scores have been saved (demo).");
        });

    // btnReset functionality
    document.getElementById("btnReset").addEventListener("click", () => {
        const backupName = prompt("Enter backup sheet name:");
        if (backupName) {
            api.moveData(backupName)
                .then((response) => {
                    alert("Session backed up and reset.");
                    localStorage.removeItem("sessionConfig");
                    location.reload();
                })
                .catch((err) => console.error(err));
        }
    });
});

/**
 * Populates a dropdown element with given options.
 */
function populateDropdown(elementId, optionsArray) {
    const selectElem = document.getElementById(elementId);
    selectElem.innerHTML = "";
    optionsArray.forEach((optionText) => {
        const opt = document.createElement("option");
        opt.value = optionText;
        opt.textContent = optionText;
        selectElem.appendChild(opt);
    });
}

/**
 * Disables the configuration form so that settings cannot be changed.
 */
function disableConfig() {
    document.getElementById("configSection").classList.add("disabled-config");
}

/**
 * Generates the scoring table.
 * @param {Array} climbers - Array of student names.
 */
function generateScoringTable(climbers) {
    // Show the scoring table section and hide configuration.
    document.getElementById("configSection").classList.add("d-none");
    document.getElementById("scoringSection").classList.remove("d-none");

    // Build the table HTML.
    let html = `<table class="table table-bordered scoring-table"><thead><tr>
                <th>Student</th>`;
    vGrades.forEach((grade) => {
        html += `<th>${grade}</th>`;
    });
    html += `</tr></thead><tbody>`;

    // Assume climbers is already sorted.
    climbers.forEach((student) => {
        html += `<tr data-student="${student}">
              <td>${student}</td>`;
        // Initialize each cell count to 0.
        vGrades.forEach((grade) => {
            // For each cell, include a minus button, a span for the count, and a plus button.
            html += `<td>
                <div class="input-group">
                  <button class="btn btn-sm btn-outline-secondary btn-decrement" data-grade="${grade}">-</button>
                  <span class="form-control text-center py-1 count-value" data-grade="${grade}">0</span>
                  <button class="btn btn-sm btn-outline-secondary btn-increment" data-grade="${grade}">+</button>
                </div>
              </td>`;
            // Initialize sessionData for this student and grade.
            if (!sessionData[student]) {
                sessionData[student] = {};
            }
            sessionData[student][grade] = 0;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;

    document.getElementById("scoringTableContainer").innerHTML = html;

    // Attach event listeners to the increment/decrement buttons.
    attachTableEventListeners();
}

/**
 * Attaches click event listeners to plus and minus buttons in the scoring table.
 */
function attachTableEventListeners() {
    // Use event delegation on the table container.
    const container = document.getElementById("scoringTableContainer");
    container.addEventListener("click", function (e) {
        const target = e.target;
        if (
            target.classList.contains("btn-increment") ||
            target.classList.contains("btn-decrement")
        ) {
            const grade = target.getAttribute("data-grade");
            const row = target.closest("tr");
            const student = row.getAttribute("data-student");
            // Find the <span> element that holds the count.
            const countElem = row.querySelector(
                `span.count-value[data-grade="${grade}"]`
            );
            let currentCount = parseInt(countElem.textContent) || 0;
            if (target.classList.contains("btn-increment")) {
                currentCount++;
            } else if (target.classList.contains("btn-decrement")) {
                currentCount = Math.max(0, currentCount - 1);
            }
            countElem.textContent = currentCount;
            // Update our sessionData object.
            sessionData[student][grade] = currentCount;
        }
    });
}
