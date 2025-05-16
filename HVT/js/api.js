// Replace 'YOUR_DEPLOYMENT_ID' with your actual GAS web app deployment ID.
const GAS_ENDPOINT =
    "https://script.google.com/a/macros/urbanjungleirc.com/s/AKfycbx8fO-LDqXnhAQO2N_TJRrFRIPZDqR9rRaYofkAyKBWOPW6D49e6jlN-daA-0oyXMmWWQ/exec";


function callBackend(action, params={}) {
  const url = new URL(GAS_ENDPOINT);
  url.searchParams.append("action", action);
  Object.entries(params).forEach(([k,v])=> url.searchParams.append(k,v));
  return fetch(url).then(r=>r.json());
}

window.api = {
  getConfig:        (cls,sys) => callBackend("getConfig",        {class:cls, system:sys}),
  getResultsData:   ()       => callBackend("getResultsData"),
  resetSession:     ()       => callBackend("resetSession"),
  moveData:         (name)   => callBackend("moveData",         {newSheetName:name}),
  addStudent:       (n,c)    => callBackend("addStudent",       {studentName:n, studentClass:c}),
  addScoringSystem: (n,t,v)  => callBackend("addScoringSystem",{systemName:n, scoringType:t, scoringValue:v}),
  getSavedSessions: ()       => callBackend("getSavedSessions"),
  loadSession:      (name)   => callBackend("loadSession",      {sheetName:name})
};

