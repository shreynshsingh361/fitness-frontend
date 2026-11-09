// The shapes of the JSON the backend sends. They mirror the API contract, which
// lives in the separate backend project (fitness-backend/contracts/openapi.yaml).
// If the API changes there, change them here too.

export type User = { id: string; email: string; name: string; created_at: string };

export type AuthResponse = {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type Page<T> = { items: T[]; page: number; limit: number; total: number };

// ---------- workouts ----------

export type Exercise = { id: string; name: string; muscle_group: string; equipment: string };

export type WorkoutSet = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  position: number;
  reps: number;
  weight_kg: number;
};

export type Workout = {
  id: string;
  name: string;
  notes: string;
  started_at: string;
  duration_minutes: number;
  created_at: string;
  set_count: number;
  volume_kg: number;
  sets?: WorkoutSet[]; // only present when a single workout is fetched
};

export type NewWorkout = {
  client_op_id: string;
  name: string;
  notes: string;
  started_at: string;
  duration_minutes: number;
  sets: { exercise_id: string; reps: number; weight_kg: number }[];
};

export type WorkoutSummary = {
  days: number;
  workouts: number;
  total_sets: number;
  volume_kg: number;
  last_workout_at: string | null;
};

export type PersonalRecord = {
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  achieved_at: string;
};

// ---------- nutrition ----------

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export type Food = {
  id: string;
  name: string;
  serving: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type DiaryEntry = {
  id: string;
  eaten_on: string;
  meal: Meal;
  food_id: string | null;
  food_name: string;
  serving: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
};

export type Totals = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

export type DiaryDay = { date: string; entries: DiaryEntry[]; totals: Totals };

export type Goal = { calories: number; is_default: boolean };

export type DaySummary = {
  date: string;
  calories_eaten: number;
  calories_goal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  entry_count: number;
};

// ---------- dashboard (assembled by the gateway from two services) ----------

export type Dashboard = {
  date: string;
  workouts: WorkoutSummary | null; // null = that service did not answer
  nutrition: DaySummary | null;
  steps: StepsDay | null;
  unavailable: string[];
};

// ---------- steps ----------

export type StepsDay = {
  date: string;
  steps: number;
  goal: number;
  goal_met: boolean;
  distance_km: number;
  calories: number;
  sources: { source: string; steps: number }[];
  current_streak: number;
};

export type StepsHistoryDay = {
  date: string;
  steps: number;
  goal_met: boolean;
  distance_km: number;
  calories: number;
};

export type StepsHistory = {
  from: string;
  to: string;
  goal: number;
  total_steps: number;
  average_steps: number;
  days: StepsHistoryDay[];
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  period: "daily" | "weekly" | "all_time";
  earned: boolean;
  earned_on: string | null;
};

export type StepsStats = {
  current_streak: number;
  longest_streak: number;
  best_day: { date: string; steps: number } | null;
  best_week: { from: string; to: string; steps: number } | null;
  lifetime_steps: number;
  lifetime_distance_km: number;
  days_tracked: number;
  this_week: { from: string; to: string; steps: number; days_goal_met: number };
  achievements: Achievement[];
  country_rank: {
    country: string;
    from: string;
    to: string;
    rank: number;
    total_users: number;
    top_100: boolean;
  } | null;
};

export type StepSettings = { daily_goal: number; country: string | null; is_default: boolean };

// ---------- friends ----------

export type BoardRow = {
  rank: number;
  user_id: string;
  name: string;
  steps: number;
  is_me: boolean;
};

export type FriendsBoard = {
  period: "day" | "week";
  from: string;
  to: string;
  steps_available: boolean;
  items: BoardRow[];
};

export type HiddenUser = { user_id: string; name: string };

export type Nudge = {
  id: string;
  from_user_id: string;
  from_name: string;
  kind: "cheer" | "taunt";
  group_id: string | null;
  group_name: string | null;
  created_at: string;
  read: boolean;
};

// ---------- groups ----------

export type Group = {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  mystery_mode: boolean;
  chat_enabled: boolean;
  taunts_enabled: boolean;
  challenge_start: string | null;
  challenge_end: string | null;
  created_at: string;
  member_count: number;
  my_role: "admin" | "member";
};

export type GroupPreview = {
  id: string;
  name: string;
  description: string;
  member_count: number;
  is_member: boolean;
};

export type Member = {
  user_id: string;
  name: string;
  role: "admin" | "member";
  joined_at: string;
  is_me: boolean;
};

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  name: string;
  steps: number | null;
  steps_hidden: boolean;
  is_me: boolean;
};

export type Period = "day" | "week" | "month" | "challenge";

export type Leaderboard = {
  period: Period;
  from: string;
  to: string;
  mystery_active: boolean;
  revealed_through?: string;
  page: number;
  limit: number;
  total: number;
  items: LeaderboardRow[];
  me: LeaderboardRow | null;
};

export type Message = {
  id: string;
  user_id: string;
  name: string;
  body: string;
  removed: boolean;
  mine: boolean;
  created_at: string;
};
