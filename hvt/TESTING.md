# Testing Guide - High-Volume Training System

This guide provides step-by-step testing procedures to verify the complete HVT system functionality.

## Pre-Test Setup

### Required Items
- Google account with Google Workspace access
- Computer for admin panel and scoreboard
- Phone or tablet for scoring interface
- Test CSV file (provided: `test-data.csv`)

### Initial Configuration
1. Complete the setup process following `SETUP.md`
2. Note your web app URLs for each interface
3. Ensure all HTML files are properly deployed in Apps Script

## Test Workflow

### Phase 1: System Initialization

**Test 1.1: First-Time Access**
```
1. Access web app URL in browser
2. Verify Google authentication prompt appears
3. Complete authorization process
4. Confirm admin panel loads successfully
```
**Expected Result**: Clean admin interface with empty data sections

**Test 1.2: Spreadsheet Creation**
```
1. Check your Google Spreadsheet
2. Verify automatic sheet creation:
   - Students (with headers)
   - Classes (with headers)  
   - Sessions (with headers)
   - Config (with default scoring values)
```
**Expected Result**: All sheets present with proper structure

### Phase 2: Data Setup

**Test 2.1: Class Creation**
```
1. Open Google Spreadsheet → Classes sheet
2. Add test class:
   Class_Name: "Test Beginners"
   Description: "Testing group"
   Skill_Level: "V0-V3"
   Student_Count: 0
3. Save and refresh admin panel
```
**Expected Result**: Class appears in admin panel dropdown

**Test 2.2: Student Import**
```
1. In admin panel, go to Import Students section
2. Enter Class Name: "Test Beginners"
3. Upload provided test-data.csv file
4. Click Import Students
5. Check Students sheet for new entries
```
**Expected Result**: 15 students imported, all marked as active

**Test 2.3: Data Verification**
```
1. Refresh admin panel
2. Verify class dropdown shows "Test Beginners (15 students)"
3. Check Students sheet shows all imported students
4. Verify Classes sheet Student_Count updated to 15
```
**Expected Result**: All counts match, data properly linked

### Phase 3: Session Management

**Test 3.1: Start Session**
```
1. In admin panel:
   - Select "Test Beginners" from class dropdown
   - Enter instructor name: "Test Instructor"
   - Click "Start Session"
2. Verify success message appears
3. Check Current Session section updates
```
**Expected Result**: Active session displayed with correct details

**Test 3.2: Session Data Creation**
```
1. Check Google Spreadsheet
2. Verify new sheets created:
   - Sessions sheet has new row with current session
   - New Climbs_[SessionID] sheet created
3. Note the SessionID for reference
```
**Expected Result**: Proper session tracking sheets created

### Phase 4: Scoring Interface Testing

**Test 4.1: Scoring Interface Access**
```
1. Open scoring interface URL on phone/tablet
2. Verify mobile-friendly layout
3. Confirm session info displays correctly
4. Check student dropdown populated with all 15 students
```
**Expected Result**: Clean mobile interface with all students listed

**Test 4.2: Student Selection**
```
1. Select first student from dropdown
2. Verify student name appears in blue highlight box
3. Confirm current student stats show (0 points, 0 tops, 0 attempts)
```
**Expected Result**: Student properly selected and displayed

**Test 4.3: Grade Selection**
```
1. Tap various grade buttons (V0, V1, V2, etc.)
2. Verify selected grade highlights in blue
3. Confirm TOP and ATTEMPT buttons become enabled
```
**Expected Result**: Grade selection works, buttons activate

**Test 4.4: Climb Logging - TOP**
```
1. Select student: "John Doe"
2. Select grade: "V2"  
3. Tap "TOP" button
4. Verify success message appears with points
5. Check student stats update
```
**Expected Result**: Success message shows "John Doe topped V2 (+2 pts)"

**Test 4.5: Climb Logging - ATTEMPT**
```
1. Keep same student selected
2. Select grade: "V3"
3. Tap "ATTEMPT" button  
4. Verify success message with attempt points
5. Check stats update
```
**Expected Result**: Success message shows "John Doe attempted V3 (+1.5 pts)"

**Test 4.6: Multiple Students**
```
1. Log climbs for 5 different students
2. Mix of TOPs and ATTEMPTs across different grades
3. Verify each climb logs successfully
4. Note different point values for different grades
```
**Expected Result**: All climbs log correctly with appropriate points

### Phase 5: Live Scoreboard Testing

**Test 5.1: Scoreboard Access**
```
1. Open scoreboard URL on computer
2. Verify beautiful display with gradient background
3. Confirm session information appears at top
4. Check leaderboard shows all students
```
**Expected Result**: Professional scoreboard display

**Test 5.2: Real-time Updates**
```
1. Keep scoreboard open on computer
2. Log additional climbs on phone/tablet
3. Wait 3-5 seconds for auto-refresh
4. Verify scoreboard updates with new scores
```
**Expected Result**: Scoreboard updates automatically showing new rankings

**Test 5.3: Ranking Display**
```
1. Verify students sorted by total points (highest first)
2. Check top 3 positions show medals (🥇🥈🥉)
3. Confirm efficiency percentages calculate correctly
4. Verify all statistics display properly
```
**Expected Result**: Proper ranking with medals and accurate statistics

### Phase 6: Data Validation

**Test 6.1: Spreadsheet Data**
```
1. Check Climbs_[SessionID] sheet
2. Verify all logged climbs appear with:
   - Correct timestamps
   - Student names and IDs
   - Grades and results
   - Calculated points
```
**Expected Result**: All climb data properly recorded

**Test 6.2: Session Statistics**
```
1. Check Sessions sheet
2. Verify Total_Climbs count updates
3. Confirm session status shows "Active"
```
**Expected Result**: Session metadata properly maintained

### Phase 7: Session Completion

**Test 7.1: End Session**
```
1. In admin panel, click "End Session"
2. Confirm end session dialog
3. Verify session ends successfully
4. Check Current Session section shows "No active session"
```
**Expected Result**: Session properly closed

**Test 7.2: Final Data Check**
```
1. Verify Sessions sheet shows status "Complete"
2. Confirm Climbs sheet data preserved
3. Check scoreboard shows "No active session"
4. Verify scoring interface shows "No active session"
```
**Expected Result**: All data preserved, system ready for new session

### Phase 8: Export Testing

**Test 8.1: Session Export**
```
1. In admin panel, click "Export Last Session"
2. Verify CSV download initiates
3. Open downloaded file
4. Confirm all climb data present in CSV format
```
**Expected Result**: Complete session data exported successfully

## Performance Testing

### Stress Test: Rapid Logging
```
1. Start new session with same test class
2. Rapidly log 20-30 climbs across multiple students
3. Monitor for any errors or delays
4. Verify scoreboard updates remain smooth
```
**Expected Result**: System handles rapid input without errors

### Multi-Device Test
```
1. Open scoring interface on 2-3 devices simultaneously
2. Log climbs from different devices
3. Verify all data synchronizes properly
4. Check for any conflicts or lost data
```
**Expected Result**: Multi-device usage works correctly

## Error Testing

### Invalid Data Handling
```
1. Try to start session without selecting class
2. Attempt to log climb without student selection
3. Test with empty instructor name
```
**Expected Result**: Appropriate error messages, no system crashes

### Network Issues
```
1. Temporarily disconnect internet during climb logging
2. Reconnect and verify data integrity
3. Test with slow network conditions
```
**Expected Result**: Graceful handling of connectivity issues

## Acceptance Criteria Verification

Based on the original requirements, verify:

- ✅ **Import students**: CSV import working correctly
- ✅ **Record climbs**: Mobile-friendly interface operational  
- ✅ **Live scoreboard**: Real-time updates functioning
- ✅ **Export results**: CSV export available
- ✅ **Single session**: System handles one session properly
- ✅ **Historical data**: Previous sessions preserved

## Test Results Template

Document your testing results:

```
Test Date: _______________
Tester: _______________
Browser: _______________
Mobile Device: _______________

Phase 1 - System Initialization: PASS/FAIL
Phase 2 - Data Setup: PASS/FAIL  
Phase 3 - Session Management: PASS/FAIL
Phase 4 - Scoring Interface: PASS/FAIL
Phase 5 - Live Scoreboard: PASS/FAIL
Phase 6 - Data Validation: PASS/FAIL
Phase 7 - Session Completion: PASS/FAIL
Phase 8 - Export Testing: PASS/FAIL

Issues Found:
1. _______________
2. _______________

Overall System Status: READY FOR PRODUCTION / NEEDS FIXES
```

## Common Issues and Solutions

**Issue**: Students not appearing in dropdown
**Solution**: Check class names match exactly, verify Active = TRUE

**Issue**: Scoreboard not updating
**Solution**: Wait 3-5 seconds, manually refresh with 'R' key

**Issue**: Google authentication errors  
**Solution**: Re-authorize in Apps Script, check deployment permissions

**Issue**: Import fails
**Solution**: Verify CSV format, check for special characters in names

This testing guide ensures your HVT system is fully functional before live use with actual climbing sessions.