/**
 * js/api.js
 * API wrappers for HVT (High Volume Training) GAS backend.
 * Uses JSONP to avoid CORS.
 */

// --- Constants ---

/** Your GAS web app deployment URL */
const GAS_ENDPOINT =
    "https://script.google.com/a/macros/urbanjungleirc.com/s/AKfycbywmi8TkNgJsYAUYL-njHxSeOGrLTUcoq_WPOrcMLhDnbPOvTW7qK457AAPn4EngjV9sA/exec";
// --- JSONP Helper ---

/**
 * callJSONP
 * Performs a JSONP request to the GAS endpoint.
 * @param {string} action - Name of the GAS action to invoke.
 * @param {object} params - Key/value pairs of parameters.
 * @returns {Promise<any>} - Resolves with the parsed response object.
 */
function callJSONP(action, params = {}) {
    return new Promise((resolve, reject) => {
        const cbName = `cb_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2)}`;
        window[cbName] = (data) => {
            delete window[cbName];
            document.body.removeChild(script);
            resolve(data);
        };
        const query = Object.entries({ action, callback: cbName, ...params })
            .map(
                ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
            )
            .join("&");
        const script = document.createElement("script");
        script.src = `${GAS_ENDPOINT}?${query}`;
        script.onerror = () => {
            delete window[cbName];
            document.body.removeChild(script);
            reject(new Error(`JSONP request to ${script.src} failed`));
        };
        document.body.appendChild(script);
    });
}

// --- Session Endpoints ---

/** Fetch list of saved (backup) sessions */
function getSavedSessions() {
    return callJSONP("getSavedSessions");
}
/** Restore a saved session by sheet name */
function loadSession(sheetName) {
    return callJSONP("loadSession", { sheetName });
}

// --- Configuration Endpoints ---

/** Get class+scoring configuration */
function getConfig(className, scoringSystem) {
    return callJSONP("getConfig", { class: className, system: scoringSystem });
}
/** Reset the session data */
function resetSession() {
    return callJSONP("resetSession");
}
/** Backup current data to a new sheet */
function moveData(newSheetName) {
    return callJSONP("moveData", { newSheetName });
}

// --- Class CRUD Endpoints ---

/** List all classes */
function getAvailableClasses() {
    return callJSONP("getAvailableClasses");
}
/** Create a new class */
function createClass(name) {
    return callJSONP("createClass", { name });
}
/** Delete an existing class */
function deleteClass(name) {
    return callJSONP("deleteClass", { name });
}

// --- Student CRUD Endpoints ---

/** List students in a class */
function getStudents(className) {
    return callJSONP("getStudents", { className });
}
/** Add a new student */
function addStudentEntry(className, firstName, lastName) {
    return callJSONP("addStudentEntry", { className, firstName, lastName });
}
/** Update an existing student */
function updateStudent(id, data) {
    return callJSONP("updateStudent", { id, data: JSON.stringify(data) });
}
/** Remove a student by ID */
function removeStudent(id) {
    return callJSONP("removeStudent", { id });
}

// --- Exported API Object ---

window.api = {
    // Session
    getSavedSessions,
    loadSession,

    // Config
    getConfig,
    resetSession,
    moveData,

    // Classes
    getAvailableClasses,
    createClass,
    deleteClass,

    // Students
    getStudents,
    addStudentEntry,
    updateStudent,
    removeStudent,

    // Scoring Systems CRUD
    /** List just the names of scoring systems */
    getAvailableScoringSystems: () => callJSONP("getAvailableScoringSystems"),
    getScoringSystems: () => callJSONP("getScoringSystems"),
    addScoringSystem: (name, vMin, vMax, flash, top, attempt) =>
        callJSONP("addScoringSystem", {
            name,
            vMin,
            vMax,
            flash,
            top,
            attempt,
        }),
    updateScoringSystem: (name, data) =>
        callJSONP("updateScoringSystem", { name, data: JSON.stringify(data) }),
    deleteScoringSystem: (name) => callJSONP("deleteScoringSystem", { name }),
};
