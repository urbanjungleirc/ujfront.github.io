// Replace 'YOUR_DEPLOYMENT_ID' with your actual GAS web app deployment ID.
const GAS_ENDPOINT =
    "https://script.google.com/a/macros/urbanjungleirc.com/s/AKfycbx8fO-LDqXnhAQO2N_TJRrFRIPZDqR9rRaYofkAyKBWOPW6D49e6jlN-daA-0oyXMmWWQ/exec";

/**
 * Generic function to call the backend with the specified action and parameters.
 */
function callBackend(action, params = {}) {
    const url = new URL(GAS_ENDPOINT);
    url.searchParams.append("action", action);
    Object.keys(params).forEach((key) => {
        url.searchParams.append(key, params[key]);
    });
    return fetch(url.toString()).then((response) => response.json());
}

// Expose API calls on the global "api" object.
window.api = {
    getConfig: (className, scoringSystem) =>
        callBackend("getConfig", { class: className, system: scoringSystem }),
    getResultsData: () => callBackend("getResultsData"),
    resetSession: () => callBackend("resetSession"),
    moveData: (newSheetName) => callBackend("moveData", { newSheetName }),
    addStudent: (studentName, studentClass) =>
        callBackend("addStudent", { studentName, studentClass }),
    addScoringSystem: (systemName, scoringType, scoringValue) =>
        callBackend("addScoringSystem", {
            systemName,
            scoringType,
            scoringValue,
        }),
    // You can add more API functions as required.
};
