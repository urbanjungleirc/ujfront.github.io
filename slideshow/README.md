# Google Drive Slideshow - Setup Guide

A fullscreen slideshow application that displays images, videos, and live leaderboards from a Google Drive folder. Perfect for climbing gyms, sports events, or any venue needing dynamic content display with real-time competition data.

## ✨ Features

- **Mixed Content Display**: Images, videos, and leaderboards in alphabetical order
- **Live Competition Data**: Real-time leaderboard integration via Google Apps Script
- **Smart Duration Control**: Configure display time via filename prefixes `[30]image.jpg`
- **File Description Configuration**: Use Google Drive file descriptions for settings
- **Professional Leaderboard Styling**: Multi-column layouts with custom colors and bracket formatting
- **Smooth Transitions**: Fade effects between slides with overlay animations
- **Fullscreen Display**: Optimized for TV browsers and large displays

## Quick Start

1. **Set up Google API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable **Google Drive API** in APIs & Services > Library
   - Create an **API Key** in APIs & Services > Credentials
   - Restrict the key to only Google Drive API

2. **Prepare Google Drive folder**
   - Create a public folder in Google Drive
   - Share it: Right-click → Share → "Anyone with the link" → "Viewer"
   - Copy the folder ID from the URL (long string after `/folders/`)

3. **Launch slideshow**
   ```
   index.html?folder=YOUR_FOLDER_ID&key=YOUR_API_KEY
   ```

## Configuration

### General Settings (Optional)

Create a file called `settings.txt` in your Google Drive folder, then add configuration in the file's **description** (right-click → File information → Description):

```
default_duration: 5
folder_title: My Slideshow
```

**Available Settings:**
- `default_duration`: Default seconds to show each image (default: 10)
- `folder_title`: Display title for your slideshow (default: "Slideshow")

### File Duration Control

**Method 1: Filename Prefixes (Recommended for Staff)**
Add `[seconds]` to the beginning of filename:

- `[30]important-announcement.jpg` → Shows for 30 seconds
- `[5]quick-message.png` → Shows for 5 seconds  
- `regular-image.jpg` → Uses default duration (10s)
- `video.mp4` → Plays full length

**Method 2: File Description (Advanced)**
Set duration by adding `duration: X` to the file's description:

```
duration: 30
Welcome to the climbing competition!
This is the main announcement.
```

**File Naming for Organization:**
- `01 welcome.jpg` - Use numbers for ordering
- `02 announcement.png` - Files display in alphabetical order
- `11 leaderboard kids.md` - Leaderboard files work with any naming

## Content Types

### Images
- **Supported formats:** JPG, PNG, GIF, WebP
- **Display:** Centered, scaled to fit screen
- **Duration:** Configurable via filename or settings

### Videos
- **Supported formats:** MP4, WebM, MOV
- **Display:** Fullscreen, plays audio
- **Duration:** Full video length (auto-advances when finished)

### Leaderboards

Create leaderboard files with flexible naming:
- `leaderboard_speed.md` 
- `11 [15] leaderboard kids.md` (with numbering and custom duration)
- `05 leaderboard_rainbow.md`
- Any filename containing `leaderboard` and ending in `.md`

Configure live data display by adding this to the file's **description**:

```
title: Speed Climbing Championship
route_type: Official Speed
limit: 12

table: Male Open
gender: Male
category: open
color: #cc0000

table: Female Open
gender: Female
category: open
color: #cc0000
```

**Live Data Integration:**
- ✅ **Real-time data**: Connects to Google Apps Script endpoint for live competition results
- ✅ **One-time loading**: Data fetched once at slideshow startup for optimal performance
- ✅ **Shared dataset**: Same data used across all leaderboard slides with different filters
- ✅ **Smart filtering**: Each leaderboard can show different categories/genders from the same dataset
- ✅ **Auto-refresh**: Data refreshes when slideshow restarts

**Global Configuration Options:**
- `title`: Display title for the leaderboard
- `route_type`: Filter by route type (see available routes below)
- `limit`: Number of top competitors to show per table (default: 12)
- `data_url`: Custom data source URL (optional, uses default competition data)

**Available Route Types:**
- `Official Speed` - Standard speed climbing route
- `Youth Speed` - Youth-specific speed route
- `Rainbow` - Rainbow route climbing

**Table Configuration:**
- `table`: Display name for the table/column header
- `gender`: Filter by gender (see options below)
- `category`: Filter by age category (see options below)  
- `color`: Header background color (hex color code)
- `limit`: Number of competitors for this specific table (optional)

**Example with Different Table Limits:**
```
title: Speed Leaderboard
route_type: Official Speed
duration: 15

table: Male Youth (13-18yo)
gender: Male  
category: youth
color: #cc0000
limit: 10

table: Female Youth (13-18yo)
gender: Female
category: youth
color: #cc0000
limit: 14
```

**Available Gender Filters:**
- `Male` - Show only male competitors
- `Female` - Show only female competitors  
- *(empty/blank)* - Show all genders

**Available Category Filters:**
- `open` - Open category (all ages, or shows all when used with gender filters)
- `kids` - Kids category
- `youth` - Youth category
- `masters` - Masters category

**Modern Styling Features:**
- ✅ **Bracket formatting**: Text in parentheses like "(13-18yo)" appears smaller and right-aligned
- ✅ **Modern design**: Gradient headers, improved typography, subtle animations  
- ✅ **Per-table limits**: Each table can show different numbers of competitors
- ✅ **Multi-column layouts**: Display multiple categories side-by-side
- ✅ **Professional appearance**: Optimized for large displays and TV screens

**Multiple Tables:** Add more `table:` sections to display multiple columns side-by-side.

**Example Multi-Table Configuration:**
```
title: Youth Championships
route_type: Official Speed
limit: 10

table: Male Youth (13-18yo)
gender: Male
category: youth
color: #cc0000
limit: 8

table: Female Youth (13-18yo)  
gender: Female
category: youth
color: #cc0000
limit: 12
```

## File Organization

### Alphabetical Ordering
Files are displayed alphabetically by name. Use prefixes to control order:
- `01_opening.jpg`
- `02_results.jpg`
- `03_closing.jpg`
- `leaderboard_speed.md`

### Title & Description Overlays

Add text overlays by editing the **file description** in Google Drive:

**Single paragraph:** Shows as description only
```
Great climbing performance today!
```

**Multiple paragraphs:** First = title, rest = description
```
Championship Results

Final standings from today's competition.
Congratulations to all participants!
```

## Folder Structure Example

```
📁 My Slideshow Folder/
├── settings.txt (description: "default_duration: 5")
├── 01_welcome.jpg
├── [30]02_important-notice.png
├── 03_climbing-video.mp4
├── leaderboard_speed.md (description: leaderboard config)
├── leaderboard_rainbow.md (description: leaderboard config)
└── 04_closing.jpg
```

## Troubleshooting

### Images Not Loading
- **Check folder sharing:** Must be "Anyone with the link can view"
- **Verify API key:** Should only have Google Drive API enabled
- **Check file formats:** Use standard web formats (JPG, PNG, MP4)

### Configuration Not Loading
- **File descriptions:** Settings must be in file descriptions, not file contents
- **Case sensitive:** Setting names like `default_duration` must be exact
- **Syntax:** Use `key: value` format, one per line

### Leaderboard Not Showing
- **Filename format:** Must contain `leaderboard` and end with `.md` (flexible naming supported)
- **Description format:** Use exact syntax shown above  
- **Table configuration:** Each table needs `table:`, `gender:`, `category:`, `color:`
- **Live data:** Check browser console (F12) for data loading errors

## Advanced Configuration

### URL Parameters
```
index.html?folder=FOLDER_ID&key=API_KEY&debug=true
```

### TV/Display Optimization
- **Fullscreen:** Press F11 or use browser fullscreen mode
- **Prevent sleep:** Disable computer sleep/screensaver
- **Auto-start:** Set browser as startup application

### Content Management Tips
- **Staff training:** Show staff how to edit file descriptions for settings
- **Duration testing:** Use short durations for testing, longer for production
- **Backup config:** Keep a copy of your settings and leaderboard configurations

## Support

For technical issues:
1. Check browser console (F12) for error messages
2. Verify all files are accessible when logged out of Google
3. Test API key with the Google APIs Explorer
4. Ensure stable internet connection for Drive API calls

## File Size Recommendations
- **Images:** Under 5MB for fast loading
- **Videos:** Under 50MB for reliable playback
- **Total folder:** Monitor for smooth performance on TV browsers

## Recent Updates (January 2025)

### ✅ Latest Features
- **Fixed slide content duplication** - Each slide now shows unique content
- **Improved bracket formatting** - Parenthetical text in leaderboard headers displays properly
- **Enhanced file type handling** - Better separation of image/video vs leaderboard processing
- **Added comprehensive debugging** - Console logs help troubleshoot issues
- **Optimized performance** - One-time data loading for better slideshow performance

### 🔧 Technical Improvements
- **Flexible filename detection** - Leaderboard files can use various naming patterns
- **Smart description parsing** - Different handling for content types
- **Better error handling** - Graceful fallbacks when data isn't available
- **Live data integration** - Real-time competition data from Google Apps Script

---

**Status:** This slideshow is production-ready with live data integration and modern styling. Perfect for climbing competitions and sports events!