const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

function doGet(e) {
  const page = e.parameter.page || 'admin';
  
  switch(page) {
    case 'scoring':
      return HtmlService.createTemplateFromFile('scoring')
        .evaluate()
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    case 'scoreboard':
      return HtmlService.createTemplateFromFile('scoreboard')
        .evaluate()
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    case 'admin':
    default:
      return HtmlService.createTemplateFromFile('admin')
        .evaluate()
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

function doPost(e) {
  const action = e.parameter.action;
  const data = JSON.parse(e.parameter.data || '{}');
  
  try {
    let result;
    
    switch(action) {
      case 'getClasses':
        result = getClasses();
        break;
      case 'getStudentsByClass':
        result = getStudentsByClass(data.className);
        break;
      case 'startSession':
        result = startSession(data.className, data.instructor);
        break;
      case 'getCurrentSession':
        result = getCurrentSession();
        break;
      case 'logClimb':
        result = logClimb(data.studentId, data.grade, data.result);
        break;
      case 'getScoreboard':
        result = getScoreboard();
        break;
      case 'endSession':
        result = endSession();
        break;
      case 'importStudents':
        result = importStudents(data.csvData, data.className);
        break;
      case 'exportSession':
        result = exportSession(data.sessionId);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Direct functions for google.script.run calls
function apiGetClasses() {
  try {
    return { success: true, data: getClasses() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiGetStudentsByClass(className) {
  try {
    return { success: true, data: getStudentsByClass(className) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiStartSession(className, instructor) {
  try {
    return { success: true, data: startSession(className, instructor) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiGetCurrentSession() {
  try {
    return { success: true, data: getCurrentSession() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiLogClimb(studentId, grade, result) {
  try {
    return { success: true, data: logClimb(studentId, grade, result) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiGetScoreboard() {
  try {
    return { success: true, data: getScoreboard() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiEndSession() {
  try {
    return { success: true, data: endSession() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiImportStudents(csvData, className) {
  try {
    return { success: true, data: importStudents(csvData, className) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiExportSession(sessionId) {
  try {
    return { success: true, data: exportSession(sessionId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiFixExistingData() {
  try {
    return { success: true, data: fixExistingData() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiGetRecentSessions() {
  try {
    return { success: true, data: getRecentSessions() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function apiGetSpreadsheetId() {
  try {
    return { success: true, data: SPREADSHEET_ID };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getBaseUrl() {
  return ScriptApp.getService().getUrl();
}

function apiGetBaseUrl() {
  try {
    return { success: true, data: getBaseUrl() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getSpreadsheet() {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID not configured. Please set it in Script Properties.');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOrCreateSheet(name, headers = []) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  }
  
  return sheet;
}

function getClasses() {
  const sheet = getOrCreateSheet('Classes', ['Class_Name', 'Description', 'Skill_Level', 'Student_Count']);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return [];
  }
  
  // Update student counts before returning
  updateAllClassCounts();
  
  // Re-fetch data after update
  const updatedData = sheet.getDataRange().getValues();
  
  return updatedData.slice(1).map(row => ({
    name: row[0],
    description: row[1],
    skillLevel: row[2],
    studentCount: row[3]
  }));
}

function updateAllClassCounts() {
  const classesSheet = getOrCreateSheet('Classes', ['Class_Name', 'Description', 'Skill_Level', 'Student_Count']);
  const studentsSheet = getOrCreateSheet('Students', ['ID', 'First_Name', 'Last_Name', 'Class', 'Active']);
  
  const classData = classesSheet.getDataRange().getValues();
  const studentData = studentsSheet.getDataRange().getValues();
  
  // If no classes exist, nothing to update
  if (classData.length <= 1) return;
  
  // Count students per class
  const classCounts = {};
  
  // Only count if there are students
  if (studentData.length > 1) {
    for (let i = 1; i < studentData.length; i++) {
      const className = studentData[i][3]; // Class column
      const isActive = studentData[i][4]; // Active column
      
      if (isActive === true || isActive === 'TRUE' || isActive === true) {
        classCounts[className] = (classCounts[className] || 0) + 1;
      }
    }
  }
  
  // Update class counts
  for (let i = 1; i < classData.length; i++) {
    const className = classData[i][0];
    const count = classCounts[className] || 0;
    classesSheet.getRange(i + 1, 4).setValue(count); // Student_Count column
  }
}

function getStudentsByClass(className) {
  const sheet = getOrCreateSheet('Students', ['ID', 'First_Name', 'Last_Name', 'Class', 'Active']);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return [];
  }
  
  return data.slice(1)
    .filter(row => row[3] === className && (row[4] === true || row[4] === 'TRUE'))
    .map(row => ({
      id: row[0],
      firstName: row[1],
      lastName: row[2],
      fullName: `${row[1]} ${row[2]}`
    }));
}

function startSession(className, instructor) {
  // First end any existing active session
  endAllActiveSessions();
  
  const sessionId = `SES${Date.now()}`;
  const students = getStudentsByClass(className);
  
  // Create session record in spreadsheet
  const sessionsSheet = getOrCreateSheet('Sessions', [
    'SessionID', 'Date', 'Coach', 'Class', 'Student_Count', 'Status', 'Total_Climbs'
  ]);
  
  sessionsSheet.appendRow([
    sessionId,
    new Date(),
    instructor,
    className,
    students.length,
    'Active',
    0
  ]);
  
  // Create climbs sheet for this session
  const climbsSheet = getOrCreateSheet(`Climbs_${sessionId}`, [
    'Timestamp', 'Student_ID', 'Student_Name', 'Grade', 'Result', 'Points'
  ]);
  
  // Store session data in spreadsheet for multi-device access
  const sessionDetailsSheet = getOrCreateSheet('ActiveSession', [
    'SessionID', 'ClassName', 'Instructor', 'Students', 'StartTime', 'LastUpdated'
  ]);
  
  // Clear any existing active session data
  if (sessionDetailsSheet.getLastRow() > 1) {
    sessionDetailsSheet.getRange(2, 1, sessionDetailsSheet.getLastRow() - 1, 6).clearContent();
  }
  
  // Add new session data
  sessionDetailsSheet.appendRow([
    sessionId,
    className,
    instructor,
    JSON.stringify(students),
    new Date().toISOString(),
    new Date().toISOString()
  ]);
  
  const sessionData = {
    sessionId: sessionId,
    className: className,
    instructor: instructor,
    students: students,
    startTime: new Date().toISOString()
  };
  
  // Also cache for performance (but don't depend on it)
  CacheService.getScriptCache().put('currentSession', JSON.stringify(sessionData), 10800);
  
  return sessionData;
}

function getCurrentSession() {
  // First try cache for performance
  const cached = CacheService.getScriptCache().get('currentSession');
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fallback to spreadsheet (multi-device support)
  try {
    const sessionDetailsSheet = getOrCreateSheet('ActiveSession', [
      'SessionID', 'ClassName', 'Instructor', 'Students', 'StartTime', 'LastUpdated'
    ]);
    
    if (sessionDetailsSheet.getLastRow() <= 1) {
      return null; // No active session
    }
    
    const data = sessionDetailsSheet.getRange(2, 1, 1, 6).getValues()[0];
    const sessionData = {
      sessionId: data[0],
      className: data[1],
      instructor: data[2],
      students: JSON.parse(data[3]),
      startTime: data[4]
    };
    
    // Update cache for next time
    CacheService.getScriptCache().put('currentSession', JSON.stringify(sessionData), 10800);
    
    return sessionData;
  } catch (error) {
    console.error('Error getting session from spreadsheet:', error);
    return null;
  }
}

function endAllActiveSessions() {
  // Clear active session data
  try {
    const sessionDetailsSheet = getOrCreateSheet('ActiveSession', [
      'SessionID', 'ClassName', 'Instructor', 'Students', 'StartTime', 'LastUpdated'
    ]);
    
    if (sessionDetailsSheet.getLastRow() > 1) {
      sessionDetailsSheet.getRange(2, 1, sessionDetailsSheet.getLastRow() - 1, 6).clearContent();
    }
  } catch (error) {
    console.error('Error clearing active sessions:', error);
  }
}

function logClimb(studentId, grade, result) {
  const session = getCurrentSession();
  if (!session) {
    throw new Error('No active session found');
  }
  
  const student = session.students.find(s => s.id === studentId);
  if (!student) {
    throw new Error('Student not found in current session');
  }
  
  const points = calculatePoints(grade, result);
  const climbsSheet = getOrCreateSheet(`Climbs_${session.sessionId}`);
  
  climbsSheet.appendRow([
    new Date(),
    studentId,
    student.fullName,
    grade,
    result,
    points
  ]);
  
  // Update session total climbs
  updateSessionClimbCount(session.sessionId);
  
  return {
    success: true,
    points: points
  };
}

function calculatePoints(grade, result) {
  const configSheet = getOrCreateSheet('Config', ['Grade', 'Base_Value', 'Attempt_Value', 'Notes']);
  let data = configSheet.getDataRange().getValues();
  
  // Initialize default scoring if config is empty
  if (data.length <= 1) {
    const defaultScoring = [
      ['V0', 0.4, 0.2, 'Beginner'],
      ['V1', 1, 0.5, 'Easy'],
      ['V2', 2, 1, 'Moderate'],
      ['V3', 3, 1.5, 'Moderate+'],
      ['V4', 4, 2, 'Hard'],
      ['V5', 5, 2.5, 'Hard+'],
      ['V6', 6, 3, 'Very Hard'],
      ['V7', 7, 3.5, 'Very Hard+'],
      ['V8', 8, 4, 'Expert'],
      ['V9', 9, 4.5, 'Expert+'],
      ['V10', 10, 5, 'Elite']
    ];
    
    for (let row of defaultScoring) {
      configSheet.appendRow(row);
    }
    
    data = configSheet.getDataRange().getValues();
  }
  
  const gradeRow = data.find(row => row[0] === grade);
  if (!gradeRow) {
    throw new Error(`Grade ${grade} not found in config`);
  }
  
  return result === 'TOP' ? gradeRow[1] : gradeRow[2];
}

function updateSessionClimbCount(sessionId) {
  const sessionsSheet = getOrCreateSheet('Sessions');
  const data = sessionsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      const climbsSheet = getOrCreateSheet(`Climbs_${sessionId}`);
      const climbCount = Math.max(0, climbsSheet.getLastRow() - 1);
      sessionsSheet.getRange(i + 1, 7).setValue(climbCount);
      break;
    }
  }
}

function getScoreboard() {
  const session = getCurrentSession();
  if (!session) {
    return { sessionId: null, leaderboard: [] };
  }
  
  const climbsSheet = getOrCreateSheet(`Climbs_${session.sessionId}`);
  const data = climbsSheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return {
      sessionId: session.sessionId,
      lastUpdated: new Date().toISOString(),
      leaderboard: session.students.map(student => ({
        studentId: student.id,
        name: student.fullName,
        totalPoints: 0,
        tops: 0,
        attempts: 0,
        efficiency: 0
      }))
    };
  }
  
  const studentStats = {};
  
  // Initialize all students
  session.students.forEach(student => {
    studentStats[student.id] = {
      studentId: student.id,
      name: student.fullName,
      totalPoints: 0,
      tops: 0,
      attempts: 0,
      efficiency: 0
    };
  });
  
  // Process climbs
  for (let i = 1; i < data.length; i++) {
    const [timestamp, studentId, studentName, grade, result, points] = data[i];
    
    if (studentStats[studentId]) {
      studentStats[studentId].totalPoints += points;
      studentStats[studentId].attempts++;
      
      if (result === 'TOP') {
        studentStats[studentId].tops++;
      }
    }
  }
  
  // Calculate efficiency and sort
  const leaderboard = Object.values(studentStats).map(stats => {
    stats.efficiency = stats.attempts > 0 ? Math.round((stats.tops / stats.attempts) * 100) : 0;
    return stats;
  }).sort((a, b) => b.totalPoints - a.totalPoints);
  
  return {
    sessionId: session.sessionId,
    lastUpdated: new Date().toISOString(),
    leaderboard: leaderboard
  };
}

function endSession() {
  const session = getCurrentSession();
  if (!session) {
    throw new Error('No active session found');
  }
  
  // Update session status in Sessions sheet
  const sessionsSheet = getOrCreateSheet('Sessions');
  const data = sessionsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === session.sessionId) {
      sessionsSheet.getRange(i + 1, 6).setValue('Complete');
      break;
    }
  }
  
  // Clear active session data from spreadsheet
  const sessionDetailsSheet = getOrCreateSheet('ActiveSession', [
    'SessionID', 'ClassName', 'Instructor', 'Students', 'StartTime', 'LastUpdated'
  ]);
  
  if (sessionDetailsSheet.getLastRow() > 1) {
    sessionDetailsSheet.getRange(2, 1, sessionDetailsSheet.getLastRow() - 1, 6).clearContent();
  }
  
  // Clear cache
  CacheService.getScriptCache().remove('currentSession');
  
  return { success: true, sessionId: session.sessionId };
}

function importStudents(csvData, className) {
  const studentsSheet = getOrCreateSheet('Students', ['ID', 'First_Name', 'Last_Name', 'Class', 'Active']);
  
  // Ensure class exists in Classes sheet
  ensureClassExists(className);
  
  const lines = csvData.trim().split('\n');
  let imported = 0;
  
  for (let i = 1; i < lines.length; i++) { // Skip header
    const [firstName, lastName] = lines[i].split(',').map(s => s.trim());
    if (firstName && lastName) {
      const studentId = `STU${Date.now()}${i}`;
      studentsSheet.appendRow([studentId, firstName, lastName, className, true]);
      imported++;
    }
  }
  
  // Update class count after import
  updateAllClassCounts();
  
  return { imported: imported };
}

function ensureClassExists(className) {
  const classesSheet = getOrCreateSheet('Classes', ['Class_Name', 'Description', 'Skill_Level', 'Student_Count']);
  const data = classesSheet.getDataRange().getValues();
  
  // Check if class already exists
  const existingClass = data.find(row => row[0] === className);
  
  if (!existingClass) {
    // Create new class entry
    classesSheet.appendRow([
      className,
      'Auto-generated class',
      'Mixed levels',
      0
    ]);
  }
}

function exportSession(sessionId) {
  const climbsSheet = getOrCreateSheet(`Climbs_${sessionId}`);
  const data = climbsSheet.getDataRange().getValues();
  
  let csv = data.map(row => row.join(',')).join('\n');
  
  return {
    sessionId: sessionId,
    csvData: csv,
    filename: `HVT_Session_${sessionId}.csv`
  };
}

function fixExistingData() {
  const studentsSheet = getOrCreateSheet('Students', ['ID', 'First_Name', 'Last_Name', 'Class', 'Active']);
  const classesSheet = getOrCreateSheet('Classes', ['Class_Name', 'Description', 'Skill_Level', 'Student_Count']);
  
  const studentData = studentsSheet.getDataRange().getValues();
  
  if (studentData.length <= 1) {
    return { message: "No students found to process", classesCreated: 0 };
  }
  
  // Find all unique class names from students
  const uniqueClasses = new Set();
  for (let i = 1; i < studentData.length; i++) {
    const className = studentData[i][3]; // Class column
    if (className) {
      uniqueClasses.add(className);
    }
  }
  
  let classesCreated = 0;
  
  // Create class entries for each unique class
  uniqueClasses.forEach(className => {
    ensureClassExists(className);
    classesCreated++;
  });
  
  // Update all class counts
  updateAllClassCounts();
  
  return { 
    message: `Fixed existing data. Created ${classesCreated} class entries.`,
    classesCreated: classesCreated,
    classes: Array.from(uniqueClasses)
  };
}

function getRecentSessions() {
  const sessionsSheet = getOrCreateSheet('Sessions', ['SessionID', 'Date', 'Coach', 'Class', 'Student_Count', 'Status', 'Total_Climbs']);
  const data = sessionsSheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return [];
  }
  
  // Get last 10 sessions, sorted by date (newest first)
  return data.slice(1)
    .map(row => ({
      sessionId: row[0],
      date: new Date(row[1]).toLocaleDateString(),
      coach: row[2],
      className: row[3],
      studentCount: row[4],
      status: row[5],
      totalClimbs: row[6] || 0
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}