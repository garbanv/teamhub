"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { AtSign, History, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  SessionUser,
  TaskActivityEntry,
  TaskComment,
  WorkspaceMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function MentionText({
  text,
  mentions,
}: {
  text: string;
  mentions: TaskComment["mentions"];
}) {
  if (mentions.length === 0) {
    return <>{text}</>;
  }

  const names = mentions
    .map((mention) => mention.name)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  const pattern = new RegExp(`(@(?:${names.join("|")}))`, "g");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("@") &&
        mentions.some((mention) => part === `@${mention.name}`) ? (
          <span
            key={index}
            className="rounded bg-primary/10 px-1 py-0.5 font-medium text-primary"
          >
            {part}
          </span>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}

function activityIcon(type: string) {
  if (type === "comment_added") return MessageSquare;
  return History;
}

export function TaskConversation({
  taskId,
  workspaceId,
  members,
  currentUser,
  comments,
  activities,
}: {
  taskId: string;
  workspaceId: string;
  members: WorkspaceMember[];
  currentUser: SessionUser;
  comments: TaskComment[];
  activities: TaskActivityEntry[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(comments);
  const [text, setText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [mentionStart, setMentionStart] = React.useState<number | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setItems(comments);
  }, [comments]);

  const suggestions =
    mentionQuery === null
      ? []
      : members
          .filter((member) => {
            const query = mentionQuery.toLowerCase();
            return (
              member.name.toLowerCase().includes(query) ||
              member.email.toLowerCase().includes(query)
            );
          })
          .slice(0, 5);

  function updateMentionState(value: string, cursor: number) {
    const before = value.slice(0, cursor);
    const match = before.match(/(?:^|\s)@([a-zA-Z0-9._-]{0,32})$/);
    if (match) {
      setMentionQuery(match[1] ?? "");
      setMentionStart(cursor - (match[1]?.length ?? 0) - 1);
    } else {
      setMentionQuery(null);
      setMentionStart(null);
    }
  }

  function insertMention(member: WorkspaceMember) {
    if (mentionStart === null) return;
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const next = `${text.slice(0, mentionStart)}@${member.name} ${text.slice(cursor)}`;
    setText(next);
    setMentionQuery(null);
    setMentionStart(null);
    window.requestAnimationFrame(() => {
      const position = mentionStart + member.name.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(position, position);
    });
  }

  async function postComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body || posting) return;

    const mentionIds = members
      .filter((member) => body.includes(`@${member.name}`))
      .map((member) => member.userId);

    setPosting(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${taskId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: body, mentionIds }),
        },
      );
      const data = (await response.json()) as {
        comment?: TaskComment;
        error?: string;
      };
      if (!response.ok || !data.comment) {
        throw new Error(data.error || "Could not post the comment.");
      }
      setText("");
      setItems((current) => [...current, data.comment!]);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not post the comment.",
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="mt-8">
      <Tabs defaultValue="comments">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="comments" className="gap-1.5">
              <MessageSquare className="size-3.5" />
              Comments
              <span className="text-[9px] text-muted-foreground/60">
                {items.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <History className="size-3.5" />
              Activity
              <span className="text-[9px] text-muted-foreground/60">
                {activities.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="comments" className="mt-3">
          <div className="rounded-xl border border-border/80 bg-card">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <MessageSquare className="mx-auto size-4 text-muted-foreground/45" />
                <p className="mt-2 text-[12px] font-medium">No comments yet</p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  Start the conversation. Type @ to mention a teammate.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {items.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5 px-4 py-3">
                    <UserAvatar
                      name={comment.authorName}
                      image={comment.authorImage}
                      className="mt-0.5 size-7 border-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11.5px] font-semibold">
                          {comment.authorName}
                        </span>
                        <span className="text-[9.5px] text-muted-foreground/50">
                          {formatDistanceToNowStrict(
                            new Date(comment.createdAt),
                            { addSuffix: true },
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] leading-5 whitespace-pre-wrap text-foreground/85">
                        <MentionText
                          text={comment.bodyText}
                          mentions={comment.mentions}
                        />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={postComment}
              className="border-t border-border/60 p-3"
            >
              <div className="flex gap-2.5">
                <UserAvatar
                  name={currentUser.name}
                  image={currentUser.image}
                  className="mt-1 size-7 border-0"
                />
                <div className="relative min-w-0 flex-1">
                  <Textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(event) => {
                      setText(event.target.value);
                      updateMentionState(
                        event.target.value,
                        event.target.selectionStart,
                      );
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setMentionQuery(null);
                        setMentionStart(null);
                      }
                      if (
                        event.key === "Enter" &&
                        (event.metaKey || event.ctrlKey)
                      ) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Leave a comment… use @ to mention someone"
                    className="min-h-[74px] resize-none bg-card text-[12px]"
                    disabled={posting}
                  />

                  {mentionQuery !== null && suggestions.length > 0 && (
                    <div className="absolute bottom-[calc(100%+4px)] left-0 z-30 w-[230px] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-[0_12px_40px_-12px_rgba(16,16,24,0.3)]">
                      <p className="px-2 py-1 text-[9px] font-medium tracking-wide text-muted-foreground/55 uppercase">
                        Mention
                      </p>
                      {suggestions.map((member) => (
                        <button
                          key={member.userId}
                          type="button"
                          onClick={() => insertMention(member)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-accent"
                        >
                          <UserAvatar
                            name={member.name}
                            image={member.image}
                            className="size-5 border-0 [&_[data-slot=avatar-fallback]]:text-[6px]"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {member.name}
                          </span>
                          <span className="truncate text-[9px] text-muted-foreground/50">
                            {member.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[9.5px] text-muted-foreground/45">
                      <AtSign className="size-2.5" />
                      Mention · ⌘↵ to post
                    </span>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!text.trim() || posting}
                    >
                      {posting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <>
                          Comment
                          <Send className="size-3" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-3">
          <div className="rounded-xl border border-border/80 bg-card">
            {activities.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <History className="mx-auto size-4 text-muted-foreground/45" />
                <p className="mt-2 text-[12px] font-medium">No activity yet</p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  Changes to this task will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {activities.map((activity) => {
                  const Icon = activityIcon(activity.type);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-2.5 px-4 py-2.5"
                    >
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/30 text-muted-foreground/60">
                        <Icon className="size-3" />
                      </span>
                      <div className="min-w-0 flex-1 text-[11px] leading-4">
                        <span className="font-medium text-foreground/85">
                          {activity.actorName ?? "Someone"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {activity.description}
                        </span>
                        <p className="mt-0.5 text-[9px] text-muted-foreground/45">
                          {formatDistanceToNowStrict(
                            new Date(activity.createdAt),
                            { addSuffix: true },
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
