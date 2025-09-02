# Slideshow Configuration

## Basic Settings
default_duration: 5
folder_title: "UJ slideshow"

## Google Sheets Integration
leaderboard_sheet_id: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
leaderboard_refresh: 300

## Leaderboard Slides Configuration
# Each leaderboard slide will be triggered by a file named: leaderboard_[name].md
# For example: leaderboard_speed.md, leaderboard_rainbow.md, leaderboard_opens.md

### Speed Leaderboard (triggered by leaderboard_speed.md)
speed_title: "Speed Leaderboard"
speed_categories:
  - name: "Male Youth 13-18 yo"
    sheet: "Speed"
    filter_column: "Category" 
    filter_value: "Male Youth"
    color: "#cc0000"
  - name: "Female Youth 13-18 yo"
    sheet: "Speed"
    filter_column: "Category"
    filter_value: "Female Youth"
    color: "#cc0000"

### Rainbow Route (triggered by leaderboard_rainbow.md)
rainbow_title: "Rainbow Route"
rainbow_categories:
  - name: "Male Youth 18+"
    sheet: "Rainbow"
    filter_column: "Category"
    filter_value: "Male Youth"
    color: "#ff8800"
  - name: "Female Youth 18+"
    sheet: "Rainbow"
    filter_column: "Category" 
    filter_value: "Female Youth"
    color: "#ff8800"

### Opens Leaderboard (triggered by leaderboard_opens.md)
opens_title: "Speed Leaderboard"
opens_categories:
  - name: "Male Opens"
    sheet: "Opens"
    filter_column: "Category"
    filter_value: "Male Opens"
    color: "#cc0000"
  - name: "Female Opens" 
    sheet: "Opens"
    filter_column: "Category"
    filter_value: "Female Opens"
    color: "#cc0000"

## File Duration Examples
# Rename your files to control display duration:
# [30]important-announcement.jpg    → Shows for 30 seconds
# [5]quick-message.png             → Shows for 5 seconds  
# my-regular-image.jpg             → Uses default duration (10s)
# climbing-video.mp4               → Plays full length
# leaderboard_speed.md             → Triggers speed leaderboard
# leaderboard_rainbow.md           → Triggers rainbow route leaderboard