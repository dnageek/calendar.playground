document.addEventListener('DOMContentLoaded', () => {
    console.log('AI Event Creator script loaded');
    
    // Tab switching functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log('Tab buttons found:', tabBtns.length);
    console.log('Tab contents found:', tabContents.length);
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Tab button clicked:', btn.getAttribute('data-tab'));
            
            // Remove active class from all buttons and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(tabId);
            console.log('Target content:', tabId, targetContent);
            
            if (targetContent) {
                targetContent.classList.add('active');
            } else {
                console.error('Tab content not found for tab ID:', tabId);
            }
        });
    });
    
    // AI Event Creator functionality
    const eventDescriptionInput = document.getElementById('event-description');
    const apiKeyInput = document.getElementById('openai-api-key');
    const generateBtn = document.getElementById('generate-event');
    const aiResultSection = document.getElementById('ai-result-section');
    const aiEventBody = document.getElementById('ai-event-body');
    const loadingIndicator = document.getElementById('loading-indicator');
    const downloadBtn = document.getElementById('download-event');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', async function() {
            if (eventDescriptionInput && eventDescriptionInput.value) {
                const description = eventDescriptionInput.value.trim();
                const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
                
                if (!apiKey) {
                    alert('Please enter your OpenAI API key.');
                    return;
                }
                
                if (!apiKey.startsWith('sk-')) {
                    alert('Please enter a valid OpenAI API key starting with "sk-".');
                    return;
                }
                
                // Show loading indicator and result section
                loadingIndicator.classList.remove('hidden');
                aiResultSection.classList.remove('hidden');
                
                try {
                    // Call OpenAI API to parse the event
                    const eventData = await getEventFromOpenAI(description, apiKey);
                    
                    // Print the raw response for debugging
                    console.log('OpenAI API Response:', eventData);
                    
                    // Hide loading indicator
                    loadingIndicator.classList.add('hidden');
                    
                    // Display the parsed event
                    displayParsedEvent(eventData);
                } catch (error) {
                    // Hide loading indicator
                    loadingIndicator.classList.add('hidden');
                    
                    // Show error message
                    console.error('Error calling OpenAI API:', error);
                    alert(`Error: ${error.message}`);
                    
                    // Fallback to local parsing
                    console.log('Falling back to local parsing...');
                    const localEventData = parseEventDescription(description);
                    displayParsedEvent(localEventData);
                }
            } else {
                alert('Please enter an event description.');
            }
        });
    } else {
        console.error('Generate button not found!');
    }
    
    // Function to call OpenAI API
    async function getEventFromOpenAI(description, apiKey) {
        const currentDate = new Date();
        const systemPrompt = `
            You are a calendar assistant that converts natural language descriptions into structured calendar events.
            Based on the user's description, extract the event details and return ONLY a JSON object with these fields:
            - summary: The title/summary of the event
            - startDate: ISO date string for when the event starts, including time (in format: YYYY-MM-DDTHH:MM:SS)
            - endDate: ISO date string for when the event ends, including time (in format: YYYY-MM-DDTHH:MM:SS)
            - location: Where the event takes place (if specified, otherwise empty string)
            - description: Any additional details about the event (if specified, otherwise empty string)
            
            For dates and times:
            - If a specific date is mentioned, use it
            - If only a day of week is mentioned (like "Monday"), use the next occurrence of that day
            - If time is mentioned, use it; otherwise set a default time of 9:00 AM
            - If duration is mentioned, calculate the end time accordingly; otherwise set a default duration of 1 hour
            - If a date isn't specified at all, assume the event is for tomorrow
            - The current date is ${currentDate.toISOString().split('T')[0]}
            
            Return ONLY the JSON object, no additional text.
        `;
        
        // Display the system prompt for educational purposes
        console.log('System prompt sent to OpenAI:', systemPrompt);
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: description }
                    ],
                    temperature: 0.7
                })
            });
            
            // Check if response is ok
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error?.message ||
                    `OpenAI API error (${response.status}): ${response.statusText}`
                );
            }
            
            // Parse the response
            const data = await response.json();
            console.log('Full OpenAI response:', data);
            
            const eventJSON = data.choices[0].message.content;
            console.log('Event JSON from OpenAI:', eventJSON);
            
            // Parse the JSON
            try {
                // First try to parse as is
                let eventData = JSON.parse(eventJSON);
                
                // Convert dates to Date objects
                eventData.startDate = new Date(eventData.startDate);
                eventData.endDate = new Date(eventData.endDate);
                
                return eventData;
            } catch (parseError) {
                console.error('Error parsing OpenAI response:', parseError);
                
                // Try to extract JSON using regex as a fallback
                const jsonMatch = eventJSON.match(/\\{[\\s\\S]*\\}/);
                if (jsonMatch) {
                    try {
                        let eventData = JSON.parse(jsonMatch[0]);
                        
                        // Convert dates to Date objects
                        eventData.startDate = new Date(eventData.startDate);
                        eventData.endDate = new Date(eventData.endDate);
                        
                        return eventData;
                    } catch (e) {
                        throw new Error('Could not parse event data from OpenAI response');
                    }
                } else {
                    throw new Error('Could not parse event data from OpenAI response');
                }
            }
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw error;
        }
    }
    
    // Basic function to parse event description without using OpenAI
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
    
    // Display the parsed event
    function displayParsedEvent(eventData) {
        // Create an event object (would normally come from OpenAI)
        const event = {
            summary: eventData.summary,
            description: eventData.description,
            location: eventData.location,
            startDate: {
                toJSDate: () => eventData.startDate
            },
            endDate: {
                toJSDate: () => eventData.endDate
            },
            uid: `event-${Date.now()}@calendar-assistant.app`
        };
        
        // Display the event in the table
        aiEventBody.innerHTML = '';
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
            <td>${event.summary || 'No Title'}</td>
            <td>${startDate}</td>
            <td>${startTime}</td>
            <td>${endDate}</td>
            <td>${endTime}</td>
            <td>${event.location || 'N/A'}</td>
            <td>${event.description || 'N/A'}</td>
            <td>${durationText}</td>
            <td>
                <button class="add-to-gcal-btn" id="ai-gcal-btn">Add to Google Calendar</button>
            </td>
        `;
        
        aiEventBody.appendChild(row);
        
        // Store event data for Google Calendar
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
    
    // Add download functionality
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            // Get the displayed event data
            const rows = aiEventBody.querySelectorAll('tr');
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
    
    // Function to generate ICS file content
    function generateICSFile(eventData) {
        // Get current timestamp for DTSTAMP
        const now = new Date();
        const timestamp = formatICSDate(now);
        
        // Format dates for ICS
        const start = formatICSDate(eventData.startDate);
        const end = formatICSDate(eventData.endDate);
        
        // Generate a unique identifier
        const uid = `event-${now.getTime()}@calendar-assistant.app`;
        
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
        a.download = 'event.ics';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    // Print all element IDs to debug
    console.log('Elements found:');
    console.log('event-description:', !!eventDescriptionInput);
    console.log('openai-api-key:', !!apiKeyInput);
    console.log('generate-event:', !!generateBtn);
    console.log('ai-result-section:', !!aiResultSection);
    console.log('ai-event-body:', !!aiEventBody);
    console.log('loading-indicator:', !!loadingIndicator);
    console.log('download-event:', !!downloadBtn);
});