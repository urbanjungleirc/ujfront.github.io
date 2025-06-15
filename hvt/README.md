# High-Volume Training (HVT) - Boulder Session Tracker

A Google Apps Script-based system for tracking indoor bouldering sessions, designed for climbing gyms and instructors to monitor student progress in real-time.

## Features

### Core Functionality
- **Student Management**: Organize students into classes for easy session setup
- **Real-time Scoring**: Mobile-friendly interface for logging climbs during sessions
- **Live Scoreboard**: Computer display showing rankings, points, and statistics
- **Session History**: Complete tracking of all sessions and climbs for progress analysis

### Scoring System
- **Configurable Grades**: V0-V10 with customizable point values
- **Dual Results**: TOP (completed) vs ATTEMPT (not completed) scoring
- **Default Scoring**: V0=0.4pts, V1=1pt, V2=2pts... V10=10pts (attempts = 50% of base)
- **Statistics**: Total points, success rate, attempt count per student

### User Interfaces
1. **Admin Panel**: Session management, student import, class setup
2. **Scoring Interface**: Mobile-optimized for instructors to log climbs
3. **Live Scoreboard**: Real-time display for students and spectators

## Quick Start

1. **Setup**: Follow [SETUP.md](SETUP.md) for complete installation
2. **Import Students**: Use CSV import or manual entry via admin panel
3. **Start Session**: Select class and instructor, system loads all students
4. **Log Climbs**: Use scoring interface on phone/tablet
5. **Display Results**: Show live scoreboard on computer screen

## File Structure

```
hvt/
├── Code.gs              # Google Apps Script backend
├── admin.html           # Admin panel interface
├── scoring.html         # Mobile scoring interface  
├── scoreboard.html      # Live scoreboard display
├── SETUP.md            # Complete setup instructions
├── README.md           # This file
└── CHANGELOG.md        # Version history and updates
```

## Data Structure

The system uses Google Sheets with the following structure:

### Students Sheet
| ID | First_Name | Last_Name | Class | Active |
|----|------------|-----------|-------|--------|
| STU001 | John | Doe | Beginner | TRUE |

### Classes Sheet
| Class_Name | Description | Skill_Level | Student_Count |
|------------|-------------|-------------|---------------|
| Beginner | New climbers | V0-V3 | 15 |

### Sessions Sheet
| SessionID | Date | Instructor | Class | Student_Count | Status | Total_Climbs |
|-----------|------|------------|-------|---------------|--------|--------------|
| SES001 | 2025-01-15 | Jane Smith | Beginner | 12 | Active | 45 |

### Climbs_[SessionID] Sheet
| Timestamp | Student_ID | Student_Name | Grade | Result | Points |
|-----------|------------|--------------|-------|--------|--------|
| 2025-01-15 14:30:15 | STU001 | John Doe | V3 | TOP | 3 |

## Usage Guide

### Starting a Session
1. Open admin panel
2. Select class from dropdown
3. Enter instructor name
4. Click "Start Session"
5. Students auto-loaded from selected class

### Logging Climbs
1. Open scoring interface on phone/tablet
2. Select student from dropdown
3. Select grade (V0-V10)
4. Tap TOP or ATTEMPT
5. Interface provides immediate feedback

### Viewing Results
1. Open scoreboard on computer/projector
2. Auto-refreshes every 3 seconds
3. Shows rankings, points, success rates
4. Press 'R' or spacebar to manually refresh

### Managing Students
- **Import**: CSV format with First Name, Last Name columns
- **Classes**: Group students for easy session setup
- **Activation**: Mark students active/inactive as needed

## API Endpoints

The system exposes these actions via POST requests:

- `getClasses` - List all classes
- `getStudentsByClass` - Get students in a specific class
- `startSession` - Begin new session with class and instructor
- `getCurrentSession` - Get active session details
- `logClimb` - Record a climb attempt
- `getScoreboard` - Get real-time leaderboard
- `endSession` - Close active session
- `importStudents` - Bulk import students from CSV
- `exportSession` - Download session data as CSV

## Customization

### Scoring Rules
Edit the Config sheet to modify point values:
- **Base Value**: Points awarded for TOP
- **Attempt Value**: Points awarded for ATTEMPT
- Typically attempt = 50% of base value

### Grade Ranges
Default V0-V10 can be modified in the scoring interface JavaScript.

### Refresh Rates
- Scoreboard: 3 seconds (configurable in scoreboard.html)
- Student stats: 30 seconds (configurable in scoring.html)

## Browser Compatibility

- **Chrome/Edge**: Full support, recommended
- **Safari**: Full support
- **Firefox**: Full support
- **Mobile**: Optimized for iOS/Android browsers

## Limitations

- **Concurrent Sessions**: One active session at a time
- **Student Limit**: Optimized for 5-15 students per session
- **Internet Required**: No offline capability
- **Google Workspace**: Requires Google account for authentication

## Development

### Local Development
1. Use Google Apps Script editor for backend changes
2. Edit HTML files directly in Apps Script interface
3. Test changes with "Test as web app" feature

### Deployment
1. Save all changes in Apps Script
2. Deploy new version when ready
3. Historical data preserved across versions

## Performance

- **Lightweight**: Minimal external dependencies
- **Fast**: Bootstrap CSS + vanilla JavaScript
- **Efficient**: Smart caching reduces API calls
- **Scalable**: Handles multiple concurrent users

## Security

- **Authentication**: Google Workspace integration
- **Data Privacy**: All data within your Google Workspace
- **Access Control**: Configurable web app permissions
- **No External Services**: Complete Google ecosystem solution

## Support

### Troubleshooting
- Check Google Apps Script execution log
- Verify spreadsheet permissions
- Test with simple session first

### Common Issues
- **Students not loading**: Check class names match exactly
- **Interface not responsive**: Clear browser cache
- **Authentication errors**: Re-authorize in Apps Script

## License

This project is designed for educational and non-commercial use in climbing gyms and training facilities.

## Contributing

To suggest improvements or report issues:
1. Test the issue thoroughly
2. Document steps to reproduce
3. Include browser/device information
4. Provide suggested solutions if possible