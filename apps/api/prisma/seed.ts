// Seed idempotente: cria o usuário local (se não existir) e adiciona os
// exercícios do sistema que ainda não existem (comparação por nome).
import { existsSync } from 'node:fs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import type { ExerciseInput } from '@lifty/shared';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { databaseUrl } from '../src/prisma/database-url.js';

if (existsSync('.env')) process.loadEnvFile();

type SeedExercise = Omit<ExerciseInput, 'mediaUrl'>;

const EXERCISES: SeedExercise[] = [
  {
    name: 'Supino reto com barra',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    type: 'weighted',
    description: 'Exercício base para força e massa do peitoral.',
    instructions:
      'Deite no banco com os olhos sob a barra. Escápulas retraídas, pés firmes no chão. Desça a barra controlando até tocar a parte baixa do peito e empurre de volta.',
  },
  {
    name: 'Supino inclinado com halteres',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    type: 'weighted',
    description: 'Ênfase na porção superior do peitoral.',
    instructions:
      'Banco entre 30° e 45°. Desça os halteres ao lado do peito com cotovelos a cerca de 45° do tronco e empurre unindo-os no alto.',
  },
  {
    name: 'Crucifixo',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'dumbbell',
    type: 'weighted',
    description: 'Isolamento do peitoral com amplitude de abertura.',
    instructions:
      'Cotovelos levemente flexionados e fixos. Abra os braços em arco até sentir alongamento no peito e retorne pelo mesmo caminho.',
  },
  {
    name: 'Desenvolvimento militar',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    equipment: 'barbell',
    type: 'weighted',
    description: 'Exercício base para força dos ombros.',
    instructions:
      'Em pé, barra à altura das clavículas, abdômen e glúteos contraídos. Empurre a barra acima da cabeça sem arquear a lombar.',
  },
  {
    name: 'Elevação lateral',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    type: 'weighted',
    description: 'Isolamento da porção lateral do deltoide.',
    instructions:
      'Eleve os halteres lateralmente até a altura dos ombros, cotovelos levemente flexionados. Desça devagar.',
  },
  {
    name: 'Puxada frontal',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: 'cable',
    type: 'weighted',
    description: 'Puxada vertical para largura das costas.',
    instructions:
      'Pegada pronada um pouco mais larga que os ombros. Puxe a barra até a parte alta do peito levando os cotovelos para baixo e retorne controlando.',
  },
  {
    name: 'Barra fixa',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: 'bodyweight',
    type: 'bodyweight',
    description: 'Puxada vertical com o peso do corpo.',
    instructions:
      'Pendure-se com pegada pronada. Puxe até o queixo passar da barra, sem balanço, e desça até estender os braços.',
  },
  {
    name: 'Remada curvada',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'hamstrings'],
    equipment: 'barbell',
    type: 'weighted',
    description: 'Puxada horizontal para espessura das costas.',
    instructions:
      'Tronco inclinado cerca de 45°, coluna neutra. Puxe a barra em direção ao abdômen e desça com controle.',
  },
  {
    name: 'Remada baixa',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: 'cable',
    type: 'weighted',
    description: 'Puxada horizontal sentado na polia.',
    instructions:
      'Tronco ereto, puxe o triângulo até o abdômen aproximando as escápulas. Retorne estendendo os braços sem curvar a coluna.',
  },
  {
    name: 'Agachamento livre',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'barbell',
    type: 'weighted',
    description: 'Exercício base para membros inferiores.',
    instructions:
      'Barra apoiada no trapézio, pés na largura dos ombros. Desça mantendo o tronco firme e os joelhos alinhados aos pés, até pelo menos a coxa paralela ao chão.',
  },
  {
    name: 'Leg press',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes'],
    equipment: 'machine',
    type: 'weighted',
    description: 'Empurrada de pernas guiada pela máquina.',
    instructions:
      'Pés na largura dos ombros na plataforma. Desça até cerca de 90° de flexão de joelhos sem tirar a lombar do encosto e empurre.',
  },
  {
    name: 'Afundo',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes'],
    equipment: 'dumbbell',
    type: 'weighted',
    description: 'Exercício unilateral para pernas e glúteos.',
    instructions:
      'Dê um passo à frente e desça até os dois joelhos formarem cerca de 90°. Empurre com a perna da frente para voltar.',
  },
  {
    name: 'Cadeira extensora',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: [],
    equipment: 'machine',
    type: 'weighted',
    description: 'Isolamento do quadríceps.',
    instructions: 'Estenda os joelhos até quase travar, segure um instante no alto e desça devagar.',
  },
  {
    name: 'Mesa flexora',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['calves'],
    equipment: 'machine',
    type: 'weighted',
    description: 'Isolamento dos posteriores de coxa.',
    instructions:
      'Deitado, quadril apoiado no banco. Flexione os joelhos trazendo o rolo em direção aos glúteos e retorne controlando.',
  },
  {
    name: 'Stiff',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'back'],
    equipment: 'barbell',
    type: 'weighted',
    description: 'Flexão de quadril com ênfase nos posteriores.',
    instructions:
      'Joelhos levemente flexionados e fixos. Desça a barra rente às pernas levando o quadril para trás, coluna neutra, e suba contraindo glúteos.',
  },
  {
    name: 'Elevação pélvica',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings'],
    equipment: 'barbell',
    type: 'weighted',
    description: 'Exercício principal para glúteos.',
    instructions:
      'Costas apoiadas no banco, barra sobre o quadril. Eleve o quadril até alinhar tronco e coxas, contraia os glúteos no alto e desça.',
  },
  {
    name: 'Panturrilha em pé',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    equipment: 'machine',
    type: 'weighted',
    description: 'Isolamento das panturrilhas.',
    instructions:
      'Pontas dos pés na plataforma. Desça os calcanhares até alongar e suba o máximo possível, com pausa no alto.',
  },
  {
    name: 'Rosca direta',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'barbell',
    type: 'weighted',
    description: 'Exercício base para bíceps.',
    instructions:
      'Cotovelos junto ao tronco. Flexione os cotovelos levando a barra até os ombros sem balançar o corpo e desça controlando.',
  },
  {
    name: 'Rosca martelo',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    type: 'weighted',
    description: 'Rosca com pegada neutra; trabalha braquial e antebraço.',
    instructions:
      'Palmas voltadas uma para a outra. Flexione os cotovelos mantendo-os fixos ao lado do corpo.',
  },
  {
    name: 'Tríceps pulley',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'cable',
    type: 'weighted',
    description: 'Extensão de cotovelos na polia alta.',
    instructions:
      'Cotovelos fixos ao lado do tronco. Estenda os braços até o fim e retorne até cerca de 90°.',
  },
  {
    name: 'Tríceps francês',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    type: 'weighted',
    description: 'Extensão de cotovelos acima da cabeça; ênfase na cabeça longa.',
    instructions:
      'Segure o halter com as duas mãos acima da cabeça. Desça atrás da nuca flexionando os cotovelos, que apontam para cima, e estenda.',
  },
  {
    name: 'Abdominal',
    primaryMuscle: 'abs',
    secondaryMuscles: [],
    equipment: 'bodyweight',
    type: 'bodyweight',
    description: 'Flexão de tronco para o reto abdominal.',
    instructions:
      'Deitado, joelhos flexionados. Enrole o tronco aproximando costelas e quadril, sem puxar o pescoço, e desça devagar.',
  },
];

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl() }) });

try {
  const user =
    (await prisma.user.findFirst({ orderBy: { id: 'asc' } })) ??
    (await prisma.user.create({ data: { name: 'Atleta' } }));

  const existing = new Set(
    (await prisma.exercise.findMany({ where: { userId: null }, select: { name: true } })).map(
      (e) => e.name,
    ),
  );
  const missing = EXERCISES.filter((e) => !existing.has(e.name));
  if (missing.length) await prisma.exercise.createMany({ data: missing });

  console.log(`Usuário local: #${user.id} (${user.name}). Exercícios adicionados: ${missing.length}.`);
} finally {
  await prisma.$disconnect();
}
