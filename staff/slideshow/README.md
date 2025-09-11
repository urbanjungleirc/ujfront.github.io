# Google Drive Slideshow

Fullscreen slideshow for TV displays with live competition leaderboards and dynamic backgrounds. Shows images, videos, and real-time competition data from Google Drive with OAuth authentication.

## Setup

1. **Google OAuth**: Open `index.html` and authenticate with Google Drive
2. **Select Folder**: Choose your slideshow folder from the browser interface
3. **Start Slideshow**: Click the green button to begin presentation

**Note**: OAuth integration replaces manual API keys - just login and select your folder!

## Configuration

Create `settings.txt` in Google Drive folder, add config to file **description**:

```
default_slide_duration_seconds: 10
slideshow_auto_reload_minutes: 5
default_leaderboard_row_limit: 12
```

## File Types

- **Images** (JPG, PNG): Display fullscreen (stretched to fill screen)
- **Videos** (MP4, MOV): Play full length with audio  
- **Leaderboards** (any filename containing "leaderboard.md"): Show live competition data with dynamic backgrounds
- **Background Images** (filename contains "leaderboard_bg"): Used as alternating backgrounds for leaderboard slides

## Duration Control

- **Filename**: `[30]image.jpg` = 30 seconds
- **File description**: Add `duration: 15` to any file's description
- **Default**: Uses global setting (10 seconds)

Files display **alphabetically** - use `01_`, `02_` prefixes to control order.

## Leaderboards

Create `.md` files with "leaderboard" in filename. Add config to file **description**:

```
title: Speed Championship
duration: 15

table: Male Youth | 13-18yo
gender: Male
category: youth
color: #cc0000
limit: 10

table: Female Youth | 13-18yo  
gender: Female
category: youth
color: #cc0000
limit: 15
```

**Options:**
- `gender`: Male, Female, or blank (all)
- `category`: open, youth, kids, masters  
- `color`: Header color (#cc0000)
- `limit`: Number of competitors to show

### Leaderboard Backgrounds

Add dynamic backgrounds to leaderboard slides:

1. **Upload background images** with `leaderboard_bg` in filename (e.g., `leaderboard_bg1.jpg`, `leaderboard_bg_climbing.png`)
2. **Automatic alternating**: Backgrounds alternate left/right between slides for visual variety
3. **Professional styling**: Full-height images with blur fade effects toward center
4. **Content focus**: Leaderboard tables remain clearly visible (66% screen width)

**Layout:**
- **Slide 1**: Background LEFT (33%) | Content RIGHT (66%)  
- **Slide 2**: Content LEFT (66%) | Background RIGHT (33%)
- **Slide 3**: Background LEFT (33%) | Content RIGHT (66%) (repeats pattern)

## Text Overlays

Add text to images by editing the **file description** in Google Drive:

- **Single line**: Shows as description  
- **Multiple lines**: First line = title, rest = description

## Example Folder

```
📁 Competition Slideshow/
├── settings.txt (config in description)
├── 01_welcome.jpg
├── [30]02_announcement.png  
├── leaderboard_speed.md (config in description)
├── leaderboard_bg1.jpg (background image)
├── leaderboard_bg_climbing.png (background image)
└── 03_closing.mp4
```

## Troubleshooting

- **Images not loading**: Check folder is public ("Anyone with link can view")
- **Config not working**: Put settings in file **description**, not file content  
- **Leaderboards not showing**: Filename must contain "leaderboard" and end with `.md`

## Continuous Display Features ✨ NEW

**Perfect for unattended TV displays and long-running competitions:**

- ✅ **Runs indefinitely** - No user logout or interruption
- ✅ **Auto-refresh content** - Updates slides and data without breaking slideshow
- ✅ **Soft reloads** - Refreshes content seamlessly, continues playing from next slide
- ✅ **Token management** - Handles authentication automatically in background
- ✅ **Error resilience** - Continues playing even if occasional updates fail

**How it works:**
- Slideshow runs continuously through all slides in alphabetical order
- Every N minutes (configurable via `slideshow_auto_reload_minutes`), content refreshes automatically
- New files, updated leaderboards, and config changes are picked up automatically
- Authentication stays active - no re-login required for hours/days of operation
- If refresh fails, slideshow continues uninterrupted with existing content

## TV Display Setup

1. **Open slideshow** and authenticate with Google Drive
2. **Select folder** and start slideshow  
3. **Press F11** for fullscreen mode
4. **Leave running** - slideshow will continue indefinitely
5. **Disable sleep mode** on computer/TV for 24/7 operation

**Key controls:**
- **F11**: Toggle fullscreen
- **Escape**: Exit slideshow → return to folder browser  
- **Arrow Right / Spacebar**: Manual next slide
- **Auto-loop**: Automatically restarts from first slide after reaching end

## Configuration for Continuous Operation

In your `settings.txt` file description:

```
default_slide_duration_seconds: 8
slideshow_auto_reload_minutes: 10    # Refresh content every 10 minutes
slideshow_title: My Competition Display
default_leaderboard_row_limit: 12
```

**Recommended settings for competitions:**
- `slideshow_auto_reload_minutes: 5-15` for frequent leaderboard updates
- `default_slide_duration_seconds: 8-10` for good pacing
- Test with shorter intervals first, then extend for stability