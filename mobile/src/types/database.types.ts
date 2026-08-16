/**
 * Hand-written against `supabase/migrations/*.sql` because the local
 * Supabase stack (Docker) wasn't running when this was written, so
 * `supabase gen types typescript --local` couldn't be run.
 *
 * Scoped to exactly the tables/columns the mobile app reads/writes in
 * Milestone 0, but each table still declares `Insert`/`Update`/
 * `Relationships` (even where unused) because @supabase/postgrest-js's
 * `GenericTable`/`GenericSchema` constraints require that full shape to
 * type-check `.select()` calls at all — omitting them silently collapses
 * every query result to `never` rather than erroring at the field.
 *
 * Every type below uses `type X = {...}`, never `interface X {...}` —
 * postgrest-js's type-level select-string parser relies on structural
 * (not declared/interface) types to resolve `GetResult<...>`; an
 * `interface` anywhere in this chain silently collapses every query's
 * inferred result to `null`/`never` instead of erroring, which is exactly
 * as confusing to debug as it sounds. Keep it `type` end to end.
 *
 * Regenerate the real thing once Docker is available and delete this file:
 *
 *   npx supabase gen types typescript --local --schema public \
 *     > mobile/src/types/database.types.ts
 */

export type WorkspaceRole = "coach" | "client";
export type MembershipStatus = "active" | "suspended";
export type ClientStatus = "active" | "paused" | "archived";
export type WorkspaceApprovalStatus = "pending_review" | "approved" | "rejected";
export type WorkoutPlanStatus = "draft" | "active" | "archived";
export type WorkoutAssignmentStatus = "active" | "completed" | "cancelled";
export type NutritionPlanStatus = "draft" | "active" | "archived";
export type NutritionAssignmentStatus = "active" | "completed" | "cancelled";

type WorkspaceRow = {
  id: string;
  name: string;
  owner_id: string;
  is_demo: boolean;
  demo_expires_at: string | null;
  approval_status: WorkspaceApprovalStatus;
  approval_note: string | null;
  created_at: string;
  updated_at: string;
};

type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  status: MembershipStatus;
  joined_at: string;
  created_at: string;
  updated_at: string;
};

type ClientRow = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  timezone: string;
  created_at: string;
  updated_at: string;
};

type CheckInRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  submitted_by: string;
  week_start: string;
  weight_kg: number | null;
  energy_score: number;
  mood_score: number;
  notes: string | null;
  coach_feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type WorkoutPlanRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: WorkoutPlanStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type WorkoutPlanAssignmentRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  workout_plan_id: string;
  assigned_by: string;
  status: WorkoutAssignmentStatus;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
  updated_at: string;
};

type NutritionPlanRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  daily_calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  status: NutritionPlanStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type NutritionPlanAssignmentRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  nutrition_plan_id: string;
  assigned_by: string;
  status: NutritionAssignmentStatus;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: WorkspaceRow;
        Insert: Partial<WorkspaceRow>;
        Update: Partial<WorkspaceRow>;
        Relationships: [];
      };
      workspace_members: {
        Row: WorkspaceMemberRow;
        Insert: Partial<WorkspaceMemberRow>;
        Update: Partial<WorkspaceMemberRow>;
        Relationships: [];
      };
      clients: {
        Row: ClientRow;
        Insert: Partial<ClientRow>;
        Update: Partial<ClientRow>;
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      check_ins: {
        Row: CheckInRow;
        Insert: Partial<CheckInRow>;
        Update: Partial<CheckInRow>;
        Relationships: [
          {
            foreignKeyName: "check_ins_client_workspace_fk";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plans: {
        Row: WorkoutPlanRow;
        Insert: Partial<WorkoutPlanRow>;
        Update: Partial<WorkoutPlanRow>;
        Relationships: [];
      };
      workout_plan_assignments: {
        Row: WorkoutPlanAssignmentRow;
        Insert: Partial<WorkoutPlanAssignmentRow>;
        Update: Partial<WorkoutPlanAssignmentRow>;
        Relationships: [
          {
            foreignKeyName: "workout_assignments_client_workspace_fk";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_assignments_plan_workspace_fk";
            columns: ["workout_plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      nutrition_plans: {
        Row: NutritionPlanRow;
        Insert: Partial<NutritionPlanRow>;
        Update: Partial<NutritionPlanRow>;
        Relationships: [];
      };
      nutrition_plan_assignments: {
        Row: NutritionPlanAssignmentRow;
        Insert: Partial<NutritionPlanAssignmentRow>;
        Update: Partial<NutritionPlanAssignmentRow>;
        Relationships: [
          {
            foreignKeyName: "nutrition_plan_assignments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nutrition_plan_assignments_nutrition_plan_id_fkey";
            columns: ["nutrition_plan_id"];
            isOneToOne: false;
            referencedRelation: "nutrition_plans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_client_status: {
        Args: { target_client_id: string; requested_status: ClientStatus };
        Returns: void;
      };
      delete_client: {
        Args: { target_client_id: string };
        Returns: void;
      };
    };
  };
};
