import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type {
  ActiveSessionResponse,
  Exercise,
  ExerciseStatistics,
  FinishSessionResult,
  GamificationProgress,
  WorkoutPlan,
  WorkoutSession,
} from '@lifty/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

// Fluxo principal de ponta a ponta sobre um banco real (migrations + seed).

describe('Lifty API (e2e)', () => {
  let app: INestApplication<App>;
  const api = () => request(app.getHttpServer());
  const url = (path: string) => `/api/v1${path}`;

  let bench: Exercise;
  let plan: WorkoutPlan;
  let firstSessionId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports health', async () => {
    const res = await api().get(url('/health')).expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('updates the profile and derives age and current weight', async () => {
    await api()
      .put(url('/users/profile'))
      .send({ name: 'Teste', birthDate: '1995-06-15', sex: null, heightCm: 180, weeklyGoal: 3 })
      .expect(200);
    await api().post(url('/users/body-weight')).send({ weightKg: 80, measuredOn: '2026-01-01' }).expect(201);
    await api().post(url('/users/body-weight')).send({ weightKg: 82.5, measuredOn: '2026-02-01' }).expect(201);
    const res = await api().get(url('/users/profile')).expect(200);
    expect(res.body).toMatchObject({ name: 'Teste', currentWeightKg: 82.5 });
    expect(res.body.age).toBeGreaterThanOrEqual(30);
  });

  it('searches exercises ignoring accents and protects system exercises', async () => {
    const res = await api().get(url('/exercises?search=elevacao')).expect(200);
    expect((res.body as Exercise[]).map((e) => e.name)).toContain('Elevação lateral');

    const all = (await api().get(url('/exercises')).expect(200)).body as Exercise[];
    bench = all.find((e) => e.name === 'Supino reto com barra')!;
    expect(bench.isCustom).toBe(false);

    await api()
      .put(url(`/exercises/${bench.id}`))
      .send({ ...bench, name: 'Outro nome' })
      .expect(403);
  });

  it('validates plans', async () => {
    await api()
      .post(url('/workout-plans'))
      .send({
        name: 'Inválida',
        description: '',
        color: '#55D68A',
        exercises: [{ exerciseId: bench.id, sets: 3, repMin: 12, repMax: 8, restSeconds: 90, notes: '' }],
      })
      .expect(400);
  });

  it('creates a plan', async () => {
    const res = await api()
      .post(url('/workout-plans'))
      .send({
        name: 'A — Peito',
        description: '',
        color: '#55D68A',
        exercises: [{ exerciseId: bench.id, sets: 3, repMin: 8, repMax: 12, restSeconds: 90, notes: '' }],
      })
      .expect(201);
    plan = res.body as WorkoutPlan;
    expect(plan.exercises).toHaveLength(1);
  });

  it('starts a session with pending planned sets and allows only one in progress', async () => {
    const res = await api().post(url('/workout-sessions/start')).send({ planId: plan.id }).expect(201);
    const session = res.body as WorkoutSession;
    firstSessionId = session.id;
    expect(session.status).toBe('active');
    expect(session.exercises[0]!.sets).toHaveLength(3);
    expect(session.exercises[0]!.previous).toBeNull();

    await api().post(url('/workout-sessions/start')).send({ planId: plan.id }).expect(409);
    const active = (await api().get(url('/workout-sessions/active')).expect(200)).body as ActiveSessionResponse;
    expect(active.session?.id).toBe(firstSessionId);
  });

  it('refuses to finish without completed sets', async () => {
    await api().post(url(`/workout-sessions/${firstSessionId}/finish`)).send({}).expect(400);
  });

  it('logs sets, pauses, resumes and finishes with XP', async () => {
    const session = (await api().get(url(`/workout-sessions/${firstSessionId}`)).expect(200))
      .body as WorkoutSession;
    const [s1, s2] = session.exercises[0]!.sets;
    await api()
      .patch(url(`/workout-sessions/${firstSessionId}/sets/${s1!.id}`))
      .send({ loadKg: 60, reps: 10, completed: true })
      .expect(200);
    await api()
      .patch(url(`/workout-sessions/${firstSessionId}/sets/${s2!.id}`))
      .send({ loadKg: 60, reps: 8, completed: true })
      .expect(200);
    // Aquecimento concluído não conta para volume, recordes nem XP.
    const warmup = await api()
      .post(url(`/workout-sessions/${firstSessionId}/sets`))
      .send({ sessionExerciseId: session.exercises[0]!.id, loadKg: 100, reps: 5, isWarmup: true })
      .expect(201);
    await api()
      .patch(url(`/workout-sessions/${firstSessionId}/sets/${warmup.body.id}`))
      .send({ completed: true })
      .expect(200);

    const paused = await api().post(url(`/workout-sessions/${firstSessionId}/pause`)).expect(200);
    expect(paused.body.status).toBe('paused');
    await api().post(url(`/workout-sessions/${firstSessionId}/pause`)).expect(409);
    const resumed = await api().post(url(`/workout-sessions/${firstSessionId}/resume`)).expect(200);
    expect(resumed.body.status).toBe('active');

    const res = await api()
      .post(url(`/workout-sessions/${firstSessionId}/finish`))
      .send({ notes: 'Bom treino' })
      .expect(200);
    const result = res.body as FinishSessionResult;
    expect(result.summary.completedSets).toBe(2);
    expect(result.summary.totalVolumeKg).toBe(60 * 10 + 60 * 8);
    expect(result.records).toEqual([]); // primeira execução é linha de base
    expect(result.xpGained).toBe(2 * 5 + 50);
    expect(result.newAchievements.map((a) => a.id)).toEqual(['first_workout']);
  });

  it('shows previous execution and records a new personal record', async () => {
    const start = await api().post(url('/workout-sessions/start')).send({ planId: plan.id }).expect(201);
    const session = start.body as WorkoutSession;
    const exercise = session.exercises[0]!;
    expect(exercise.previous?.sets).toEqual([
      { setNumber: 1, loadKg: 60, reps: 10 },
      { setNumber: 2, loadKg: 60, reps: 8 },
    ]);
    expect(exercise.bestsBefore).toEqual({ maxLoadKg: 60, maxReps: 10, bestEstimated1RmKg: 80 });

    await api()
      .patch(url(`/workout-sessions/${session.id}/sets/${exercise.sets[0]!.id}`))
      .send({ loadKg: 65, reps: 8, completed: true })
      .expect(200);
    const res = await api().post(url(`/workout-sessions/${session.id}/finish`)).send({}).expect(200);
    const result = res.body as FinishSessionResult;
    expect(result.records).toEqual([
      expect.objectContaining({ type: 'load', value: 65, previous: 60, exerciseId: bench.id }),
    ]);
    expect(result.xpGained).toBe(5 + 50 + 25);
    expect(result.newAchievements.map((a) => a.id)).toContain('first_record');
  });

  it('computes exercise statistics', async () => {
    const res = await api().get(url(`/statistics/exercises/${bench.id}?range=all`)).expect(200);
    const stats = res.body as ExerciseStatistics;
    expect(stats.points).toHaveLength(2);
    expect(stats.maxLoad?.value).toBe(65);
    expect(stats.maxReps?.value).toBe(10);
    expect(stats.bestEstimated1Rm?.value).toBe(82.3); // 65 × (1 + 8/30)
    expect(stats.progressPercent).toBe(8.3);
    expect(stats.recordHistory).toHaveLength(1);
  });

  it('reports gamification progress and dashboard', async () => {
    const progress = (await api().get(url('/gamification/progress')).expect(200)).body as GamificationProgress;
    expect(progress.totalXp).toBe(60 + 80);
    expect(progress.streak.trainedDays).toBe(1);
    const dashboard = await api().get(url('/statistics/dashboard')).expect(200);
    expect(dashboard.body.totalWorkouts).toBe(2);
    expect(dashboard.body.recentSessions).toHaveLength(2);
  });

  it('keeps session snapshots when the plan changes', async () => {
    await api()
      .put(url(`/workout-plans/${plan.id}`))
      .send({
        name: 'A — Renomeada',
        description: '',
        color: '#247A4B',
        exercises: [{ exerciseId: bench.id, sets: 5, repMin: 3, repMax: 5, restSeconds: 180, notes: '' }],
      })
      .expect(200);
    const session = (await api().get(url(`/workout-sessions/${firstSessionId}`)).expect(200))
      .body as WorkoutSession;
    expect(session.plan.name).toBe('A — Peito');
    expect(session.exercises[0]!.snapshot).toMatchObject({ plannedSets: 3, repMin: 8, repMax: 12 });
  });

  it('archives a used custom exercise instead of deleting it', async () => {
    const created = await api()
      .post(url('/exercises'))
      .send({
        name: 'Supino no smith',
        primaryMuscle: 'chest',
        secondaryMuscles: ['triceps'],
        equipment: 'machine',
        type: 'weighted',
        description: '',
        instructions: '',
        mediaUrl: null,
      })
      .expect(201);
    const custom = created.body as Exercise;
    const start = await api().post(url('/workout-sessions/start')).send({ planId: plan.id }).expect(201);
    await api()
      .post(url(`/workout-sessions/${start.body.id}/exercises`))
      .send({ exerciseId: custom.id })
      .expect(201);

    await api().delete(url(`/exercises/${custom.id}`)).expect(204);
    const list = (await api().get(url('/exercises')).expect(200)).body as Exercise[];
    expect(list.some((e) => e.id === custom.id)).toBe(false);
    const archived = await api().get(url(`/exercises/${custom.id}`)).expect(200);
    expect(archived.body.archived).toBe(true);

    // Cancelar a sessão em andamento (D8).
    await api().delete(url(`/workout-sessions/${start.body.id}`)).expect(204);
    const active = (await api().get(url('/workout-sessions/active')).expect(200)).body as ActiveSessionResponse;
    expect(active.session).toBeNull();
  });
});
