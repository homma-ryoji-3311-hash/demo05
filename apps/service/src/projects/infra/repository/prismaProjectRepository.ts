import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import type { ProjectEntity } from '../../domain/model/project.js';
import type { ProjectRepositoryInterface } from '../../domain/interface/projectRepository.js';
import { ProjectPersistenceUnavailableError } from '../../domain/model/project.js';

/**
 * 本番の Prisma 実装（slice-11 スコープ）。
 * schema.prisma への PROJECTS/REPORT_PROJECTS/INCIDENTS モデル追加とマイグレーションの実行は
 * 統合役（CLAUDE.md §1-2・層境ゲート）。本スライスではスキーマ変更・マイグレーションが禁止のため未配線。
 * ローカル/CI の緑検証は InMemoryProjectRepository（PERSISTENCE=memory）で行う。
 */
export class PrismaProjectRepository implements ProjectRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndKey(_userId: string, _projectKey: string): Promise<ProjectEntity | null> {
    void this.prisma;
    throw new ProjectPersistenceUnavailableError('findByUserAndKey');
  }

  async save(_project: ProjectEntity): Promise<void> {
    void this.prisma;
    throw new ProjectPersistenceUnavailableError('save');
  }
}
