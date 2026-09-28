declare module 'virtual:brink-content' {
  import type { Content } from './engine/types';
  const content: Content;
  export default content;
  export const issues: { level: 'error' | 'warning'; where: string; message: string }[];
}
