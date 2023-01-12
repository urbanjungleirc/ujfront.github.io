
  // Prevent forms from submitting.
  function preventFormSubmit() {
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      forms[i].addEventListener('submit', function(event) {
      event.preventDefault();
      });
    }
  }
  window.addEventListener("load", functionInit, true); 
  
  //INITIALIZE FUNCTIONS ONLOAD
  function functionInit(){  
    preventFormSubmit();
  };      
  
  
  function incrementValue(btn) {
      //var fiedName = el.value;
      var value = parseInt(document.getElementById('number').value, 10);
      value = isNaN(value) ? 0 : value;
      value++;
      document.getElementById('number').value = value;
  }

  // parameters: type of toast - success, warning, default
  function activateToast (toastType, toastTitle, toastMessage) {
    
    switch (toastType) {
      case "success":
        iziToast.success({
          title: toastTitle,
          message: toastMessage,
          class: 'bg-secondary', 
          titleColor: 'white',
          messageColor: 'white',          
          progressBarColor: 'white',
          position: 'topRight',
          displayMode: 2,
          timeout: 3000,
          closeOnClick: true,
          transitionIn:	'fadeInLeft',
          transitionOut: 'fadeOutUp',
          transitionInMobile: 'fadeInUp',
          transitionOutMobile: 'fadeOutUp',
        });
        break;
      case "warning":
        iziToast.error({
          title: toastTitle,
          message: toastMessage,
          class: 'bg-danger', 
          position: 'topRight',
          displayMode: 2,
          timeout: false,
          closeOnClick: true,
          transitionIn:	'fadeInLeft',
          transitionOut: 'fadeOutUp',
          transitionInMobile: 'fadeInUp',
          transitionOutMobile: 'fadeOutUp',
        });
        break;
      default:
        iziToast.show({
          title: toastTitle,
          message: toastMessage,
          position: 'topRight',
          displayMode: 2,
          timeout: 5000,
          class: 'bg-info',
          titleColor: 'white',
          messageColor: 'white',
          icon: 'check_circle',
          progressBarColor: 'white',
          closeOnClick: true,
          transitionIn:	'fadeInLeft',
          transitionOut: 'fadeOutUp',
          transitionInMobile: 'fadeInUp',
          transitionOutMobile: 'fadeOutUp',
        });
    }


    /* iziToast.show({
        title: 'Score updated!',
        message: 'keep sending',
        position: 'topRight',
        displayMode: 2,
        timeout: 3000,
        class: 'bg-secondary',
        titleColor: 'white',
        messageColor: 'white',
        icon: 'check_circle',
        progressBarColor: 'white',
        closeOnClick: true,
        transitionIn:	'fadeInLeft',
        transitionOut: 'fadeOutRight',
    }); */
    
  }

  // --- HANDLE FORM SUBMISSION ---
  // more detials google.script.run: https://developers.google.com/apps-script/guides/html/communication#code.gs_1
  function handleFormSubmit(formObject) {
    // check if submitions are open and then run the update
    var recordId = document.getElementById('RecId').value;
    google.script.run
      .withSuccessHandler(submitData)
      .withUserObject(formObject)
      .checkSubmission(recordId);
  }
  
  function submitData(submitionsOpen,formObject){
    if (submitionsOpen == "TRUE") {
      //'alert alert-success';
      google.script.run
        .withSuccessHandler(setCurrentScore)
        .processForm(formObject);
      document.getElementById('last_update').innerText = "Updated: " + getTimeStamp();  
      activateToast('success', 'Score updated', '- keep crashing!');
    } else {
      //'alert alert-danger';
      let updateMessage = "The competition is <strong>";
      switch (submitionsOpen.toString()) {
        case "closed":
          updateMessage += "already closed";
          break;
        case "not opened yet":
          updateMessage += "not opened yet";
          break;
        case "category closed":
          updateMessage += " on, but your category already closed";
          break;
        default:
          updateMessage = "Unknown reason, <strong>check with the organiser";
      }
      updateMessage += "</strong>."
      //document.getElementById('user_name').innerText = "Submission failed";  
      //document.getElementById('user_category').innerHTML = updateMessage ;  
      //document.getElementById('last_update').innerText = "";  
      activateToast('warning', 'Submission failed', '- ' + updateMessage);
    }
    
    document.getElementById("btnSubmit").blur();
    $("#last_update").fadeTo("fast", 0.15); // https://www.w3schools.com/jquery/jquery_fade.asp
    $("#last_update").fadeTo("fast", 0.99);
  }


  function getTimeStamp() {
    var d = new Date().toLocaleString();
    return d;
  }


  // DELETE DATA
  function deleteData(el) {
    var result = confirm("Want to delete?");
    if (result) {
      var recordId = el.parentNode.parentNode.cells[2].innerHTML;
      google.script.run.deleteData(recordId);
      document.getElementById('user_name').innerText = "!!!";  
      document.getElementById('user_category').innerText = "Record deleted.";  
      document.getElementById('last_update').innerText = "";  
    }
  }
  
  // EDIT DATA
  function loadData(el){
    var recordId = document.getElementById('RecId').value; //https://stackoverflow.com/a/32377357/2391195
    google.script.run
      .withSuccessHandler(populateForm)
      .withFailureHandler(disableForm)
      .getRecordById(recordId);
    google.script.run
      .withSuccessHandler(compSetting)
      .getSingleColumnRange("setting!B1:B20");
    document.getElementById("btnLoad").blur();
  }

  // set competitions values
  function compSetting(values) { //Ref: https://stackoverflow.com/a/53771955/2391195
    let dFrom = new Date(values[4]);
    let dTo = new Date(values[5]);
    document.getElementById('compName').innerHTML = values[1];
    document.getElementById('compDescription').innerHTML = values[2];
    if (dFrom.toLocaleDateString() == dTo.toLocaleDateString() ) {
      document.getElementById('compDay').innerHTML = dFrom.toLocaleDateString() + ", " + dFrom.toLocaleTimeString() + " - " + dTo.toLocaleTimeString();    
    } else {
      document.getElementById('compDay').innerHTML = dFrom.toLocaleString() + " - " + dTo.toLocaleString();
    }
    document.getElementById('compPicture').src = values[6];
  }

  // reset form
  function resetForm() {
    // disable all form elements
    var elements = document.getElementById("myForm").elements;
    for (var i = 0, len = elements.length; i < len; ++i) {
      elements[i].disabled = true;
    }

    // re-enable login elements
    document.getElementById('RecId').disabled = false;
    document.getElementById('RecId').readOnly = false;
    document.getElementById('btnReset').disabled = false;
    document.getElementById('btnLoad').disabled = false;
    document.getElementById('btnSubmit').disabled = true;
    document.getElementById('codeHelp').innerHTML ="Enter a personal code to load your profile.";
    // user profile
    document.getElementById('user_name').innerText = "Competitor";  
    document.getElementById('user_category').innerText = "Category";  
    document.getElementById('last_update').innerText = "";  
    document.getElementById('meters_climbed').innerText = "0";  
    // reset the comp card
    document.getElementById('compName').innerHTML = "<span class='placeholder col-6'></span>";
    document.getElementById('compDescription').innerHTML = "<span class='placeholder col-7'></span><span class='placeholder col-4'></span><span class='placeholder col-6'></span><span class='placeholder col-8'></span>";
    document.getElementById('compDay').innerHTML = "<span class='placeholder col-4'></span>";
    document.getElementById('compPicture').src = "https://ujfront.github.io/assets/background.png";
  }

  // display current score on the form
  function setCurrentScore(values) {
    if (values == "false") {
      document.getElementById('user_category').innerHTML = "<strong>Submisson failed</strong></br>- record not found" ;  
    } else {
      document.getElementById('meters_climbed').innerText = values;
      $("#meters_climbed").fadeTo("fast", 0.15);
      $("#meters_climbed").fadeTo("fast", 0.99);
    }
  }


  // DISABLE FORM
  function disableForm(error) {
      var div = document.getElementById('message');
      div.innerHTML = "ERROR: " + error.message;
      document.getElementById('user_name').innerText = "Error";  
      document.getElementById('user_category').innerText = error.message;  
      document.getElementById('last_update').innerText = "";  
  }
  
  
  // RETRIVE DATA FROM GOOGLE SHEET FOR COUNTRY DROPDOWN
  function createCountryDropdown() {
      //SUBMIT YOUR DATA RANGE FOR DROPDOWN AS THE PARAMETER
      google.script.run.withSuccessHandler(countryDropDown).getSingleColumnRange("setting!A11:A20");
  }
  
  // POPULATE COUNTRY DROPDOWNS
  function countryDropDown(values) { //Ref: https://stackoverflow.com/a/53771955/2391195
    var list = document.getElementById('category');   
    for (var i = 0; i < values.length; i++) {
      var option = document.createElement("option");
      option.value = values[i];
      option.text = values[i];
      list.appendChild(option);
    }
  }
  // POPULATE FORM
  function populateForm(records){
    var divMessage = document.getElementById('message');
    var form = document.getElementById("myForm");
    if (records) {     
      document.getElementById('RecId').value = records[0][0];
      document.getElementById('name').value = records[0][1];
      document.getElementById('bornYear').value = records[0][2];
      document.getElementById(records[0][3]).checked = true;
      document.getElementById('category').value = records[0][4];
      document.getElementById('bA_tally').value = records[0][5];
      document.getElementById('bA_z').value = records[0][6];
      document.getElementById('bA_top').value = records[0][7];
      document.getElementById('bB_tally').value = records[0][8];
      document.getElementById('bB_z').value = records[0][9];
      document.getElementById('bB_top').value = records[0][10];
      document.getElementById('bC_tally').value = records[0][11];
      document.getElementById('bC_z').value = records[0][12];
      document.getElementById('bC_top').value = records[0][13];
      document.getElementById('bD_tally').value = records[0][14];
      document.getElementById('bD_z').value = records[0][15];
      document.getElementById('bD_top').value = records[0][16];
      document.getElementById('bE_tally').value = records[0][17];
      document.getElementById('bE_z').value = records[0][18];
      document.getElementById('bE_top').value = records[0][19];
      document.getElementById('bF_tally').value = records[0][20];
      document.getElementById('bF_z').value = records[0][21];
      document.getElementById('bF_top').value = records[0][22];
      document.getElementById('bG_tally').value = records[0][23];
      document.getElementById('bG_z').value = records[0][24];
      document.getElementById('bG_top').value = records[0][25];
      document.getElementById('bH_tally').value = records[0][26];
      document.getElementById('bH_z').value = records[0][27];
      document.getElementById('bH_top').value = records[0][28];
      document.getElementById('bI_tally').value = records[0][29];
      document.getElementById('bI_z').value = records[0][30];
      document.getElementById('bI_top').value = records[0][31];
      document.getElementById('bJ_tally').value = records[0][32];
      document.getElementById('bJ_z').value = records[0][33];
      document.getElementById('bJ_top').value = records[0][34];
      document.getElementById('bK_tally').value = records[0][35];
      document.getElementById('bK_z').value = records[0][36];
      document.getElementById('bK_top').value = records[0][37];
      document.getElementById('bL_tally').value = records[0][38];
      document.getElementById('bL_z').value = records[0][39];
      document.getElementById('bL_top').value = records[0][40];
      document.getElementById('bM_tally').value = records[0][41];
      document.getElementById('bM_z').value = records[0][42];
      document.getElementById('bM_top').value = records[0][43];
      document.getElementById('bN_tally').value = records[0][44];
      document.getElementById('bN_z').value = records[0][45];
      document.getElementById('bN_top').value = records[0][46];
      document.getElementById('bO_tally').value = records[0][47];
      document.getElementById('bO_z').value = records[0][48];
      document.getElementById('bO_top').value = records[0][49];
      document.getElementById('bP_tally').value = records[0][50];
      document.getElementById('bP_z').value = records[0][51];
      document.getElementById('bP_top').value = records[0][52];
      document.getElementById('bQ_tally').value = records[0][53];
      document.getElementById('bQ_z').value = records[0][54];
      document.getElementById('bQ_top').value = records[0][55];
      document.getElementById('bR_tally').value = records[0][56];
      document.getElementById('bR_z').value = records[0][57];
      document.getElementById('bR_top').value = records[0][58];
      document.getElementById('bS_tally').value = records[0][59];
      document.getElementById('bS_z').value = records[0][60];
      document.getElementById('bS_top').value = records[0][61];
      document.getElementById('bT_tally').value = records[0][62];
      document.getElementById('bT_z').value = records[0][63];
      document.getElementById('bT_top').value = records[0][64];
      document.getElementById('bU_tally').value = records[0][65];
      document.getElementById('bU_z').value = records[0][66];
      document.getElementById('bU_top').value = records[0][67];
      document.getElementById('bV_tally').value = records[0][68];
      document.getElementById('bV_z').value = records[0][69];
      document.getElementById('bV_top').value = records[0][70];
      document.getElementById('bW_tally').value = records[0][71];
      document.getElementById('bW_z').value = records[0][72];
      document.getElementById('bW_top').value = records[0][73];
      document.getElementById('bX_tally').value = records[0][74];
      document.getElementById('bX_z').value = records[0][75];
      document.getElementById('bX_top').value = records[0][76];
      document.getElementById('bY_tally').value = records[0][77];
      document.getElementById('bY_z').value = records[0][78];
      document.getElementById('bY_top').value = records[0][79];
      document.getElementById('bZ_tally').value = records[0][80];
      document.getElementById('bZ_z').value = records[0][81];
      document.getElementById('bZ_top').value = records[0][82];
      document.getElementById('bAA_tally').value = records[0][83];
      document.getElementById('bAA_z').value = records[0][84];
      document.getElementById('bAA_top').value = records[0][85];
      document.getElementById('bAB_tally').value = records[0][86];
      document.getElementById('bAB_z').value = records[0][87];
      document.getElementById('bAB_top').value = records[0][88];
      // user profile
      document.getElementById('user_name').innerText = records[0][1];  
      document.getElementById('user_category').innerHTML = "category: <strong>" + records[0][4] + "</strong> <br>" + records[0][3] + " - " +records[0][2];
      document.getElementById('last_update').innerText = "";  
      // set current scores
      google.script.run.withSuccessHandler(setCurrentScore).getCurrentScore(document.getElementById('RecId').value);

      // enable all fields
      var elements = form.elements;
      for (var i = 0, len = elements.length; i < len; ++i) {
          elements[i].disabled = false;
      }
      // disable editing the personal code (do not use disabled property as it not the field can't pass data)
      document.getElementById('RecId').readOnly = true;
      // reset defaults
      document.getElementById('codeHelp').innerHTML ="";
    } else {
      document.getElementById('user_name').innerText = "Record not found";  
      document.getElementById('user_category').innerText = "";  
      document.getElementById('last_update').innerText = "";  
      form.reset();     
      resetForm;
    }
  }