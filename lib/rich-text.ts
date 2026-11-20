export const emptyRichText = {
  type: "doc",
  content: [] as unknown[],
};

export function richTextToPlainText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as {
    type?: string;
    text?: string;
    content?: unknown[];
  };

  if (typeof node.text === "string") return node.text;

  const inner = Array.isArray(node.content)
    ? node.content.map((child) => richTextToPlainText(child)).join("")
    : "";

  if (
    node.type === "paragraph" ||
    node.type === "heading" ||
    node.type === "listItem" ||
    node.type === "blockquote" ||
    node.type === "codeBlock" ||
    node.type === "tableRow" ||
    node.type === "taskItem"
  ) {
    return `${inner}\n`;
  }

  return inner;
}
