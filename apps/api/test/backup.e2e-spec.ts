import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

// Roda depois do fluxo principal (fileParallelism: false), sobre o mesmo banco de teste.

const binary = (res: request.Response, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('Backup e restauração (e2e)', () => {
  let app: INestApplication<App>;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('downloads a backup, then restores it discarding later changes', async () => {
    const backup = await api().get('/api/v1/backup').buffer(true).parse(binary).expect(200);
    const file = backup.body as Buffer;
    expect(backup.headers['content-disposition']).toMatch(/attachment; filename="lifty-.*\.db"/);
    expect(file.subarray(0, 15).toString('latin1')).toBe('SQLite format 3');

    const plansBefore = (await api().get('/api/v1/workout-plans').expect(200)).body.length as number;
    const exerciseId = (await api().get('/api/v1/exercises').expect(200)).body[0].id as number;
    await api()
      .post('/api/v1/workout-plans')
      .send({
        name: 'Criada depois do backup',
        description: '',
        color: '#55D68A',
        exercises: [{ exerciseId, sets: 3, repMin: 8, repMax: 12, restSeconds: 90, notes: '' }],
      })
      .expect(201);

    const restored = await api()
      .post('/api/v1/backup/restore')
      .attach('file', file, 'lifty.db')
      .expect(200);
    expect(restored.body.safetyBackup).toMatch(/pre-restore-.*\.db$/);

    // A API segue funcionando após trocar o arquivo, com os dados do backup.
    const plansAfter = (await api().get('/api/v1/workout-plans').expect(200)).body.length as number;
    expect(plansAfter).toBe(plansBefore);
  });

  it('rejects files that are not SQLite backups', async () => {
    await api()
      .post('/api/v1/backup/restore')
      .attach('file', Buffer.from('não é um banco'), 'x.db')
      .expect(400);
  });
});
