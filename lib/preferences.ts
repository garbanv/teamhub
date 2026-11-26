import { query } from "./db";
import { projectTaskViews, type ProjectTaskView } from "./task-view";

export type UserPreferences = {
  defaultProjectView: ProjectTaskView;
};

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  const { rows } = await query<{ defaultProjectView: string }>(
    `select default_project_view as "defaultProjectView"
     from user_preferences where user_id = $1`,
    [userId],
  );
  const value = rows[0]?.defaultProjectView as ProjectTaskView | undefined;
  return {
    defaultProjectView:
      value && projectTaskViews.includes(value) ? value : "list",
  };
}

export async function updateUserPreferences(
  userId: string,
  input: { defaultProjectView: ProjectTaskView },
): Promise<UserPreferences> {
  await query(
    `insert into user_preferences (user_id, default_project_view)
     values ($1, $2)
     on conflict (user_id) do update
       set default_project_view = excluded.default_project_view,
           updated_at = now()`,
    [userId, input.defaultProjectView],
  );
  return getUserPreferences(userId);
}
