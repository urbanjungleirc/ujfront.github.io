/**
 * js/main.js
 * Main application logic for HVT front-end.
 */

// --- Utility Functions ---

/**
 * Shortcut to document.getElementById
 * @param {string} id
 * @returns {HTMLElement}
 */
function $(id) {
    return document.getElementById(id);
}

/**
 * Populate a <select> with a list of options.
 * If items is not an array, we treat it as empty.
 * @param {string} elementId
 * @param {Array<string>} items
 */
function populateDropdown(elementId, items) {
    const sel = $(elementId);
    sel.innerHTML = "";
    if (!Array.isArray(items)) {
        console.warn(
            `populateDropdown expected array for #${elementId}, got`,
            items
        );
        items = [];
    }
    items.forEach((item) => {
        sel.appendChild(new Option(item, item));
    });
}

// --- State Variables ---

let currentConfig = null;
let sessionData = {};
let sessionStage = localStorage.sessionStage || null;
// V0–V17 labels
const vGrades = Array.from({ length: 18 }, (_, i) => "V" + i);

// --- Initialization ---

/**
 * Called once on DOMContentLoaded
 * Sets up event listeners and initial UI state
 */
function init() {
    // Session Choice buttons
    $("newSessionBtn").addEventListener("click", newSession);
    $("continueSessionBtn").addEventListener("click", resumeSession);
    $("loadSavedBtn").addEventListener("click", showLoadModal);
    $("loadSessionConfirmBtn").addEventListener("click", confirmLoad);

    // Config buttons
    $("confirmConfigBtn").addEventListener("click", confirmConfig);
    $("cancelConfigBtn").addEventListener("click", cancelConfig);
    $("classSelect").addEventListener("change", configValidator);
    $("scoringSelect").addEventListener("change", configValidator);

    // Backup & Reset
    $("btnReset").addEventListener("click", () => {
        new bootstrap.Modal($("backupModal")).show();
    });
    $("backupConfirmBtn").addEventListener("click", doBackup);

    // Scoring
    $("saveScoresBtn").addEventListener("click", saveScores);

    // Modals
    $("openClassModalBtn").addEventListener("click", (e) => {
        e.preventDefault();
        openClassModal();
    });
    $("openStudentModalBtn").addEventListener("click", (e) => {
        e.preventDefault();
        openStudentModal();
    });
    $("openScoringModalBtn").addEventListener("click", (e) => {
        e.preventDefault();
        openScoringModal();
    });

    // Populate initial dropdowns and enable Continue/Load if possible
    refreshConfigDropdowns();
    api.getSavedSessions().then((list) => {
        if (list.length) $("loadSavedBtn").disabled = false;
    });
}

document.addEventListener("DOMContentLoaded", init);

// --- Session Flow ---

/** Start a brand-new session */
function newSession() {
    localStorage.clear();
    localStorage.sessionStage = "config";
    showConfig();
}

/** Resume the in-progress session */
function resumeSession() {
    const cfg = JSON.parse(localStorage.sessionConfig || "null");
    if (!cfg) return alert("No session to resume.");
    currentConfig = cfg;
    sessionStage = localStorage.sessionStage;
    if (sessionStage === "config") showConfig();
    else showScoring(cfg.climbers);
}

/** Display the “Load Saved” section */
function showLoadModal() {
    api.getSavedSessions().then((list) => {
        populateDropdown("savedSessionSelect", list);
        $("savedSessionContainer").classList.remove("d-none");
    });
}

/** Confirm loading a saved session */
function confirmLoad() {
    const name = $("savedSessionSelect").value;
    api.loadSession(name)
        .then(() => resumeSession())
        .catch((err) => alert(err.error || err));
}

/** Validate Config step (enable Start Scoring only when both fields are set) */
function configValidator() {
    $("confirmConfigBtn").disabled = !(
        $("classSelect").value && $("scoringSelect").value
    );
}

/** Confirm the class + scoring selection */
function confirmConfig() {
    const cls = $("classSelect").value,
        sys = $("scoringSelect").value;
    api.getConfig(cls, sys)
        .then((cfg) => {
            currentConfig = cfg;
            localStorage.sessionConfig = JSON.stringify(cfg);
            localStorage.sessionStage = "scoring";
            showScoring(cfg.climbers);
        })
        .catch((err) => alert(err.error || err));
}

/** Cancel out of Config, back to Session Choice */
function cancelConfig() {
    $("configSection").classList.add("d-none");
    $("sessionChoice").classList.remove("d-none");
}

// --- UI Sections ---

/** Show the Config section */
function showConfig() {
    $("sessionChoice").classList.add("d-none");
    $("configSection").classList.remove("d-none");
}

/** Show the Scoring table */
function showScoring(climbers) {
    $("sessionChoice").classList.add("d-none");
    $("configSection").classList.add("disabled-config");
    $("scoringSection").classList.remove("d-none");
    buildScoringTable(climbers);
    attachScoringListeners();
}

// --- Scoring Table ---

/**
 * Build the HTML table for scoring,
 * initializing sessionData to zeros.
 */
function buildScoringTable(climbers) {
    sessionData = {};
    let html = `<table class="table table-bordered">
                <thead class="sticky-grade-header"><tr>
                  <th>Student</th>
                  ${vGrades.map((g) => `<th>${g}</th>`).join("")}
                </tr></thead><tbody>`;
    climbers.sort().forEach((st) => {
        sessionData[st] = {};
        html += `<tr data-st="${st}">
               <td>${st}</td>
               ${vGrades
                   .map((g) => {
                       sessionData[st][g] = 0;
                       return `<td>
                             <div class="input-group">
                               <button class="btn btn-sm btn-outline-secondary btn--" data-g="${g}">−</button>
                               <span class="form-control text-center count-value" data-g="${g}">0</span>
                               <button class="btn btn-sm btn-outline-secondary btn++" data-g="${g}">+</button>
                             </div>
                           </td>`;
                   })
                   .join("")}
             </tr>`;
    });
    html += "</tbody></table>";
    $("scoringTableContainer").innerHTML = html;
}

/** Attach +/− click handlers for scoring table */
function attachScoringListeners() {
    $("scoringTableContainer").addEventListener("click", (e) => {
        const btn = e.target.closest("button"),
            g = btn?.dataset.g;
        if (!g) return;
        const tr = btn.closest("tr"),
            st = tr.dataset.st,
            span = tr.querySelector(`span[data-g="${g}"]`);
        let v = sessionData[st][g];
        v = btn.classList.contains("btn++") ? v + 1 : Math.max(0, v - 1);
        sessionData[st][g] = v;
        span.textContent = v;
    });
}

// --- Save Scores ---

/** Handle Save Scores button */
function saveScores() {
    // TODO: batch-save sessionData via API
    console.log("Saving:", sessionData);
    new bootstrap.Toast($("saveToast")).show();
}

// --- Class Modal Logic ---

/** Open the Class Management modal */
function openClassModal() {
    api.getAvailableClasses().then((classes) => renderClassList(classes));
    new bootstrap.Modal($("classModal")).show();
}

/**
 * Render the <ul> of classes in the Class modal.
 * @param {Array<string>} classes
 */
function renderClassList(classes) {
    const ul = $("classListGroup");
    ul.innerHTML = "";
    classes.forEach((name) => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between";
        li.textContent = name;
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-danger btn-delete-class";
        btn.textContent = "Delete";
        btn.dataset.name = name;
        li.appendChild(btn);
        ul.appendChild(li);
    });
}

/** Refresh both the main class dropdown and modal list if open */
function refreshClassLists() {
    api.getAvailableClasses().then((classes) => {
        populateDropdown("classSelect", classes);
        const modal = $("classModal");
        if (modal && modal.classList.contains("show")) {
            renderClassList(classes);
        }
    });
}

/**
 * Refresh the two config dropdowns:
 *  - classSelect   ← getAvailableClasses()
 *  - scoringSelect ← getAvailableScoringSystems()
 */
function refreshConfigDropdowns() {
    // Classes
    api.getAvailableClasses()
        .then((classes) => populateDropdown("classSelect", classes))
        .catch((err) => {
            console.error("Failed to load classes:", err);
            populateDropdown("classSelect", []);
        });

    // Scoring Systems
    api.getAvailableScoringSystems()
        .then((systems) => populateDropdown("scoringSelect", systems))
        .catch((err) => {
            console.error("Failed to load scoring systems:", err);
            populateDropdown("scoringSelect", []);
        });
}

// Delegate Class-Modal add/delete
document.body.addEventListener("click", (e) => {
    if (e.target.matches("#addClassBtnModal")) {
        const name = $("newClassName").value.trim();
        if (!name) return alert("Enter a class name");
        api.createClass(name)
            .then(() => {
                $("newClassName").value = "";
                refreshConfigDropdowns();
                refreshClassLists();
            })
            .catch((err) => alert(err.error || err));
    }
    if (e.target.matches(".btn-delete-class")) {
        const name = e.target.dataset.name;
        if (!confirm(`Delete class "${name}"?`)) return;
        api.deleteClass(name)
            .then(() => {
                refreshConfigDropdowns();
                renderClassList(/*…*/);
            })
            .catch((err) => alert(err.error || err));
    }
});

// --- Student Modal Logic ---

/** Open the Student Management modal */
function openStudentModal() {
    api.getAvailableClasses().then((classes) => {
        populateDropdown("modalClassSelect", classes);
        loadStudentsForClass(classes[0]);
    });
    new bootstrap.Modal($("studentModal")).show();
}

/**
 * Load and render students for a given class.
 * @param {string} className
 */
function loadStudentsForClass(className) {
    api.getStudents(className).then((list) => {
        const tbody = $("studentTableBody");
        tbody.innerHTML = "";
        list.forEach((st) => {
            const tr = document.createElement("tr");
            tr.dataset.id = st.id;
            tr.innerHTML = `
        <td><input class="form-control first-edit" value="${st.firstName}"></td>
        <td><input class="form-control last-edit"  value="${st.lastName}"></td>
        <td>
          <button class="btn btn-sm btn-success btn-student-save">Save</button>
          <button class="btn btn-sm btn-danger  btn-student-delete">Delete</button>
        </td>`;
            tbody.appendChild(tr);
        });
    });
}

// Delegate Student-Modal add/edit/delete
document.body.addEventListener("click", (e) => {
    // Add
    if (e.target.matches("#addStudentBtnModal")) {
        const cls = $("modalClassSelect").value,
            fn = $("newFirstName").value.trim(),
            ln = $("newLastName").value.trim();
        if (!fn || !ln) return alert("First & last name required");
        api.addStudentEntry(cls, fn, ln)
            .then(() => {
                $("newFirstName").value = "";
                $("newLastName").value = "";
                loadStudentsForClass(cls);
            })
            .catch((err) => alert(err.error || err));
    }
    // Save
    if (e.target.matches(".btn-student-save")) {
        const tr = e.target.closest("tr"),
            id = tr.dataset.id,
            cls = $("modalClassSelect").value,
            data = {
                firstName: tr.querySelector(".first-edit").value.trim(),
                lastName: tr.querySelector(".last-edit").value.trim(),
                className: cls,
            };
        api.updateStudent(id, data)
            .then(() => loadStudentsForClass(cls))
            .catch((err) => alert(err.error || err));
    }
    // Delete
    if (e.target.matches(".btn-student-delete")) {
        const tr = e.target.closest("tr"),
            id = tr.dataset.id,
            cls = $("modalClassSelect").value;
        if (!confirm("Delete this student?")) return;
        api.removeStudent(id)
            .then(() => loadStudentsForClass(cls))
            .catch((err) => alert(err.error || err));
    }
});

// --- Scoring Modal Logic ---

/**
 * Open & load the Scoring Systems modal.
 */
function openScoringModal() {
  api.getScoringSystems().then(renderScoringSettingsTable);
  new bootstrap.Modal($("scoringModal")).show();
}

/**
 * Render the scoring-system rows into the modal’s table body.
 * @param {Array<Object>} list
 */
function renderScoringSettingsTable(list) {
  const tbody = $("scoringTableBody");
  tbody.innerHTML = "";
  list.forEach(s => {
    const tr = document.createElement("tr");
    tr.dataset.name = s.name;
    tr.innerHTML = `
      <td><input class="form-control name-edit" value="${s.name}"></td>
      <td><input type="number" class="form-control vmin-edit"    value="${s.vMin}"></td>
      <td><input type="number" class="form-control vmax-edit"    value="${s.vMax}"></td>
      <td><input type="number" class="form-control flash-edit"   value="${s.flash}"></td>
      <td><input type="number" class="form-control top-edit"     value="${s.top}"></td>
      <td><input type="number" class="form-control attempt-edit" value="${s.attempt}"></td>
      <td>
        <button class="btn btn-sm btn-success btn-scoring-save">Save</button>
        <button class="btn btn-sm btn-danger  btn-scoring-delete">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

/**
 * Render the UL of scoring systems with delete buttons.
 * @param {Array<string>} systems
 */
function renderScoringList(systems) {
    const ul = $("scoringListGroup");
    ul.innerHTML = "";
    systems.forEach((name) => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between";
        li.textContent = name;
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-danger btn-delete-scoring";
        btn.textContent = "Delete";
        btn.dataset.name = name;
        li.appendChild(btn);
        ul.appendChild(li);
    });
}

// Delegate Scoring‐Modal add/save/delete
document.body.addEventListener("click", e => {
  // Add
  if (e.target.matches("#addScoringBtnModal")) {
    const name    = $("newScoringName").value.trim();
    const vMin    = $("newVMin").value;
    const vMax    = $("newVMax").value;
    const flash   = $("newFlashMult").value;
    const top     = $("newTopMult").value;
    const attempt = $("newAttemptMult").value;
    if (!name) return alert("Name required");
    api.addScoringSystem(name,vMin,vMax,flash,top,attempt)
      .then(() => {
        refreshConfigDropdowns();
        return api.getScoringSystems();
      })
      .then(renderScoringSettingsTable)
      .catch(err => alert(err.error||err));
  }

  // Save
  if (e.target.matches(".btn-scoring-save")) {
    const tr   = e.target.closest("tr");
    const orig = tr.dataset.name;
    const data = {
      vMin:    tr.querySelector(".vmin-edit").value,
      vMax:    tr.querySelector(".vmax-edit").value,
      flash:   tr.querySelector(".flash-edit").value,
      top:     tr.querySelector(".top-edit").value,
      attempt: tr.querySelector(".attempt-edit").value
    };
    api.updateScoringSystem(orig, data)
      .then(() => {
        refreshConfigDropdowns();
        return api.getScoringSystems();
      })
      .then(renderScoringSettingsTable)
      .catch(err => alert(err.error||err));
  }

  // Delete
  if (e.target.matches(".btn-scoring-delete")) {
    const name = e.target.closest("tr").dataset.name;
    if (!confirm(`Delete scoring system "${name}"?`)) return;
    api.deleteScoringSystem(name)
      .then(() => {
        refreshConfigDropdowns();
        return api.getScoringSystems();
      })
      .then(renderScoringSettingsTable)
      .catch(err => alert(err.error||err));
  }
});


// --- Backup & Reset ---

/**
 * Perform backup & reset when user confirms in modal
 */
function doBackup() {
    const name = $("backupName").value.trim();
    if (!name) return alert("Please enter a backup name");
    api.moveData(name)
        .then(() => {
            localStorage.clear();
            location.reload();
        })
        .catch((err) => alert(err.error || err));
}
