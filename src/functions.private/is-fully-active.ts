/**
 * @inheritDoc https://stackoverflow.com/questions/68909643/detecting-when-a-document-is-fully-active
 */
export function isFullyActive(self: any): boolean {
  return (
    self.window !== null &&
    self.document === self.window.document &&
    (self.window.top === self.window || isFullyActive(self.window.parent))
  );
}
