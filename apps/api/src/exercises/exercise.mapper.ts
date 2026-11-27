import type { Equipment, Exercise, ExerciseRef, ExerciseType, MuscleGroup } from '@lifty/shared';
import type { Exercise as ExerciseRow } from '../generated/prisma/client.js';

// Casts: colunas de domínio só são gravadas via schemas Zod de @lifty/shared.

export function toExerciseRef(row: ExerciseRow): ExerciseRef {
  return {
    id: row.id,
    name: row.name,
    primaryMuscle: row.primaryMuscle as MuscleGroup,
    equipment: row.equipment as Equipment,
    type: row.type as ExerciseType,
    archived: row.archivedAt !== null,
  };
}

export function toExercise(row: ExerciseRow): Exercise {
  return {
    ...toExerciseRef(row),
    secondaryMuscles: row.secondaryMuscles as MuscleGroup[],
    description: row.description,
    instructions: row.instructions,
    mediaUrl: row.mediaUrl,
    isCustom: row.userId !== null,
  };
}
