"use client";

import * as React from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Check,
  Code2,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Save,
  Strikethrough,
} from "lucide-react";

import { cn } from "@/lib/utils";

type SaveState = "idle" | "dirty" | "saving" | "saved";

export function RichTextEditor({
  initialContent,
  onSave,
  placeholder = "Add a description…",
  readOnly = false,
}: {
  initialContent: unknown;
  onSave: (json: unknown, text: string) => Promise<void>;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const [state, setState] = React.useState<SaveState>("idle");
  const saveRef = React.useRef(onSave);
  const dirtyRef = React.useRef(false);
  const savingRef = React.useRef(false);
  saveRef.current = onSave;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent as JSONContent,
    editable: !readOnly,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "tiptap hub-scrollbar",
      },
    },
    onUpdate: () => {
      dirtyRef.current = true;
      setState("dirty");
    },
    onBlur: () => {
      void save();
    },
  });

  async function save() {
    if (!editor || readOnly || savingRef.current || !dirtyRef.current) return;
    savingRef.current = true;
    setState("saving");
    try {
      await saveRef.current(editor.getJSON(), editor.getText());
      dirtyRef.current = false;
      setState("saved");
      window.setTimeout(() => {
        setState((current) => (current === "saved" ? "idle" : current));
      }, 1800);
    } catch {
      setState("dirty");
    } finally {
      savingRef.current = false;
    }
  }

  if (!editor) {
    return (
      <div className="min-h-[120px] rounded-lg border border-border bg-card px-3 py-3 text-[0.75rem] text-muted-foreground">
        Loading description…
      </div>
    );
  }

  const tools = [
    {
      label: "Bold",
      icon: Bold,
      active: editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Strikethrough",
      icon: Strikethrough,
      active: editor.isActive("strike"),
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "Heading",
      icon: Heading2,
      active: editor.isActive("heading", { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Bulleted list",
      icon: List,
      active: editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      active: editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      icon: Quote,
      active: editor.isActive("blockquote"),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Code block",
      icon: Code2,
      active: editor.isActive("codeBlock"),
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_1px_rgba(16,16,24,0.02)] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/15">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/70 bg-muted/20 px-1.5 py-1">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            aria-pressed={tool.active}
            onClick={tool.run}
            disabled={readOnly}
            className={cn(
              "flex size-7 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
              tool.active && "bg-accent text-foreground",
            )}
          >
            <tool.icon className="size-3.5" />
          </button>
        ))}

        <span className="ml-auto flex items-center gap-1.5 pr-1">
          {!readOnly && (
            <>
              <span className="text-[0.5938rem] text-muted-foreground/55">
                {state === "dirty" && "Unsaved"}
                {state === "saving" && "Saving…"}
                {state === "saved" && "Saved"}
              </span>
              <button
                type="button"
                onClick={save}
                disabled={state === "saving" || state === "idle"}
                className="flex h-6 items-center gap-1 rounded border border-border bg-card px-1.5 text-[0.625rem] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-45"
              >
                {state === "saving" ? (
                  <Loader2 className="size-2.5 animate-spin" />
                ) : state === "saved" ? (
                  <Check className="size-2.5" />
                ) : (
                  <Save className="size-2.5" />
                )}
                Save
              </button>
            </>
          )}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
