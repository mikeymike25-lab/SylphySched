export interface ParsedScheduleItem {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  subject_name: string;
  start_time: string;
  end_time: string;
  room: string;
  instructor: string;
}

const DAYS_MAP: Record<string, 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'> = {
  monday: 'Monday',
  mon: 'Monday',
  m: 'Monday',
  tuesday: 'Tuesday',
  tue: 'Tuesday',
  t: 'Tuesday',
  wednesday: 'Wednesday',
  wed: 'Wednesday',
  w: 'Wednesday',
  thursday: 'Thursday',
  thu: 'Thursday',
  th: 'Thursday',
  h: 'Thursday',
  friday: 'Friday',
  fri: 'Friday',
  f: 'Friday',
  saturday: 'Saturday',
  sat: 'Saturday',
  s: 'Saturday',
  sunday: 'Sunday',
  sun: 'Sunday',
  su: 'Sunday',
};

/**
 * Offline regex-based pattern matcher to parse schedule texts
 */
export const parseRawScheduleTextOffline = (text: string): ParsedScheduleItem[] => {
  const lines = text.split('\n');
  const items: ParsedScheduleItem[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // 1. Try to find the day of the week
    let matchedDay: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' = 'Monday';
    const lowerLine = trimmed.toLowerCase();
    
    // Split into clean words to find exact matches for abbreviations
    const words = lowerLine.split(/[\s,;|()[\]{}]+/);
    
    // Order keywords by length descending to match full names first
    const dayKeys = Object.keys(DAYS_MAP).sort((a, b) => b.length - a.length);
    
    for (const key of dayKeys) {
      if (key.length === 1) {
        if (words.includes(key)) {
          matchedDay = DAYS_MAP[key];
          break;
        }
      } else {
        if (lowerLine.includes(key)) {
          matchedDay = DAYS_MAP[key];
          break;
        }
      }
    }

    // 2. Try to find times (start and end)
    // Matches: 08:30, 8:30, 8:30 AM, 12:30 PM, 14:00, etc.
    const timeRegex = /\b(0?[1-9]|1[0-2]|1[3-9]|2[0-3]):([0-5][0-9])\s*(am|pm|AM|PM)?\b/g;
    const timeMatches = [...trimmed.matchAll(timeRegex)];
    
    let start_time = '08:00';
    let end_time = '09:00';
    
    if (timeMatches.length >= 2) {
      // Start time
      const startMatch = timeMatches[0];
      let startH = parseInt(startMatch[1], 10);
      const startM = startMatch[2];
      const startAmpm = startMatch[3]?.toLowerCase();
      if (startAmpm === 'pm' && startH < 12) startH += 12;
      if (startAmpm === 'am' && startH === 12) startH = 0;
      start_time = `${startH.toString().padStart(2, '0')}:${startM}`;
      
      // End time
      const endMatch = timeMatches[1];
      let endH = parseInt(endMatch[1], 10);
      const endM = endMatch[2];
      const endAmpm = endMatch[3]?.toLowerCase();
      if (endAmpm === 'pm' && endH < 12) endH += 12;
      if (endAmpm === 'am' && endH === 12) endH = 0;
      end_time = `${endH.toString().padStart(2, '0')}:${endM}`;
    } else {
      // Alternate check for time format like: 7-9, 10-12, 1pm-3pm
      const simpleTimeRegex = /\b(0?[1-9]|1[0-2]|1[3-9]|2[0-3])(am|pm|AM|PM)?\s*[-–to]+\s*(0?[1-9]|1[0-2]|1[3-9]|2[0-3])\s*(am|pm|AM|PM)?\b/;
      const simpleMatch = trimmed.match(simpleTimeRegex);
      if (simpleMatch) {
        let startH = parseInt(simpleMatch[1], 10);
        const startAmpm = simpleMatch[2]?.toLowerCase();
        let endH = parseInt(simpleMatch[3], 10);
        const endAmpm = simpleMatch[4]?.toLowerCase() || startAmpm;
        
        if (startAmpm === 'pm' && startH < 12) startH += 12;
        if (startAmpm === 'am' && startH === 12) startH = 0;
        if (endAmpm === 'pm' && endH < 12) endH += 12;
        if (endAmpm === 'am' && endH === 12) endH = 0;
        
        start_time = `${startH.toString().padStart(2, '0')}:00`;
        end_time = `${endH.toString().padStart(2, '0')}:00`;
      }
    }

    // 3. Try to find room
    // Match Room Q-5217C, Rm 502, Q-5212-E
    const roomRegex = /(?:room|rm|room:)?\s*([a-z]-\d{4}[a-z]?|\b\d{3,4}[a-z]?\b)/i;
    const roomMatch = trimmed.match(roomRegex);
    let room = roomMatch ? roomMatch[1] : '';
    if (room && !line.toLowerCase().includes('room') && !line.toLowerCase().includes('rm') && !/^[a-z]-/i.test(room)) {
      const genericRoomCheck = /(?:room|rm|room:)\s*([a-zA-Z0-9-]+)/i;
      const genericMatch = trimmed.match(genericRoomCheck);
      room = genericMatch ? genericMatch[1] : '';
    }

    // 4. Try to find Instructor
    // Match Instructor: TBA, Prof. Smith, Dr. John, Instr: Prof. A
    const instructorRegex = /(?:instructor|prof|teacher|instr|prof\.|dr\.)\s*([a-zA-Z\s.]+)(?:\b|$)/i;
    const instructorMatch = trimmed.match(instructorRegex);
    let instructor = instructorMatch ? instructorMatch[1].trim() : 'TBA';
    instructor = instructor.replace(/[,;|()]/g, '').trim();

    // 5. Subject Name
    let subject_name = trimmed;
    subject_name = subject_name.replace(timeRegex, '');
    if (roomMatch) subject_name = subject_name.replace(roomMatch[0], '');
    if (instructorMatch) subject_name = subject_name.replace(instructorMatch[0], '');
    
    const dayRegex = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi;
    subject_name = subject_name.replace(dayRegex, '');
    
    // Clean up punctuation, spaces
    subject_name = subject_name.replace(/^[-\s|:;()]+|[-\s|:;()]+$/g, '').trim();
    subject_name = subject_name.replace(/\s+/g, ' ');

    if (!subject_name) {
      subject_name = 'Custom Class';
    }

    items.push({
      day: matchedDay,
      subject_name: subject_name,
      start_time: start_time,
      end_time: end_time,
      room: room || 'TBD',
      instructor: instructor || 'TBA',
    });
  });

  return items;
};

/**
 * Online Gemini-based pattern parser to parse schedule texts
 */
export const parseRawScheduleTextWithGemini = async (
  text: string,
  apiKey: string
): Promise<ParsedScheduleItem[]> => {
  const prompt = `You are a schedule parsing assistant. Parse the following text and extract all class schedule items. Return a JSON array matching this typescript interface:
interface ParsedScheduleItem {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  subject_name: string;
  start_time: string; // HH:MM (24-hour format)
  end_time: string;   // HH:MM (24-hour format)
  room: string;       // Room identifier, default "TBD" if not found
  instructor: string; // Instructor name, default "TBA" if not found
}
Do not return any other explanation, markdown formatting blocks (like \`\`\`json), or HTML tags. Return ONLY the raw valid JSON array.

Raw text to parse:
${text}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned error: ${response.status} - ${errorText}`);
  }

  const responseData = await response.json();
  const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini API returned an empty or invalid candidate.');
  }

  const parsed = JSON.parse(rawText.trim());
  if (!Array.isArray(parsed)) {
    throw new Error('Gemini API response did not yield an array.');
  }

  return parsed as ParsedScheduleItem[];
};
