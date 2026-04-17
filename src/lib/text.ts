export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*\n]+?)\*\*/g, '$1')
    .replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_([^_\n]+?)_(?!\w)/g, '$1')
    .replace(/`([^`\n]+?)`/g, '$1');
}
