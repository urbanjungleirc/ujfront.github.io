# Google Drive Slideshow - Developer Handoff

## Project Overview
A fullscreen slideshow web application that displays content from a Google Drive folder on TV browsers. Supports images, videos, and dynamic leaderboards for climbing competitions.

## Current Implementation Status ✅
- **Complete HTML slideshow** with Google Drive API integration
- **Alphabetical file ordering** (user requirement)
- **Custom duration control** via filename prefixes: `[30]image.jpg`
- **Professional leaderboard styling** matching provided examples
- **Error handling** for access issues and missing files
- **Fullscreen responsive design**
- **Smooth transitions** between slides with fade effects
- **Smart title/description parsing** from Google Drive file descriptions
- **Google Sheets configuration system** (needs debugging)

## Project Structure
```
project/
├── index.html              # Main slideshow application (renamed from slideshow.html)
├── config.md              # Configuration template (reference only, not used by app)
├── CLAUDE.md              # This handoff document
└── README.md              # Setup instructions (to be created)
```

## Key Requirements & Implementation Details

### 1. Content Display Order
- **ALPHABETICAL by filename** (user specifically requested this over content type grouping)
- All files (images, videos, leaderboards) mixed together alphabetically
- Example: `aaa-image.jpg`, `bbb-video.mp4`, `ccc-leaderboard_speed.md`

### 2. Duration Control System
**Implementation: Filename prefixes**
```
[30]my-image.jpg          → 30 seconds display
[5]quick-message.png      → 5 seconds display  
my-regular-image.jpg      → Default duration (10s)
video.mp4                 → Full length playback
```
User chose this approach as "easiest for non-technical users"

### 3. Leaderboard System
**Trigger Files:** Place `.md` files in Drive folder to trigger leaderboard slides
- `leaderboard_speed.md` → Speed climbing leaderboard
- `leaderboard_rainbow.md` → Rainbow route leaderboard  
- `leaderboard_opens.md` → Opens category leaderboard

**Visual Requirements from User Examples:**
- Dual-column layout (Male/Female or different age groups)
- Custom header colors per category (#cc0000 for Speed, #ff8800 for Rainbow)
- Ranking numbers, competitor names, times
- Professional styling with background climbing imagery
- Sample data structure matches: `{ rank, name, time }`

### 4. Configuration System
**File:** `config.md` placed in Google Drive folder
```markdown
default_duration: 10
folder_title: "Championship Results 2024"
leaderboard_sheet_id: "google-sheet-id-here"
leaderboard_refresh: 300
```

### 5. URL Structure
```
index.html?folder=GOOGLE_DRIVE_FOLDER_ID&key=GOOGLE_API_KEY&config=CONFIG_SHEET_ID
```

### 6. Title/Description System ✅ IMPLEMENTED
- Uses Google Drive file descriptions for overlay content
- **Single paragraph**: Shows as description only
- **Multiple paragraphs**: First paragraph = title, rest = description
- **No description**: No overlays shown (clean display)

### 7. Smooth Transitions ✅ IMPLEMENTED  
- 0.8s fade transitions between slides
- Staggered overlay animations (title appears first, then description)
- Cross-fade prevents jarring content switches

## Technical Architecture

### Current Implementation
- **Client-side only** - No backend required
- **Google Drive API v3** for file listing and content access
- **Vanilla JavaScript** - No frameworks
- **CSS Grid/Flexbox** for responsive leaderboard layouts
- **HTML5 Video** for full-length video playback

### API Integration Points
1. **Google Drive API:**
   - List files in folder: `/drive/v3/files?q='FOLDER_ID'+in+parents`
   - Download images: `/uc?id=FILE_ID&export=download`
   - Embed videos: `/file/d/FILE_ID/preview`

2. **Google Sheets API (TODO):**
   - Read leaderboard data: `/sheets/v4/spreadsheets/SHEET_ID/values/RANGE`
   - Currently using sample data matching user's format

### File Type Processing
```javascript
// Current logic in processFiles()
if (name.startsWith('leaderboard_') && name.endsWith('.md')) return 'leaderboard';
if (mimeType.startsWith('image/')) return 'image';
if (mimeType.startsWith('video/')) return 'video';
return 'unsupported';
```

## URGENT ISSUE - Google Sheets Configuration 🚨

### Current Problem
The slideshow has been updated to use Google Sheets for configuration (much better for staff than config.md files), but there's a persistent 403 Forbidden error when accessing the config sheet.

**User's Config Sheet ID:** `1yEFsc5CDnL0Y4gl9Qyigp_h3aOWz3762_okIPoKNwq0`
**Test URL:** `index.html?folder=1lfEFF0OfRVj1w24LdsmT3grXGrn6-dJB&key=AIzaSyAL0c1mpOJImMGiDA6XtMV2aPA2mWgdrJE&config=1yEFsc5CDnL0Y4gl9Qyigp_h3aOWz3762_okIPoKNwq0`

**Expected Config Sheet Structure:**
| Setting Name | Value |
|--------------|-------|
| default_duration | 5 |
| folder_title | UJ slideshow |
| leaderboard_sheet_id | (leaderboard data sheet) |
| leaderboard_refresh | 300 |

### Debugging Steps Already Tried:
1. ✅ User enabled Google Sheets API in Google Cloud Console
2. ✅ User updated API key restrictions to include Google Sheets API + Google Drive API
3. ✅ Config sheet is public (Anyone with link can view)
4. ✅ Sheet has "Config" tab with correct A/B column structure
5. ❌ Still getting 403 Forbidden errors

### Next Developer Should:
1. **Verify API Key Setup**: Double-check the Google Cloud Console API key has both APIs enabled
2. **Test Sheet Access**: Try accessing the sheet URL manually: `https://sheets.googleapis.com/v4/spreadsheets/1yEFsc5CDnL0Y4gl9Qyigp_h3aOWz3762_okIPoKNwq0/values/Config!A:B?key=API_KEY`
3. **Check Sheet Permissions**: Ensure sheet sharing is truly public
4. **Alternative Approach**: If Sheets API continues failing, consider embedding config directly in the HTML or using URL parameters

## Current Working Features ✅

### 1. Basic Slideshow Functionality
- ✅ **Images load perfectly** using Google Drive thumbnail API
- ✅ **Videos work** with Drive preview URLs  
- ✅ **Leaderboards display** with sample data
- ✅ **Alphabetical ordering** by filename
- ✅ **Duration control** via `[30]filename.jpg` prefixes
- ✅ **Smooth transitions** with fade effects

### 2. Google Sheets Integration (Partially Working)
- ✅ **Code implemented** for reading config from Google Sheets
- ✅ **Fallback system** works (uses defaults when config fails)
- ❌ **API access issues** preventing config loading

## Immediate Next Steps (Priority Order)

### 1. Fix Google Sheets Configuration 🔥 HIGH PRIORITY  
The configuration system is implemented but not working due to API access issues.

### 2. Live Leaderboard Data Integration 🔥 HIGH PRIORITY  
Once config is working, implement live leaderboard data from Google Sheets.

**Requirements:**
- Connect to user's competition data sheets
- Parse competitor data: name, time, category, gender
- Filter by category for different leaderboard slides  
- Auto-refresh every 5 minutes during competitions
- Handle API rate limits and errors gracefully

### 3. Production Deployment Prep 🔥 MEDIUM PRIORITY
- Create comprehensive setup documentation
- Add error logging/debugging for troubleshooting
- Test with various folder permissions and file types
- Mobile/tablet responsive testing for different TV browsers

### 4. Advanced Features (Future Enhancement)
- Real-time data updates during live competitions
- Enhanced transition animations between slides
- Remote control via URL parameters or admin interface
- Multiple folder support for different events
- Offline mode with cached data for network issues

## User Context & Domain
**Industry:** Climbing competitions (speed climbing, route climbing)
**Use Case:** TV displays at climbing gyms showing live leaderboards mixed with photos/videos
**Users:** Non-technical gym staff who need to easily update display duration by renaming files
**Environment:** TV browsers, fullscreen display, unattended operation

## Critical User Feedback & Requirements
1. **"alphabetically based on the name of the file"** - ✅ IMPLEMENTED (don't change)
2. **Filename duration control is "best and easiest approach"** - ✅ IMPLEMENTED (keep this system)
3. **Leaderboard styling** - ✅ IMPLEMENTED (user provided exact visual examples)
4. **Google Sheets data "changes regularly"** - ⚠️ NEEDS FIXING (real-time config + data essential)
5. **"Easy for staff to change settings"** - ⚠️ BLOCKED (Google Sheets config not loading)
6. **Smooth transitions** - ✅ IMPLEMENTED (fade effects between slides)
7. **Smart title/description** - ✅ IMPLEMENTED (parses from Drive file descriptions)

## Sample Data Structures

### Leaderboard Categories (from user examples):
```javascript
// Speed Leaderboard
categories: [
  {
    name: "Male Youth 13-18 yo",
    color: "#cc0000",
    data: [
      { rank: 1, name: "Max Botica", time: "4.690" },
      // ... more competitors
    ]
  },
  {
    name: "Female Youth 13-18 yo", 
    color: "#cc0000",
    data: [
      { rank: 1, name: "Christel Kotze", time: "9.930" },
      // ... more competitors  
    ]
  }
]
```

## Error Handling Requirements
- **Folder not accessible:** "Access denied" message
- **Missing config.md:** "Configuration missing" or use defaults
- **Empty folder:** "No content found"  
- **API failures:** Graceful degradation with error display
- **Malformed files:** Skip and continue slideshow

## Browser Compatibility
Target: **TV browsers** (often older, limited JavaScript support)
- Avoid modern ES6+ features where possible
- Test on older Android TV, Smart TV browsers
- Ensure video codec compatibility
- Handle slow network conditions

## Contact & Resources
- **Original conversation:** Full requirements and user examples available
- **Visual references:** 3 leaderboard example images provided by user
- **Google Drive folder structure:** User will create public test folder
- **Google Sheets:** User has existing competition data sheets

## Current Development Session Summary (Jan 2025)

### ✅ Completed This Session:
1. **Fixed Google Drive API integration** - Images and videos loading properly
2. **Implemented smooth transitions** - 0.8s fade effects between slides
3. **Smart title/description parsing** - Uses Google Drive file descriptions intelligently
4. **Google Sheets configuration system** - Code complete but blocked by API access issues
5. **Removed console noise** - Clean error handling and logging
6. **Updated URL structure** - Now supports config sheet parameter

### ⚠️ Current Blockers:
1. **Google Sheets API 403 Forbidden** - Config sheet access fails despite enabling APIs
2. **No live leaderboard data** - Dependent on fixing Sheets API access

### 🔧 Debugging Information:
- **Current slideshow URL**: `index.html?folder=1lfEFF0OfRVj1w24LdsmT3grXGrn6-dJB&key=AIzaSyAL0c1mpOJImMGiDA6XtMV2aPA2mWgdrJE`
- **Config sheet ID**: `1yEFsc5CDnL0Y4gl9Qyigp_h3aOWz3762_okIPoKNwq0`
- **Current defaults**: 10s duration, "Slideshow" title (should be 5s duration, "UJ slideshow")
- **Console logs**: Added detailed debugging for next developer

### 📁 File Status:
- `index.html` - Main application, fully functional with config system implemented
- `config.md` - Reference template only (not used by application)
- `CLAUDE.md` - This documentation file, updated for handoff

---

**Status: Slideshow functional but configuration system needs Google API debugging. Next developer should focus on resolving the 403 Forbidden error for Sheets API access.**