# Calendar Assistant

A versatile web application for managing calendar events with both viewing and AI-assisted creation capabilities.

## Notes about this app

The app was entirely made with Claude code for fun, the total cost of the app charged by Claude was about seven dollars.

Why this app (other than testing claude code):

- A local after school center has both longer afterschool and daycare programs and shorter focused sessions. They provided a google calendar file for all the events in a single ics file, of which most contents are the longer sessions which happen almost all day, meaning it doesn't make sense to add them in our calendar. Previously, I just used shell script to parse the file to grep the lines for the ones I wanted to import in google. The first tab was created for this purpose
- The 2nd and 3rd tab are to quickly add some events without clicking around google calendar, I remember google had this function but I can not find it now. The 2nd tab uses openAI api, while the 3rd tab uses puter.js. Hopefully the puter.js stays free (thanks to its free api services!)

The app can be accessed at: https://dnageek.github.io/calendar.playground/

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

### Puter.js Event Creator
- Create calendar events using natural language with no API key required
- Uses Puter.js to access advanced AI models (GPT-4o)
- Same capabilities as the OpenAI version but with zero setup
- No API keys or billing required
- Seamless AI-powered event creation
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

### Puter.js Event Creator
1. Click the "Puter.js Creator" tab
2. Enter a natural language description of your event
   - Example: "Lunch with Sarah next Tuesday at noon for 1 hour"
   - Example: "Team meeting in Conference Room B on Friday at 3pm for 2 hours"
3. Click "Generate Event" (no API key needed!)
4. Review the generated event details
5. Download as ICS or add to Google Calendar

**Note:** The Puter.js tab provides the same functionality as the AI Event Creator but doesn't require an API key. It's the recommended option for most users.

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
