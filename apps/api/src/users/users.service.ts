import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import {
  ageOn,
  toLocalDate,
  type BodyWeightEntry,
  type BodyWeightInput,
  type Profile,
  type ProfileInput,
  type Sex,
} from '@lifty/shared';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** V1 sem autenticação: o usuário local é o criado pelo seed (sem cache: uma restauração pode trocá-lo). */
  async localUserId(): Promise<number> {
    const user = await this.prisma.user.findFirst({ orderBy: { id: 'asc' }, select: { id: true } });
    if (!user) throw new InternalServerErrorException('Usuário local não encontrado. Rode `pnpm db:seed`.');
    return user.id;
  }

  async getProfile(): Promise<Profile> {
    const id = await this.localUserId();
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const latest = await this.prisma.bodyWeightEntry.findFirst({
      where: { userId: id },
      orderBy: [{ measuredOn: 'desc' }, { id: 'desc' }],
    });
    return {
      id: user.id,
      name: user.name,
      birthDate: user.birthDate,
      age: user.birthDate ? ageOn(user.birthDate, toLocalDate(new Date())) : null,
      sex: user.sex as Sex | null, // gravado apenas via profileSchema
      heightCm: user.heightCm,
      weeklyGoal: user.weeklyGoal,
      currentWeightKg: latest?.weightKg ?? null,
    };
  }

  async updateProfile(input: ProfileInput): Promise<Profile> {
    const id = await this.localUserId();
    await this.prisma.user.update({ where: { id }, data: input });
    return this.getProfile();
  }

  async listBodyWeight(): Promise<BodyWeightEntry[]> {
    const userId = await this.localUserId();
    return this.prisma.bodyWeightEntry.findMany({
      where: { userId },
      orderBy: [{ measuredOn: 'asc' }, { id: 'asc' }],
      select: { id: true, weightKg: true, measuredOn: true },
    });
  }

  async addBodyWeight(input: BodyWeightInput): Promise<BodyWeightEntry> {
    const userId = await this.localUserId();
    return this.prisma.bodyWeightEntry.create({
      data: { ...input, userId },
      select: { id: true, weightKg: true, measuredOn: true },
    });
  }

  async deleteBodyWeight(id: number): Promise<void> {
    const userId = await this.localUserId();
    const { count } = await this.prisma.bodyWeightEntry.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('Registro de peso não encontrado');
  }
}
