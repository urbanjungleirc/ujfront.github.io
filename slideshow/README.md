# Google Drive Slideshow

Fullscreen slideshow for TV displays with live competition leaderboards. Shows images, videos, and real-time competition data from a Google Drive folder.

## Setup

1. **Google Drive**: Create public folder, copy folder ID from URL
2. **API Key**: Get Google Drive API key from [Google Cloud Console](https://console.cloud.google.com/)
3. **Launch**: `index.html?folder=FOLDER_ID&key=API_KEY`

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
- **Leaderboards** (any filename containing "leaderboard.md"): Show live competition data

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
└── 03_closing.mp4
```

## Troubleshooting

- **Images not loading**: Check folder is public ("Anyone with link can view")
- **Config not working**: Put settings in file **description**, not file content  
- **Leaderboards not showing**: Filename must contain "leaderboard" and end with `.md`

## TV Display Tips

- Press F11 for fullscreen
- Disable computer sleep mode  
- Images fill entire screen (no black bars)