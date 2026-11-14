export interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

function parseTimestamp(timeStr: string): number {
  const parts = timeStr.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

export function parseWebVTT(content: string): SubtitleCue[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues: SubtitleCue[] = [];

  let currentCue: Partial<SubtitleCue> | null = null;
  let textLines: string[] = [];
  let cueIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for timestamp arrow: 00:00:01.000 --> 00:00:04.000
    if (line.includes('-->')) {
      // If we had a previous cue pending, save it
      if (currentCue && currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
        cues.push({
          id: currentCue.id || `cue-${cueIndex++}`,
          startTime: currentCue.startTime,
          endTime: currentCue.endTime,
          text: textLines.join('\n').trim(),
        });
      }

      const [startStr, endStr] = line.split('-->');
      // endStr might have position settings like "align:start size:50%"
      const endPart = endStr.trim().split(/\s+/)[0];

      currentCue = {
        id: `cue-${cueIndex++}`,
        startTime: parseTimestamp(startStr),
        endTime: parseTimestamp(endPart),
      };
      textLines = [];
    } else if (currentCue && line.length > 0 && !line.startsWith('NOTE') && !line.startsWith('WEBVTT')) {
      // Add text line (strip any inline html-like tags if needed, or leave readable)
      textLines.push(line);
    } else if (line.length === 0 && currentCue) {
      if (currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
        cues.push({
          id: currentCue.id || `cue-${cueIndex++}`,
          startTime: currentCue.startTime,
          endTime: currentCue.endTime,
          text: textLines.join('\n').trim(),
        });
        currentCue = null;
        textLines = [];
      }
    }
  }

  // Final flush
  if (currentCue && currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
    cues.push({
      id: currentCue.id || `cue-${cueIndex++}`,
      startTime: currentCue.startTime,
      endTime: currentCue.endTime,
      text: textLines.join('\n').trim(),
    });
  }

  return cues;
}

export async function fetchAndParseSubtitles(url: string): Promise<SubtitleCue[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    return parseWebVTT(text);
  } catch (err) {
    console.error('Failed to fetch and parse subtitle:', err);
    return [];
  }
}

