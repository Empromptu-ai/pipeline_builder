export const varNamesFromPrompt = (promptText?: string): string[] => {
  if (!promptText) {
    return [];
  }

  const regex = /\{\{\s*([^}]+?)\s*\}\}/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(promptText)) !== null) {
    const varName = match[1].trim();

    if (varName && !matches.includes(varName)) {
      matches.push(varName);
    }
  }

  return matches;
};
