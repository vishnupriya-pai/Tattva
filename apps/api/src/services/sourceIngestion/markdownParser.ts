export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  content: string;
  hasMath: boolean;
  hasCode: boolean;
}

/**
 * Parses markdown or structured technical text into hierarchical sections,
 * preserving mathematical formulas, code blocks, and section breadcrumbs.
 */
export function parseTechnicalDocument(text: string): DocumentSection[] {
  const lines = text.split(/\r?\n/);
  const sections: DocumentSection[] = [];

  let currentTitle = 'Foundational Overview';
  let currentLevel = 1;
  let currentContent: string[] = [];
  let sectionIndex = 0;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      if (currentContent.length > 0 || sections.length === 0) {
        const fullContent = currentContent.join('\n').trim();
        if (fullContent.length > 0) {
          sections.push({
            id: `sec-${sectionIndex++}`,
            title: currentTitle,
            level: currentLevel,
            content: fullContent,
            hasMath: fullContent.includes('$'),
            hasCode: fullContent.includes('```'),
          });
        }
      }
      currentLevel = headingMatch[1].length;
      currentTitle = headingMatch[2].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Push remaining trailing content
  if (currentContent.length > 0) {
    const fullContent = currentContent.join('\n').trim();
    if (fullContent.length > 0) {
      sections.push({
        id: `sec-${sectionIndex++}`,
        title: currentTitle,
        level: currentLevel,
        content: fullContent,
        hasMath: fullContent.includes('$'),
        hasCode: fullContent.includes('```'),
      });
    }
  }

  // Fallback if no headings were present in raw text
  if (sections.length === 0 && text.trim().length > 0) {
    sections.push({
      id: 'sec-0',
      title: 'Foundational Overview',
      level: 1,
      content: text.trim(),
      hasMath: text.includes('$'),
      hasCode: text.includes('```'),
    });
  }

  return sections;
}
