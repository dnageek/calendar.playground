document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('ics-file');
    const resultsSection = document.getElementById('results-section');
    const eventsBody = document.getElementById('events-body');
    const filterDateStart = document.getElementById('filter-date-start');
    const filterDateEnd = document.getElementById('filter-date-end');
    const filterEvent = document.getElementById('filter-event');
    const filterDurationOp = document.getElementById('filter-duration-op');
    const filterDurationValue = document.getElementById('filter-duration-value');
    const filterDurationUnit = document.getElementById('filter-duration-unit');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const exportFilteredBtn = document.getElementById('export-filtered');

    // Store all events for filtering and exporting
    let allEvents = [];
    let filteredEvents = [];
    // Store the original ICS component for exporting
    let originalCalendarComponent = null;

    fileInput.addEventListener('change', handleFileUpload);
    applyFiltersBtn.addEventListener('click', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);
    exportFilteredBtn.addEventListener('click', exportFilteredEvents);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const icsData = e.target.result;
            processICSFile(icsData);
        };
        reader.readAsText(file);
    }

    function processICSFile(icsData) {
        try {
            // Parse the ICS data using ical.js
            const jcalData = ICAL.parse(icsData);
            const comp = new ICAL.Component(jcalData);
            // Store original calendar component for exporting
            originalCalendarComponent = comp;
            const events = comp.getAllSubcomponents('vevent');

            if (events.length === 0) {
                displayNoEvents();
                return;
            }

            // Store and sort events by start date
            allEvents = events
                .map(event => new ICAL.Event(event))
                .sort((a, b) => a.startDate.compare(b.startDate));
            
            filteredEvents = [...allEvents];

            // Display the events in the table
            displayEvents(allEvents);
        } catch (error) {
            console.error('Error parsing ICS file:', error);
            alert('Error parsing the ICS file. Please make sure you uploaded a valid ICS file.');
        }
    }

    function displayEvents(events) {
        // Clear previous results
        eventsBody.innerHTML = '';

        // Create a row for each event
        events.forEach(event => {
            const row = document.createElement('tr');
            row.dataset.eventId = event.uid;
            
            // Format dates and times
            const startDate = formatDate(event.startDate);
            const startTime = formatTime(event.startDate);
            const endDate = formatDate(event.endDate);
            const endTime = formatTime(event.endDate);
            
            // Calculate and format event duration
            const durationText = formatDuration(event.startDate, event.endDate);
            
            // Store ISO date and duration for filtering
            row.dataset.startDate = event.startDate.toJSDate().toISOString().split('T')[0];
            row.dataset.summary = event.summary || '';
            row.dataset.duration = event.endDate.toJSDate().getTime() - event.startDate.toJSDate().getTime();
            
            // Create the table row with event details
            row.innerHTML = `
                <td>${event.summary || 'No Title'}</td>
                <td>${startDate}</td>
                <td>${startTime}</td>
                <td>${endDate}</td>
                <td>${endTime}</td>
                <td>${event.location || 'N/A'}</td>
                <td>${event.description || 'N/A'}</td>
                <td>${formatDuration(event.startDate, event.endDate)}</td>
                <td>
                    <button class="add-to-gcal-btn" data-event-id="${event.uid}">Add to Google Calendar</button>
                </td>
            `;
            
            eventsBody.appendChild(row);
            
            // Add event listener to the Google Calendar button
            const addToGcalBtn = row.querySelector('.add-to-gcal-btn');
            addToGcalBtn.addEventListener('click', () => openEventInGoogleCalendar(event));
        });

        // Show the results section
        resultsSection.classList.remove('hidden');
    }

    function applyFilters() {
        const startDateValue = filterDateStart.value;
        const endDateValue = filterDateEnd.value;
        const eventValue = filterEvent.value.toLowerCase().trim();
        const durationOp = filterDurationOp.value;
        const durationValue = parseInt(filterDurationValue.value, 10);
        const durationUnit = filterDurationUnit.value;
        
        // If no filters are applied, show all events
        if (!startDateValue && !endDateValue && !eventValue && durationOp === 'none') {
            clearFilters();
            return;
        }
        
        // Calculate milliseconds for duration comparison
        let durationMs = 0;
        if (durationOp !== 'none') {
            switch (durationUnit) {
                case 'minutes':
                    durationMs = durationValue * 60 * 1000;
                    break;
                case 'hours':
                    durationMs = durationValue * 60 * 60 * 1000;
                    break;
                case 'days':
                    durationMs = durationValue * 24 * 60 * 60 * 1000;
                    break;
            }
        }
        
        // Filter the events based on the criteria
        filteredEvents = allEvents.filter(event => {
            const eventDate = event.startDate.toJSDate().toISOString().split('T')[0];
            const eventName = (event.summary || '').toLowerCase();
            
            // Calculate event duration in milliseconds
            const startMs = event.startDate.toJSDate().getTime();
            const endMs = event.endDate.toJSDate().getTime();
            const eventDurationMs = endMs - startMs;
            
            // Date range filtering
            let dateMatches = true;
            if (startDateValue && endDateValue) {
                // Filter by date range (inclusive)
                dateMatches = eventDate >= startDateValue && eventDate <= endDateValue;
            } else if (startDateValue) {
                // Filter by start date only
                dateMatches = eventDate >= startDateValue;
            } else if (endDateValue) {
                // Filter by end date only
                dateMatches = eventDate <= endDateValue;
            }
            
            // Event name filtering
            const nameMatches = !eventValue || eventName.includes(eventValue);
            
            // Duration filtering
            let durationMatches = true;
            if (durationOp !== 'none' && !isNaN(durationValue)) {
                switch (durationOp) {
                    case 'lt':
                        durationMatches = eventDurationMs < durationMs;
                        break;
                    case 'gt':
                        durationMatches = eventDurationMs > durationMs;
                        break;
                    case 'eq':
                        // Allow a small margin (5%) for 'equal to' to account for minor differences
                        const margin = durationMs * 0.05;
                        durationMatches = Math.abs(eventDurationMs - durationMs) <= margin;
                        break;
                }
            }
            
            return dateMatches && nameMatches && durationMatches;
        });
        
        // Update the table to show only filtered events
        displayEvents(filteredEvents);
        
        // If no events match the filters
        if (filteredEvents.length === 0) {
            displayNoEvents(true);
        }
    }
    
    function clearFilters() {
        filterDateStart.value = '';
        filterDateEnd.value = '';
        filterEvent.value = '';
        filterDurationOp.value = 'none';
        filterDurationValue.value = '60';
        filterDurationUnit.value = 'minutes';
        filteredEvents = [...allEvents];
        displayEvents(allEvents);
    }
    
    function exportFilteredEvents() {
        if (!originalCalendarComponent || filteredEvents.length === 0) {
            alert('No events to export. Please upload a calendar file first.');
            return;
        }
        
        try {
            console.log('Starting export process...');
            console.log('Number of filtered events:', filteredEvents.length);
            
            // Create a new calendar component with proper structure
            const newCalendar = new ICAL.Component(['vcalendar', [], []]);
            
            // Ensure required properties exist
            if (!originalCalendarComponent.getFirstProperty('version')) {
                newCalendar.addPropertyWithValue('version', '2.0');
            }
            if (!originalCalendarComponent.getFirstProperty('prodid')) {
                newCalendar.addPropertyWithValue('prodid', '-//Calendar Viewer//EN');
            }
            
            // Copy properties from the original calendar
            const propertiesToCopy = ['version', 'prodid', 'calscale', 'method'];
            propertiesToCopy.forEach(propName => {
                const prop = originalCalendarComponent.getFirstProperty(propName);
                if (prop) {
                    try {
                        // Instead of cloning, get the value and add it as a new property
                        const value = prop.getFirstValue();
                        newCalendar.addPropertyWithValue(propName, value);
                    } catch (propError) {
                        console.warn(`Couldn't copy property ${propName}:`, propError);
                        // Fallback values for essential properties
                        if (propName === 'version') {
                            newCalendar.addPropertyWithValue('version', '2.0');
                        } else if (propName === 'prodid') {
                            newCalendar.addPropertyWithValue('prodid', '-//Calendar Viewer//EN');
                        }
                    }
                }
            });
            
            console.log('Calendar properties copied successfully');
            
            // Create a standalone function to safely add an event to the calendar
            const addEventToCalendar = (event, index) => {
                try {
                    // Create a new vevent component
                    const vevent = new ICAL.Component('vevent');
                    
                    // Add required properties
                    if (event.uid) {
                        vevent.addPropertyWithValue('uid', event.uid);
                    } else {
                        vevent.addPropertyWithValue('uid', `event-${index}-${Date.now()}`);
                    }
                    
                    // Add event summary
                    if (event.summary) {
                        vevent.addPropertyWithValue('summary', event.summary);
                    }
                    
                    // Add dates
                    if (event.startDate) {
                        const dtstart = new ICAL.Property('dtstart', vevent);
                        dtstart.setValue(event.startDate);
                        vevent.addProperty(dtstart);
                    }
                    
                    if (event.endDate) {
                        const dtend = new ICAL.Property('dtend', vevent);
                        dtend.setValue(event.endDate);
                        vevent.addProperty(dtend);
                    }
                    
                    // Add other common properties if they exist
                    if (event.description) {
                        vevent.addPropertyWithValue('description', event.description);
                    }
                    
                    if (event.location) {
                        vevent.addPropertyWithValue('location', event.location);
                    }
                    
                    // Get all other properties from the original component
                    try {
                        if (event.component) {
                            const originalProps = event.component.getAllProperties();
                            originalProps.forEach(prop => {
                                const name = prop.name;
                                // Skip properties we've already handled
                                if (!['uid', 'summary', 'dtstart', 'dtend', 'description', 'location'].includes(name)) {
                                    try {
                                        // Instead of using clone, create a new property with the same value
                                        const value = prop.getFirstValue();
                                        if (value !== undefined && value !== null) {
                                            vevent.addPropertyWithValue(name, value);
                                        }
                                    } catch (e) {
                                        console.warn(`Couldn't copy property ${name}:`, e);
                                    }
                                }
                            });
                        }
                    } catch (propError) {
                        console.warn('Error copying additional properties:', propError);
                    }
                    
                    // Add the event to the calendar
                    newCalendar.addSubcomponent(vevent);
                    return true;
                } catch (eventError) {
                    console.warn(`Error adding event ${index}:`, eventError);
                    return false;
                }
            };
            
            // Add each filtered event to the calendar
            let successCount = 0;
            filteredEvents.forEach((event, index) => {
                try {
                    if (addEventToCalendar(event, index)) {
                        successCount++;
                    }
                } catch (err) {
                    console.error(`Failed to add event at index ${index}:`, err);
                }
            });
            
            console.log(`Successfully added ${successCount} of ${filteredEvents.length} events`);
            
            // If no events could be added, try a simpler approach as fallback
            if (successCount === 0) {
                console.log('Using fallback export method...');
                
                // Create a minimal calendar with just the essential data
                const fallbackCalendar = new ICAL.Component(['vcalendar', [], []]);
                fallbackCalendar.addPropertyWithValue('version', '2.0');
                fallbackCalendar.addPropertyWithValue('prodid', '-//Calendar Viewer Fallback//EN');
                
                let fallbackCount = 0;
                
                // Try a more basic approach to add events
                filteredEvents.forEach((event, index) => {
                    try {
                        const vevent = new ICAL.Component('vevent');
                        vevent.addPropertyWithValue('uid', `fallback-event-${index}-${Date.now()}`);
                        
                        if (event.summary) {
                            vevent.addPropertyWithValue('summary', event.summary);
                        }
                        
                        // Add dates in a simpler way
                        if (event.startDate) {
                            const startDateStr = event.startDate.toJSDate().toISOString();
                            vevent.addPropertyWithValue('dtstart', startDateStr);
                        }
                        
                        if (event.endDate) {
                            const endDateStr = event.endDate.toJSDate().toISOString();
                            vevent.addPropertyWithValue('dtend', endDateStr);
                        }
                        
                        fallbackCalendar.addSubcomponent(vevent);
                        fallbackCount++;
                    } catch (err) {
                        console.warn(`Failed to add fallback event ${index}:`, err);
                    }
                });
                
                if (fallbackCount === 0) {
                    throw new Error('All export methods failed. No events could be added to the calendar.');
                }
                
                // Use the fallback calendar
                newCalendar = fallbackCalendar;
                console.log(`Added ${fallbackCount} events using fallback method`);
            }
            
            // Convert the calendar to an ICS string
            const icsString = newCalendar.toString();
            console.log('ICS string generated, length:', icsString.length);
            
            if (!icsString || icsString.length < 50) {
                throw new Error('Generated ICS file is too small or empty');
            }
            
            // Create a download link
            const blob = new Blob([icsString], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'filtered_calendar.ics';
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log('Export complete!');
        } catch (error) {
            console.error('Error exporting filtered events:', error);
            // Show more detailed error message
            alert(`Error exporting filtered events: ${error.message || 'Unknown error'}. Please check the console for details.`);
        }
    }

    function displayNoEvents(filtered = false) {
        eventsBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-events">${filtered ? 'No events match your filters.' : 'No events found in the calendar file.'}</td>
            </tr>
        `;
        resultsSection.classList.remove('hidden');
    }

    function formatDate(dateTime) {
        const date = dateTime.toJSDate();
        return date.toLocaleDateString();
    }

    function formatTime(dateTime) {
        const date = dateTime.toJSDate();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    function formatDuration(startDateTime, endDateTime) {
        const startMs = startDateTime.toJSDate().getTime();
        const endMs = endDateTime.toJSDate().getTime();
        const durationMs = endMs - startMs;
        
        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''} ${hours % 24} hr`;
        } else if (hours > 0) {
            return `${hours} hr ${minutes % 60} min`;
        } else {
            return `${minutes} min`;
        }
    }
    
    function openEventInGoogleCalendar(event) {
        try {
            // Base Google Calendar URL
            let googleCalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
            
            // Get event details
            const title = encodeURIComponent(event.summary || 'Untitled Event');
            
            // Format dates for Google Calendar
            const startDate = event.startDate.toJSDate();
            const endDate = event.endDate.toJSDate();
            
            // Format: YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS
            const dateFormat = date => {
                return date.toISOString().replace(/-|:|\.\d+/g, '');
            };
            
            const dates = encodeURIComponent(`${dateFormat(startDate)}/${dateFormat(endDate)}`);
            
            // Add location if available
            let location = '';
            if (event.location) {
                location = `&location=${encodeURIComponent(event.location)}`;
            }
            
            // Add description if available
            let description = '';
            if (event.description) {
                description = `&details=${encodeURIComponent(event.description)}`;
            }
            
            // Construct the final URL
            googleCalUrl += `&text=${title}&dates=${dates}${location}${description}`;
            
            // Open Google Calendar in a new tab
            window.open(googleCalUrl, '_blank');
            
        } catch (error) {
            console.error('Error opening event in Google Calendar:', error);
            alert(`Error opening event in Google Calendar: ${error.message || 'Unknown error'}`);
        }
    }
});