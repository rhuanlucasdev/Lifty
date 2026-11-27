import type { Equipment, ExerciseType, MuscleGroup, Sex } from './constants.js';

// Contratos de resposta da API. Datas/instantes trafegam como string ISO.

export interface HealthResponse {
  status: 'ok';
  database: 'ok';
  timestamp: string;
}

export interface Profile {
  id: number;
  name: string;
  birthDate: string | null;
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weeklyGoal: number;
  currentWeightKg: number | null;
}

export interface BodyWeightEntry {
  id: number;
  weightKg: number;
  measuredOn: string;
}

export interface Exercise {
  id: number;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  type: ExerciseType;
  description: string;
  instructions: string;
  mediaUrl: string | null;
  isCustom: boolean;
  archived: boolean;
}

export type ExerciseRef = Pick<
  Exercise,
  'id' | 'name' | 'primaryMuscle' | 'equipment' | 'type' | 'archived'
>;

export interface WorkoutPlanExercise {
  id: number;
  position: number;
  exercise: ExerciseRef;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  notes: string;
}

export interface WorkoutPlan {
  id: number;
  name: string;
  description: string;
  color: string;
  exercises: WorkoutPlanExercise[];
  updatedAt: string;
}

/** Cópia da ficha no momento em que a sessão começou. */
export interface PlanSnapshot {
  name: string;
  description: string;
  color: string;
}

/** Cópia do exercício e do planejamento no momento em que a sessão começou. */
export interface SessionExerciseSnapshot {
  name: string;
  primaryMuscle: MuscleGroup;
  equipment: Equipment;
  type: ExerciseType;
  plannedSets: number;
  repMin: number | null;
  repMax: number | null;
  restSeconds: number | null;
  notes: string;
}

export interface WorkoutSet {
  id: number;
  setNumber: number;
  loadKg: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  notes: string;
  completedAt: string | null;
}

export interface PreviousExecution {
  sessionId: number;
  localDate: string;
  sets: Pick<WorkoutSet, 'setNumber' | 'loadKg' | 'reps'>[];
}

/** Melhores marcas antes desta sessão, para feedback de superação. */
export interface ExerciseBests {
  maxLoadKg: number | null;
  maxReps: number | null;
  bestEstimated1RmKg: number | null;
}

export interface WorkoutSessionExercise {
  id: number;
  exerciseId: number;
  position: number;
  snapshot: SessionExerciseSnapshot;
  sets: WorkoutSet[];
  previous: PreviousExecution | null;
  bestsBefore: ExerciseBests;
}

export type SessionStatus = 'active' | 'paused' | 'finished';

export interface WorkoutSession {
  id: number;
  planId: number | null;
  plan: PlanSnapshot;
  status: SessionStatus;
  startedAt: string;
  pausedAt: string | null;
  /** Segundos pausados já encerrados (não inclui a pausa em andamento). */
  pausedSeconds: number;
  finishedAt: string | null;
  durationSeconds: number;
  localDate: string;
  notes: string;
  exercises: WorkoutSessionExercise[];
}

export interface ActiveSessionResponse {
  session: WorkoutSession | null;
}

export interface WorkoutSessionSummary {
  id: number;
  plan: PlanSnapshot;
  startedAt: string;
  finishedAt: string;
  localDate: string;
  durationSeconds: number;
  exerciseCount: number;
  completedSets: number;
  totalVolumeKg: number;
}

export type RecordType = 'load' | 'reps';

export interface PersonalRecordEvent {
  exerciseId: number;
  exerciseName: string;
  type: RecordType;
  value: number;
  previous: number;
  sessionId: number;
  localDate: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedOn: string | null;
}

export interface LevelProgress {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export interface StreakInfo {
  weeklyGoal: number;
  workoutsThisWeek: number;
  currentWeeks: number;
  bestWeeks: number;
  trainedDays: number;
}

export interface GamificationProgress extends LevelProgress {
  streak: StreakInfo;
  achievements: Achievement[];
}

export interface FinishSessionResult {
  summary: WorkoutSessionSummary;
  records: PersonalRecordEvent[];
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  newAchievements: Achievement[];
}

export interface DashboardStats {
  progress: LevelProgress;
  streak: StreakInfo;
  totalWorkouts: number;
  volumeLast30DaysKg: number;
  recentSessions: WorkoutSessionSummary[];
  recentRecords: PersonalRecordEvent[];
}

export interface ExerciseSessionPoint {
  sessionId: number;
  localDate: string;
  maxLoadKg: number | null;
  maxReps: number;
  totalReps: number;
  volumeKg: number;
  estimated1RmKg: number | null;
}

export interface RecordMark {
  value: number;
  localDate: string;
  sessionId: number;
}

export interface ExerciseStatistics {
  exercise: ExerciseRef;
  points: ExerciseSessionPoint[];
  maxLoad: RecordMark | null;
  maxReps: RecordMark | null;
  /** Estimativa (Epley) — não é um recorde real. */
  bestEstimated1Rm: RecordMark | null;
  /** Variação % entre a primeira e a última sessão do período (carga máx.; reps para peso corporal). */
  progressPercent: number | null;
  recordHistory: PersonalRecordEvent[];
}
