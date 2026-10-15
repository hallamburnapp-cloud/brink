declare module 'virtual:thirty-content' {
  import type { ContentIssue, ThirtyContent } from './types';
  const content: ThirtyContent;
  export default content;
  export const issues: ContentIssue[];
}
