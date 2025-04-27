document.addEventListener('DOMContentLoaded', () => {
    console.log('Puter.js Event Creator script loaded');
    
    // Get DOM elements
    const eventDescriptionInput = document.getElementById('puter-event-description');
    const generateBtn = document.getElementById('puter-generate-event');
    const resultSection = document.getElementById('puter-result-section');
    const eventBody = document.getElementById('puter-event-body');
    const loadingIndicator = document.getElementById('puter-loading-indicator');
    const downloadBtn = document.getElementById('puter-download-event');
    
    // Store the generated event
    let generatedEvent = null;
    
    // Add event listeners
    if (generateBtn) {
        generateBtn.addEventListener('click', async function() {
            if (eventDescriptionInput && eventDescriptionInput.value) {
                const description = eventDescriptionInput.value.trim();
                
                // Show loading indicator and result section
                loadingIndicator.classList.remove('hidden');
                resultSection.classList.remove('hidden');
                
                try {
                    // Process the event description using Puter.js AI
                    const eventData = await processPuterAI(description);
                    loadingIndicator.classList.add('hidden');
                    displayParsedEvent(eventData);
                } catch (error) {
                    loadingIndicator.classList.add('hidden');
                    console.error('Error processing with Puter.js:', error);
                    alert(`Error: ${error.message || 'Error processing event'}`);
                    
                    // Fall back to local parsing if needed
                    const localEventData = parseEventDescription(description);
                    displayParsedEvent(localEventData);
                }
            } else {
                alert('Please enter an event description.');
            }
        });
    } else {
        console.error('Puter generate button not found!');
    }
    
    // Add download functionality
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            // Get the displayed event data
            const rows = eventBody.querySelectorAll('tr');
            if (rows.length === 0) {
                alert('Please generate an event first.');
                return;
            }
            
            // Get the event data from the most recent row
            const row = rows[rows.length - 1];
            
            // Extract data from the table cells
            const summary = row.cells[0].textContent;
            const startDateStr = row.cells[1].textContent;
            const startTimeStr = row.cells[2].textContent;
            const endDateStr = row.cells[3].textContent;
            const endTimeStr = row.cells[4].textContent;
            const location = row.cells[5].textContent !== 'N/A' ? row.cells[5].textContent : '';
            const description = row.cells[6].textContent !== 'N/A' ? row.cells[6].textContent : '';
            
            // Recreate dates from the displayed strings
            const startDate = new Date(`${startDateStr} ${startTimeStr}`);
            const endDate = new Date(`${endDateStr} ${endTimeStr}`);
            
            // Create an ICS file
            const icsContent = generateICSFile({
                summary,
                description,
                location,
                startDate,
                endDate
            });
            
            // Download the file
            downloadICSFile(icsContent);
        });
    }
    
    // Process event description using Puter.js AI
    async function processPuterAI(description) {
        // Build the full prompt combining system instructions and user input
        const fullPrompt = `
            You are a calendar assistant that converts natural language descriptions into structured calendar events.
            Parse the following event description and return ONLY a JSON object with these fields:
            - summary: The title/summary of the event
            - startDate: ISO date string for when the event starts (in format: YYYY-MM-DDTHH:MM:SS)
            - endDate: ISO date string for when the event ends (in format: YYYY-MM-DDTHH:MM:SS)
            - location: Where the event takes place (if specified, otherwise empty string)
            - description: Any additional details about the event (if specified, otherwise empty string)
            
            For dates and times:
            - If a specific date is mentioned, use it
            - If only a day of week is mentioned (like "Monday"), use the next occurrence of that day
            - If time is mentioned, use it; otherwise set a default time of 9:00 AM
            - If duration is mentioned, calculate the end time accordingly; otherwise set a default duration of 1 hour
            - If a date isn't specified at all, assume the event is for tomorrow
            - The current date is ${new Date().toISOString().split('T')[0]}
            
            Event description: "${description}"
            
            Return ONLY the JSON object, no other text.
        `;
        
        try {
            console.log('Calling Puter.js AI...');
            
            // Call Puter.js chat API
            // The puter.ai.chat function may return the content directly or in a structured object
            const response = await puter.ai.chat(fullPrompt);
            
            // We'll handle different response formats in the parsing section
            
            console.log('Puter.js AI response:', response);
            
            // Parse the response
            try {
                // Puter.js returns an object (not just a string)
                console.log('Raw response:', response);
                console.log('Response type:', typeof response);
                
                // Extract the content from the response
                // The response structure should be an object with message.content
                let jsonContent = '';
                let eventData;
                
                if (typeof response === 'object' && response !== null) {
                    // If response is an object containing a message
                    if (response.message && response.message.content) {
                        jsonContent = response.message.content;
                        console.log('Found content in response.message.content');
                    } else if (response.content) {
                        // If response has content directly
                        jsonContent = response.content;
                        console.log('Found content in response.content');
                    } else if (response.choices && response.choices[0] && response.choices[0].message) {
                        // OpenAI-like format
                        jsonContent = response.choices[0].message.content;
                        console.log('Found content in OpenAI-like format');
                    } else {
                        // If we can't find the expected structure, try using the response directly
                        jsonContent = JSON.stringify(response);
                        console.log('Using stringified response');
                    }
                } else if (typeof response === 'string') {
                    // If response is already a string
                    jsonContent = response;
                    console.log('Response is a string');
                } else {
                    console.log('Unexpected response type');
                    throw new Error('Unexpected response format from Puter.js');
                }
                
                console.log('Content to parse:', jsonContent);
                
                // Now try to extract the JSON from the content
                try {
                    // First try direct JSON parsing
                    eventData = JSON.parse(jsonContent);
                    console.log('Successfully parsed JSON directly');
                } catch (jsonError) {
                    console.log('Direct JSON parsing failed:', jsonError.message);
                    
                    // Try to extract JSON from text using regex
                    const jsonRegex = /(\{[\s\S]*?\})/g;
                    const matches = jsonContent.match(jsonRegex);
                    
                    if (matches && matches.length > 0) {
                        console.log('Found potential JSON matches:', matches);
                        // Try each match until we find one that parses
                        for (const match of matches) {
                            try {
                                const parsed = JSON.parse(match);
                                // Verify this has the required fields
                                if (parsed.summary && parsed.startDate && parsed.endDate) {
                                    eventData = parsed;
                                    console.log('Found valid event data in match');
                                    break;
                                }
                            } catch (e) {
                                console.log('Failed to parse match');
                            }
                        }
                    }
                    
                    // If we still don't have valid event data
                    if (!eventData) {
                        throw new Error('Could not extract valid event data from AI response');
                    }
                }
                
                // Convert string dates to Date objects
                eventData.startDate = new Date(eventData.startDate);
                eventData.endDate = new Date(eventData.endDate);
                
                return eventData;
            } catch (parseError) {
                console.error('Error parsing AI response:', parseError);
                throw new Error('Could not understand the AI response. Falling back to local parsing.');
            }
        } catch (error) {
            console.error('Puter.js AI error:', error);
            throw error;
        }
    }
    
    // Display the parsed event
    function displayParsedEvent(eventData) {
        // Display the event in the table
        eventBody.innerHTML = '';
        const row = document.createElement('tr');
        
        // Format dates and times
        const startDate = eventData.startDate.toLocaleDateString();
        const startTime = eventData.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endDate = eventData.endDate.toLocaleDateString();
        const endTime = eventData.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Calculate duration
        const durationMs = eventData.endDate.getTime() - eventData.startDate.getTime();
        const minutes = Math.floor(durationMs / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        let durationText = '';
        
        if (hours > 0) {
            durationText = `${hours} hr ${remainingMinutes > 0 ? remainingMinutes + ' min' : ''}`;
        } else {
            durationText = `${minutes} min`;
        }
        
        // Create the table row
        row.innerHTML = `
            <td>${eventData.summary || 'No Title'}</td>
            <td>${startDate}</td>
            <td>${startTime}</td>
            <td>${endDate}</td>
            <td>${endTime}</td>
            <td>${eventData.location || 'N/A'}</td>
            <td>${eventData.description || 'N/A'}</td>
            <td>${durationText}</td>
            <td>
                <button class="add-to-gcal-btn">Add to Google Calendar</button>
            </td>
        `;
        
        eventBody.appendChild(row);
        
        // Store event data for Google Calendar
        generatedEvent = eventData;
        
        // Add event listener to the Google Calendar button
        row.querySelector('.add-to-gcal-btn').addEventListener('click', () => {
            openInGoogleCalendar(eventData);
        });
    }
    
    // Function to open event in Google Calendar
    function openInGoogleCalendar(eventData) {
        try {
            // Base Google Calendar URL
            let googleCalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
            
            // Get event details
            const title = encodeURIComponent(eventData.summary || 'Untitled Event');
            
            // Format dates for Google Calendar
            const startDate = eventData.startDate;
            const endDate = eventData.endDate;
            
            // Format: YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS
            const dateFormat = date => {
                return date.toISOString().replace(/-|:|\\.\\d+/g, '');
            };
            
            const dates = encodeURIComponent(`${dateFormat(startDate)}/${dateFormat(endDate)}`);
            
            // Add location if available
            let location = '';
            if (eventData.location) {
                location = `&location=${encodeURIComponent(eventData.location)}`;
            }
            
            // Add description if available
            let description = '';
            if (eventData.description) {
                description = `&details=${encodeURIComponent(eventData.description)}`;
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
    
    // Function to generate ICS file content
    function generateICSFile(eventData) {
        // Get current timestamp for DTSTAMP
        const now = new Date();
        const timestamp = formatICSDate(now);
        
        // Format dates for ICS
        const start = formatICSDate(eventData.startDate);
        const end = formatICSDate(eventData.endDate);
        
        // Generate a unique identifier
        const uid = `puter-event-${now.getTime()}@calendar-assistant.app`;
        
        // Build the ICS content
        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Calendar Assistant//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
SUMMARY:${eventData.summary}
DTSTART:${start}
DTEND:${end}
DTSTAMP:${timestamp}
UID:${uid}
LOCATION:${eventData.location || ''}
DESCRIPTION:${eventData.description || ''}
END:VEVENT
END:VCALENDAR`;
    }
    
    // Format date for ICS file (YYYYMMDDTHHMMSSZ)
    function formatICSDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }
    
    // Function to download ICS file
    function downloadICSFile(content) {
        const blob = new Blob([content], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'puter-event.ics';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    // Basic function to parse event description without using AI
    function parseEventDescription(text) {
        // Default values
        const result = {
            summary: text,
            location: '',
            description: '',
            startDate: new Date(),
            endDate: new Date()
        };
        
        // Set default time to 9:00 AM tomorrow
        result.startDate.setDate(result.startDate.getDate() + 1);
        result.startDate.setHours(9, 0, 0, 0);
        
        // Default end time is 1 hour after start
        result.endDate = new Date(result.startDate.getTime() + 60 * 60 * 1000);
        
        // Try to parse days of week
        const dayMatch = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
        if (dayMatch) {
            const dayOfWeek = dayMatch[1].toLowerCase();
            const today = new Date();
            const todayDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
            let targetDay;
            
            // Map day name to number
            switch (dayOfWeek) {
                case 'sunday': targetDay = 0; break;
                case 'monday': targetDay = 1; break;
                case 'tuesday': targetDay = 2; break;
                case 'wednesday': targetDay = 3; break;
                case 'thursday': targetDay = 4; break;
                case 'friday': targetDay = 5; break;
                case 'saturday': targetDay = 6; break;
            }
            
            // Calculate days to add
            let daysToAdd = targetDay - todayDay;
            if (daysToAdd <= 0) {
                daysToAdd += 7; // Go to next week if the day has passed
            }
            
            // Set the day
            result.startDate = new Date();
            result.startDate.setDate(result.startDate.getDate() + daysToAdd);
            result.startDate.setHours(9, 0, 0, 0); // Default 9 AM
        }
        
        // Try to parse time (e.g., 2pm, 14:30)
        const timeMatch = text.match(/\b(\d{1,2})(:\d{2})?\s*(am|pm)?\b/i);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1], 10);
            const minute = timeMatch[2] ? parseInt(timeMatch[2].substring(1), 10) : 0;
            const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
            
            // Adjust hour based on AM/PM
            if (ampm === 'pm' && hour < 12) {
                hour += 12;
            } else if (ampm === 'am' && hour === 12) {
                hour = 0;
            }
            
            // Set the time
            result.startDate.setHours(hour, minute, 0, 0);
        }
        
        // Try to parse duration (e.g., for 1 hour, for 30 minutes)
        const durationMatch = text.match(/\bfor\s+(\d+)\s+(hour|minute|min)s?\b/i);
        if (durationMatch) {
            const amount = parseInt(durationMatch[1], 10);
            const unit = durationMatch[2].toLowerCase();
            
            // Calculate end date
            result.endDate = new Date(result.startDate.getTime());
            if (unit.startsWith('hour')) {
                result.endDate.setTime(result.endDate.getTime() + amount * 60 * 60 * 1000);
            } else if (unit.startsWith('min')) {
                result.endDate.setTime(result.endDate.getTime() + amount * 60 * 1000);
            }
        } else {
            // Default 1 hour duration
            result.endDate = new Date(result.startDate.getTime() + 60 * 60 * 1000);
        }
        
        // Try to parse location (e.g., at Office, in Conference Room)
        const locationMatch = text.match(/\b(?:at|in)\s+([A-Za-z0-9\s]+(?:Room|Office|Building|Center|Place|Street|Ave|Road|Location|Park|Hall))/i);
        if (locationMatch) {
            result.location = locationMatch[1].trim();
        }
        
        // Extract the event title - try to get a more concise summary
        const titleMatches = [
            // Match "Meeting with John" pattern
            /\b(Meeting|Call|Discussion|Interview|Appointment|Session|Conference|Lunch|Dinner|Breakfast|Coffee)\s+(?:with|about)\s+([^.!?]+)/i,
            // Match "Project planning session" pattern
            /\b([A-Z][a-z]+(?:\s+[A-Za-z]+){1,3})\s+(?:meeting|call|session|discussion)/i
        ];
        
        for (const pattern of titleMatches) {
            const match = text.match(pattern);
            if (match) {
                result.summary = match[0].trim();
                break;
            }
        }
        
        // If title is still the full text, try to truncate it
        if (result.summary === text && text.length > 50) {
            result.summary = text.substring(0, 47) + '...';
        }
        
        // Set description to be different from summary
        if (result.summary !== text) {
            result.description = text;
        }
        
        return result;
    }
});