// js/main.js

let currentConfig, sessionData={}, sessionStage=localStorage.sessionStage;
const vGrades = Array.from({length:18},(_,i)=>'V'+i);
const toast = new bootstrap.Toast(document.getElementById('saveToast'));

function $(id){return document.getElementById(id);}

function init(){
  // Populate config dropdowns (replace with real api calls if desired)
  populateDropdown('classSelect',['Class A','Class B','Class C']);
  populateDropdown('scoringSelect',['System 1','System 2']);

  // Enable buttons if state allows
  if(localStorage.sessionConfig) $('continueSessionBtn').disabled=false;
  api.getSavedSessions().then(list=>{
    if(list.length) $('loadSavedBtn').disabled=false;
  });

  // Listeners
  $('newSessionBtn').onclick = newSession;
  $('continueSessionBtn').onclick = resumeSession;
  $('loadSavedBtn').onclick = showLoadModal;
  $('loadSessionConfirmBtn').onclick = confirmLoad;
  $('confirmConfigBtn').onclick = confirmConfig;
  $('classSelect').onchange = scoringConfigValidator;
  $('scoringSelect').onchange = scoringConfigValidator;
  $('saveScoresBtn').onclick = saveScores;
  $('btnReset').onclick = () => new bootstrap.Modal($('backupModal')).show();
  $('backupConfirmBtn').onclick = doBackup;
}

function populateDropdown(id,items){
  const sel=$(id); sel.innerHTML='';
  items.forEach(i=>sel.appendChild(new Option(i,i)));
}

function scoringConfigValidator(){
  $('confirmConfigBtn').disabled = !($('classSelect').value && $('scoringSelect').value);
}

function newSession(){
  localStorage.clear();
  localStorage.sessionStage='config';
  showConfig();
}

function resumeSession(){
  const cfg=JSON.parse(localStorage.sessionConfig||'null');
  if(!cfg) return alert('No session found.');
  currentConfig=cfg;
  sessionStage=localStorage.sessionStage;
  sessionStage==='config'? showConfig() : showScoring(cfg.climbers);
}

function showLoadModal(){
  api.getSavedSessions().then(list=>{
    populateDropdown('savedSessionSelect',list);
    $('savedSessionContainer').classList.remove('d-none');
  });
}

function confirmLoad(){
  const name=$('savedSessionSelect').value;
  api.loadSession(name).then(res=>{
    resumeSession();
  }).catch(e=>alert(e.error||e));
}

function confirmConfig(){
  const cls=$('classSelect').value, sys=$('scoringSelect').value;
  api.getConfig(cls,sys).then(cfg=>{
    currentConfig=cfg;
    localStorage.sessionConfig=JSON.stringify(cfg);
    localStorage.sessionStage='scoring';
    showScoring(cfg.climbers);
  }).catch(e=>alert(e.error||e));
}

function showConfig(){
  $('sessionChoice').classList.add('d-none');
  $('configSection').classList.remove('d-none');
}

function showScoring(climbers){
  $('sessionChoice').classList.add('d-none');
  $('configSection').classList.add('disabled-config');
  $('scoringSection').classList.remove('d-none');
  buildTable(climbers);
}

function buildTable(climbers){
  sessionData={};
  let html=`<table class="table table-bordered"><thead class="sticky-grade-header"><tr><th>Student</th>`
         + vGrades.map(g=>`<th>${g}</th>`).join('') + `</tr></thead><tbody>`;
  climbers.sort().forEach(st=>{
    sessionData[st]={};
    html+=`<tr data-st="${st}"><td>${st}</td>`
         + vGrades.map(g=>{
             sessionData[st][g]=0;
             return `<td><div class="input-group">
                       <button class="btn btn-sm btn-outline-secondary btn-decrement" data-g="${g}">−</button>
                       <span class="form-control text-center count-value" data-g="${g}">0</span>
                       <button class="btn btn-sm btn-outline-secondary btn-increment" data-g="${g}">+</button>
                     </div></td>`;
           }).join('')+`</tr>`;
  });
  html+=`</tbody></table>`;
  $('scoringTableContainer').innerHTML=html;

  // Row-click highlight
  document.querySelectorAll('#scoringTableContainer tbody tr')
    .forEach(r=>r.onclick=e=>{
      document.querySelectorAll('.selected-row').forEach(x=>x.classList.remove('selected-row'));
      r.classList.add('selected-row');
    });

  // Increment/decrement
  $('scoringTableContainer').addEventListener('click',e=>{
    const btn=e.target.closest('button'), g=btn?.dataset.g;
    if(!g) return;
    const tr=btn.closest('tr'), st=tr.dataset.st;
    let v=sessionData[st][g];
    v=btn.classList.contains('btn-increment')?v+1:Math.max(0,v-1);
    sessionData[st][g]=v;
    tr.querySelector(`span[data-g="${g}"]`).textContent=v;
  });
}

function saveScores(){
  // TODO: call API per cell or batch endpoint
  console.log(sessionData);
  toast.show();
}

function doBackup(){
  const name=$('backupName').value.trim();
  if(!name) return alert("Enter a name");
  api.moveData(name).then(r=>{
    localStorage.clear();
    location.reload();
  }).catch(e=>alert(e.error||e));
}

document.addEventListener('DOMContentLoaded',init);
