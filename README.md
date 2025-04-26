# Calendar Assistant

A versatile web application for managing calendar events with both viewing and AI-assisted creation capabilities.

## Features

### Calendar Viewer
- Upload and parse Google Calendar ICS files
- Display calendar events in a structured table
- Filter events by date range (start date to end date)
- Filter events by name (include events containing keywords)
- Filter events by duration (less than, greater than, or equal to)
- Export filtered events to a new ICS file
- Add individual events directly to Google Calendar

### AI Event Creator
- Create calendar events using natural language descriptions
- Uses OpenAI API to intelligently parse event details
- Extract event title, date, time, duration, and location
- Local fallback parsing when API is unavailable
- Export generated events to ICS files
- Add generated events directly to Google Calendar

## Usage

### Calendar Viewer
1. Open the application in your web browser
2. Click the "Calendar Viewer" tab (active by default)
3. Upload your Google Calendar ICS file
4. View your events in the table
5. Apply filters to find specific events
6. Export filtered events or add them to Google Calendar

### AI Event Creator
1. Click the "AI Event Creator" tab
2. Enter a natural language description of your event
   - Example: "Lunch with Sarah next Tuesday at noon for 1 hour"
   - Example: "Team meeting in Conference Room B on Friday at 3pm for 2 hours"
3. Enter your OpenAI API key (starting with "sk-")
4. Click "Generate Event"
5. Review the generated event details
6. Download as ICS or add to Google Calendar

## How to Export Google Calendar ICS Files

1. Open Google Calendar
2. Click on the gear icon and select "Settings"
3. Click on "Import & Export"
4. Under "Export", click on "Export" to download your calendar as an ICS file

## Technical Details

### Technologies Used
- HTML/CSS/JavaScript (vanilla - no frameworks)
- ical.js for parsing and generating ICS files
- OpenAI API for natural language processing
- Responsive design for use on different devices

### Implementation Details
- Tabbed interface for easy navigation
- Client-side processing - no server required
- API keys are never stored and only used locally
- Fallback mechanisms for when API is unavailable

## Development

### Local Setup
1. Clone this repository
2. Open index.html in your web browser
3. No build process or dependencies required

### Adding New Features
- The codebase is organized into logical components
- Each tab's functionality is contained in separate JS files
- CSS is organized by component for easy styling