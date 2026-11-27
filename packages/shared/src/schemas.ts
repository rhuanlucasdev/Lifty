import { z } from 'zod';
import { EQUIPMENT, EXERCISE_TYPES, MUSCLE_GROUPS, SEXES, STAT_RANGES } from './constants.js';

// Mensagens de validação em português (API e formulários).
z.config(z.locales.pt());

/** Data de calendário YYYY-MM-DD válida. */
export const localDateSchema = z.iso.date();

export const idParamSchema = z.coerce.number().int().positive();

// Perfil ----------------------------------------------------------------------

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  birthDate: localDateSchema.nullable(),
  sex: z.enum(SEXES).nullable(),
  heightCm: z.number().int().min(100).max(250).nullable(),
  weeklyGoal: z.number().int().min(1).max(7),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const bodyWeightSchema = z.object({
  weightKg: z.number().min(20).max(400),
  measuredOn: localDateSchema,
});
export type BodyWeightInput = z.infer<typeof bodyWeightSchema>;

// Exercícios ------------------------------------------------------------------

export const exerciseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  primaryMuscle: z.enum(MUSCLE_GROUPS),
  secondaryMuscles: z
    .array(z.enum(MUSCLE_GROUPS))
    .max(MUSCLE_GROUPS.length)
    .refine((list) => new Set(list).size === list.length, 'Grupos musculares repetidos'),
  equipment: z.enum(EQUIPMENT),
  type: z.enum(EXERCISE_TYPES),
  description: z.string().trim().max(1000),
  instructions: z.string().trim().max(4000),
  mediaUrl: z.url().max(500).nullable(),
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

export const exerciseQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  muscle: z.enum(MUSCLE_GROUPS).optional(),
  equipment: z.enum(EQUIPMENT).optional(),
});
export type ExerciseQuery = z.infer<typeof exerciseQuerySchema>;

// Fichas ----------------------------------------------------------------------

export const workoutPlanExerciseSchema = z
  .object({
    exerciseId: z.number().int().positive(),
    sets: z.number().int().min(1).max(20),
    repMin: z.number().int().min(1).max(100),
    repMax: z.number().int().min(1).max(100),
    restSeconds: z.number().int().min(0).max(900),
    notes: z.string().trim().max(500),
  })
  .refine((e) => e.repMax >= e.repMin, {
    message: 'Repetição máxima deve ser maior ou igual à mínima',
    path: ['repMax'],
  });

export const workoutPlanSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor hexadecimal #RRGGBB'),
  exercises: z.array(workoutPlanExerciseSchema).min(1).max(30),
});
export type WorkoutPlanInput = z.infer<typeof workoutPlanSchema>;

// Sessões ---------------------------------------------------------------------

export const startSessionSchema = z.object({
  planId: z.number().int().positive(),
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

const loadKg = z.number().min(0).max(1000).nullable();
const reps = z.number().int().min(0).max(1000).nullable();

export const addSetSchema = z.object({
  sessionExerciseId: z.number().int().positive(),
  loadKg: loadKg.default(null),
  reps: reps.default(null),
  isWarmup: z.boolean().default(false),
});
export type AddSetInput = z.infer<typeof addSetSchema>;

export const updateSetSchema = z
  .object({
    loadKg,
    reps,
    rpe: z.number().min(1).max(10).multipleOf(0.5).nullable(),
    isWarmup: z.boolean(),
    notes: z.string().trim().max(500),
    completed: z.boolean(),
  })
  .partial();
export type UpdateSetInput = z.infer<typeof updateSetSchema>;

export const addSessionExerciseSchema = z.object({
  exerciseId: z.number().int().positive(),
  sets: z.number().int().min(1).max(20).default(3),
});
export type AddSessionExerciseInput = z.infer<typeof addSessionExerciseSchema>;

export const finishSessionSchema = z.object({
  notes: z.string().trim().max(2000).default(''),
});
export type FinishSessionInput = z.infer<typeof finishSessionSchema>;

export const sessionListQuerySchema = z.object({
  from: localDateSchema.optional(),
  to: localDateSchema.optional(),
});
export type SessionListQuery = z.infer<typeof sessionListQuerySchema>;

// Estatísticas ----------------------------------------------------------------

export const statRangeQuerySchema = z.object({
  range: z.enum(STAT_RANGES).default('90d'),
});
export type StatRangeQuery = z.infer<typeof statRangeQuerySchema>;
