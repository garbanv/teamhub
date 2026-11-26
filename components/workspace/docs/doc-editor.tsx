"use client";

import * as React from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { TableKit } from "@tiptap/extension-table";
import { Image as ImageExtension } from "@tiptap/extension-image";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import {
  Bold,
  CheckSquare,
  Code2,
  Columns3,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Paperclip,
  Plus,
  Quote,
  Rows3,
  Strikethrough,
  Table2,
  Text,
  Trash2,
  Underline,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

const bubbleOptions = { placement: "top" as const, offset: 8 };

type SlashCommand = {
  id: string;
  label: string;
  description: string;
  keywords: string;
  icon: LucideIcon;
  run: (editor: NonNullable<ReturnType<typeof useEditor>>) => void;
};

const slashCommands: SlashCommand[] = [
  {
    id: "text",
    label: "Text",
    description: "Plain paragraph",
    keywords: "paragraph plain",
    icon: Text,
    run: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: "h1",
    label: "Heading 1",
    description: "Large section title",
    keywords: "title h1",
    icon: Heading1,
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Medium section title",
    keywords: "subtitle h2",
    icon: Heading2,
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Small section title",
    keywords: "subtitle h3",
    icon: Heading3,
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bullets",
    label: "Bulleted list",
    description: "A simple unordered list",
    keywords: "bullet unordered list",
    icon: List,
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "numbers",
    label: "Numbered list",
    description: "An ordered list",
    keywords: "number ordered list",
    icon: ListOrdered,
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "tasks",
    label: "To-do list",
    description: "Track blocks as done",
    keywords: "check checklist todo task",
    icon: CheckSquare,
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "quote",
    label: "Quote",
    description: "Highlight a passage",
    keywords: "quote blockquote",
    icon: Quote,
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code",
    label: "Code block",
    description: "Code with syntax highlighting",
    keywords: "code snippet pre",
    icon: Code2,
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "divider",
    label: "Divider",
    description: "Separate sections",
    keywords: "horizontal rule line divider",
    icon: Minus,
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "table",
    label: "Table",
    description: "A 3 × 3 table",
    keywords: "table grid columns rows",
    icon: Table2,
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: "image",
    label: "Image",
    description: "Upload an image",
    keywords: "image photo picture upload",
    icon: ImageIcon,
    run: () => undefined,
  },
  {
    id: "file",
    label: "File",
    description: "Attach a downloadable file",
    keywords: "file attachment upload pdf",
    icon: Paperclip,
    run: () => undefined,
  },
];


function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function DocEditor({
  workspaceId,
  initialContent,
  onChange,
  onBlur,
  className,
}: {
  workspaceId: string;
  initialContent: unknown;
  onChange: (json: unknown, text: string) => void;
  onBlur?: () => void;
  className?: string;
}) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [slash, setSlash] = React.useState<{
    query: string;
    from: number;
    top: number;
    left: number;
    index: number;
  } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({
        table: { resizable: true },
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: initialContent as JSONContent,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "doc-tiptap",
      },
      handleClick: () => {
        setSlash(null);
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), editor.getText());

      const { from, empty } = editor.state.selection;
      if (!empty) {
        setSlash(null);
        return;
      }
      const before = editor.state.doc.textBetween(
        Math.max(0, from - 60),
        from,
        "\n",
        " ",
      );
      const match = /(?:^|\s)\/([^/\n]{0,30})$/.exec(before);
      const box = wrapperRef.current?.getBoundingClientRect();
      if (!match || !box) {
        setSlash(null);
        return;
      }

      const coords = editor.view.coordsAtPos(from);
      const query = match[1] ?? "";
      setSlash((current) => ({
        query,
        from: from - query.length - 1,
        top: coords.bottom - box.top + 6,
        left: Math.min(coords.left - box.left, Math.max(box.width - 310, 12)),
        index: current?.query === query ? current.index : 0,
      }));
    },
    onBlur: () => {
      onBlur?.();
      window.setTimeout(() => setSlash(null), 120);
    },
  });

  const filteredCommands = React.useMemo(() => {
    const query = slash?.query.trim().toLowerCase() ?? "";
    if (!query) return slashCommands;
    return slashCommands.filter((command) =>
      `${command.label} ${command.keywords}`
        .toLowerCase()
        .includes(query),
    );
  }, [slash?.query]);

  const bubbleShouldShow = React.useCallback(
    ({
      editor: current,
      state,
    }: {
      editor: NonNullable<ReturnType<typeof useEditor>>;
      state: { selection: { empty: boolean } };
    }) =>
      (!state.selection.empty ||
        current.isActive("table") ||
        current.isActive("codeBlock")) &&
      !current.isActive("image"),
    [],
  );

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(
        `/api/workspaces/${workspaceId}/docs/upload`,
        { method: "POST", body: form },
      );
      const data = (await response.json()) as {
        file?: {
          name: string;
          mimeType: string;
          url: string;
          downloadUrl: string;
        };
        error?: string;
      };
      if (!response.ok || !data.file) {
        throw new Error(data.error || "Upload failed.");
      }
      return data.file;
    } finally {
      setUploading(false);
    }
  }

  async function handleImage(file: File) {
    try {
      const uploaded = await upload(file);
      editor?.chain().focus().setImage({ src: uploaded.url, alt: uploaded.name }).run();
      onChange(editor?.getJSON(), editor?.getText() ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  async function handleFile(file: File) {
    try {
      const uploaded = await upload(file);
      editor
        ?.chain()
        .focus()
        .insertContent([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `📎 ${uploaded.name}`,
                marks: [
                  {
                    type: "link",
                    attrs: {
                      href: uploaded.downloadUrl,
                      target: "_blank",
                      rel: "noopener noreferrer",
                    },
                  },
                ],
              },
            ],
          },
        ])
        .run();
      onChange(editor?.getJSON(), editor?.getText() ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  function clearSlashAndOpen(input: React.RefObject<HTMLInputElement | null>) {
    if (!editor || !slash) return;
    const from = editor.state.selection.from;
    editor.chain().focus().deleteRange({ from: slash.from, to: from }).run();
    setSlash(null);
    input.current?.click();
  }

  function runCommand(command: SlashCommand) {
    if (!editor) return;
    if (command.id === "image") {
      clearSlashAndOpen(imageInputRef);
      return;
    }
    if (command.id === "file") {
      clearSlashAndOpen(fileInputRef);
      return;
    }
    const from = editor.state.selection.from;
    if (slash) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: slash.from, to: from })
        .run();
    }
    setSlash(null);
    command.run(editor);
    onChange(editor.getJSON(), editor.getText());
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!slash || filteredCommands.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSlash((current) =>
        current
          ? {
              ...current,
              index: (current.index + 1) % filteredCommands.length,
            }
          : current,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSlash((current) =>
        current
          ? {
              ...current,
              index:
                (current.index - 1 + filteredCommands.length) %
                filteredCommands.length,
            }
          : current,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = filteredCommands[slash.index] ?? filteredCommands[0];
      if (command) runCommand(command);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSlash(null);
    }
  }

  if (!editor) {
    return (
      <div className="min-h-[420px] animate-pulse rounded-lg border border-border/60 bg-muted/20" />
    );
  }

  const inTable = editor.isActive("table");
  const inCodeBlock = editor.isActive("codeBlock");
  const codeLanguage =
    (editor.getAttributes("codeBlock").language as string | undefined) ??
    "plaintext";

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", className)}
      onKeyDown={handleKeyDown}
    >
      <BubbleMenu
        editor={editor}
        options={bubbleOptions}
        shouldShow={bubbleShouldShow}
        className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-[0_12px_32px_-12px_rgba(16,16,24,0.35)]"
      >
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const previous = editor.getAttributes("link").href as string | undefined;
            const href = window.prompt("Link URL", previous ?? "https://");
            if (href === null) return;
            if (!href.trim()) {
              editor.chain().focus().unsetLink().run();
            } else {
              editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
            }
          }}
        >
          <Link2 className="size-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>

        {inTable && (
          <>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <ToolbarButton
              label="Add row"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <Rows3 className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="Add column"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <Columns3 className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="Delete table"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <Trash2 className="size-3.5" />
            </ToolbarButton>
          </>
        )}

        {inCodeBlock && (
          <>
            <span className="mx-0.5 h-4 w-px bg-border" />
            <select
              aria-label="Code language"
              value={codeLanguage}
              onMouseDown={(event) => event.stopPropagation()}
              onChange={(event) =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes("codeBlock", {
                    language: event.target.value,
                  })
                  .run()
              }
              className="h-7 rounded border border-border bg-card px-1.5 text-[0.625rem] text-muted-foreground outline-none"
            >
              {[
                "plaintext",
                "javascript",
                "typescript",
                "python",
                "css",
                "xml",
                "json",
                "bash",
                "sql",
                "markdown",
                "yaml",
                "go",
              ].map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </>
        )}
      </BubbleMenu>

      {slash && (
        <div
          className="absolute z-40 w-[18.25rem] overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-[0_18px_50px_-16px_rgba(16,16,24,0.35)]"
          style={{ top: slash.top, left: slash.left }}
        >
          <p className="px-2 py-1 text-[0.5625rem] font-medium tracking-[0.12em] text-muted-foreground/50 uppercase">
            {slash.query ? `Blocks matching “${slash.query}”` : "Insert a block"}
          </p>
          {filteredCommands.length === 0 ? (
            <p className="px-2 py-4 text-center text-[0.6875rem] text-muted-foreground">
              No blocks found.
            </p>
          ) : (
            <div className="max-h-[17.875rem] overflow-y-auto">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    runCommand(command);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
                    index === slash.index
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/60",
                  )}
                >
                  <span className="flex size-7 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground">
                    <command.icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.7188rem] font-medium">
                      {command.label}
                    </span>
                    <span className="block truncate text-[0.5938rem] text-muted-foreground">
                      {command.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {uploading && (
        <div className="absolute inset-x-0 top-0 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-popover px-2.5 py-1 text-[0.625rem] text-muted-foreground shadow-md">
            <Loader2 className="size-3 animate-spin" />
            Uploading…
          </span>
        </div>
      )}

      <EditorContent editor={editor} />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleImage(file);
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
