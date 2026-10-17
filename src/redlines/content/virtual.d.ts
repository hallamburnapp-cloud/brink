declare module 'virtual:redlines-content' {
  import type { ContentIssue, RedlinesPack } from './types';
  const content: RedlinesPack;
  export default content;
  export const issues: ContentIssue[];
}
