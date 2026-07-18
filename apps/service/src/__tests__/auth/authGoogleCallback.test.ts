import { describe, expect, it } from 'vitest';
import { AuthGoogleCallbackUseCase } from '../../auth/use-case/authGoogleCallback.js';
import { GetMeUseCase } from '../../auth/use-case/getMe.js';
import { InMemoryUserRepository, seedUsers } from '../../auth/infra/repository/inMemoryUserRepository.js';
import { DomainNotAllowedError } from '../../auth/domain/error/authErrors.js';

function seededRepo(): InMemoryUserRepository {
  const repo = new InMemoryUserRepository();
  seedUsers(repo);
  return repo;
}

describe('AuthGoogleCallbackUseCase', () => {
  it('許可ドメインの未登録アカウントは upsert され role=staff とセッションを得る（AC-1）', async () => {
    const repo = new InMemoryUserRepository();
    const { user, session } = await new AuthGoogleCallbackUseCase(repo).execute({ email: 'staffA@example.test' });

    expect(user.id).toBe('staffa'); // email 小文字化 → ローカル部
    expect(user.email).toBe('staffa@example.test');
    expect(user.role).toBe('staff');
    expect(session.length).toBeGreaterThan(0);
    expect(await repo.findById('staffa')).not.toBeNull(); // insert 分岐を実際に通す
  });

  it('許可外ドメインは DomainNotAllowedError（→403）でセッションを発行しない（AC-2）', async () => {
    const repo = new InMemoryUserRepository();
    await expect(new AuthGoogleCallbackUseCase(repo).execute({ email: 'outsider@other.test' })).rejects.toBeInstanceOf(
      DomainNotAllowedError,
    );
    expect(await repo.findById('outsider')).toBeNull(); // 拒否時は upsert しない
  });

  it('空 email も拒否する（403）', async () => {
    const repo = new InMemoryUserRepository();
    await expect(new AuthGoogleCallbackUseCase(repo).execute({ email: '' })).rejects.toBeInstanceOf(
      DomainNotAllowedError,
    );
  });

  it('既存ユーザーの属性は upsert で上書きしない', async () => {
    const repo = seededRepo();
    const { user } = await new AuthGoogleCallbackUseCase(repo).execute({ email: 'staff01@example.test' });
    expect(user.name).toBe('テスト太郎'); // seed の name を保持
  });
});

describe('GetMeUseCase', () => {
  it('既知ユーザーの id/role/name を返す', async () => {
    const me = await new GetMeUseCase(seededRepo()).execute({ userId: 'staff01' });
    expect(me).toMatchObject({ id: 'staff01', role: 'staff', name: 'テスト太郎' });
  });
});
