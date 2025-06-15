# High-Volume Training Setup Guide

## Prerequisites
- Google Account with Google Workspace access
- Basic familiarity with Google Sheets and Google Apps Script

## Step 1: Create Google Spreadsheet

1. **Create a new Google Spreadsheet**
   - Go to [sheets.google.com](https://sheets.google.com)
   - Create a new blank spreadsheet
   - Name it "High-Volume Training - [Your Gym Name]"

2. **Copy the Spreadsheet ID**
   - From the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the `SPREADSHEET_ID` part (long string of characters)

## Step 2: Set Up Google Apps Script

1. **Create Apps Script Project**
   - Go to [script.google.com](https://script.google.com)
   - Click "New project"
   - Name the project "HVT - High Volume Training"

2. **Add the Code Files**
   - Replace the default `Code.gs` content with the provided `Code.gs` file
   - Add HTML files:
     - Click the "+" next to "Files" → "HTML file" → Name: `admin`
     - Paste content from `admin.html` (remove `<!DOCTYPE html>` and `<html>`/`</html>` tags)
     - Repeat for `scoring.html` and `scoreboard.html`

3. **Configure Script Properties**
   - In Apps Script, go to "Project Settings" (gear icon)
   - Scroll to "Script Properties"
   - Add property:
     - Property: `SPREADSHEET_ID`
     - Value: Your spreadsheet ID from Step 1

4. **Enable Required APIs**
   - In Apps Script, click "Services" (+ icon)
   - Add "Google Sheets API" (if not already enabled)

## Step 3: Deploy the Web App

1. **Deploy as Web App**
   - Click "Deploy" → "New deployment"
   - Type: "Web app"
   - Description: "HVT Session Tracker v1.0"
   - Execute as: "Me"
   - Who has access: "Anyone with Google account" (or "Anyone" if you prefer)
   - Click "Deploy"

2. **Authorize the Application**
   - Click "Authorize access"
   - Choose your Google account
   - Click "Advanced" → "Go to HVT - High Volume Training (unsafe)"
   - Click "Allow"

3. **Copy the Web App URL**
   - Copy the provided web app URL
   - This will be your admin panel URL

## Step 4: Set Up Your Data

1. **Initialize Sheets Structure**
   - Access your web app URL
   - The system will automatically create the required sheets:
     - `Students` - Student roster
     - `Classes` - Class definitions  
     - `Sessions` - Session history
     - `Config` - Scoring configuration
     - Individual `Climbs_[SessionID]` sheets per session

2. **Add Your First Class**
   - In the Google Spreadsheet, go to the "Classes" sheet
   - Add a row: `Beginner | New climbers | V0-V3 | 0`
   - Add more classes as needed

3. **Import Students**
   - Prepare a CSV file with format: `First Name,Last Name`
   - Use the admin panel to import students to each class

## Step 5: Test the System

1. **Start a Test Session**
   - Open the admin panel (your web app URL)
   - Select a class and instructor name
   - Click "Start Session"

2. **Test Scoring Interface**
   - Click "Open Scoring Interface" (use on phone/tablet)
   - Select a student, grade, and log some climbs

3. **Test Live Scoreboard**
   - Click "Open Live Scoreboard" (display on computer)
   - Verify real-time updates

## URLs for Different Interfaces

- **Admin Panel**: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec`
- **Scoring Interface**: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?page=scoring`
- **Live Scoreboard**: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?page=scoreboard`

## Security Notes

- **Google Workspace Authentication**: Built-in when you set "Anyone with Google account"
- **Data Privacy**: All data stays within your Google Workspace
- **Access Control**: Limit web app access to your organization if needed

## Troubleshooting

### Common Issues

1. **"SPREADSHEET_ID not configured" error**
   - Check Script Properties has the correct SPREADSHEET_ID
   - Ensure the spreadsheet exists and is accessible

2. **Authorization errors**
   - Re-run the authorization process
   - Check that Google Sheets API is enabled

3. **Interface not loading**
   - Verify the HTML files are correctly added to Apps Script
   - Check browser console for JavaScript errors

4. **Students not appearing**
   - Verify the Classes sheet has the correct class names
   - Check that students are marked as "Active" = TRUE

### Performance Tips

- **Session Size**: Optimized for 5-15 students per session
- **Polling Rate**: Scoreboard updates every 3 seconds
- **Cache Duration**: Session data cached for 1 hour

## Backup and Maintenance

1. **Regular Backups**
   - Google Sheets automatically saves all data
   - Download copies periodically: File → Download → Excel/CSV

2. **Historical Data**
   - Each session creates its own climb sheet
   - Sessions sheet tracks all historical sessions
   - Data persists indefinitely

3. **Updates**
   - To update the system, deploy a new version in Apps Script
   - Historical data and sessions are preserved

## Support

For technical issues:
1. Check the Google Apps Script execution log
2. Verify all sheets have proper headers
3. Test with a simple session before live use

The system is designed to be robust and self-healing - most issues resolve by refreshing or restarting a session.