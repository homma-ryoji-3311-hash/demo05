import type { GetHomeUseCase, HomeView } from '../../../use-case/getHome.js';

/** HTTP ⇔ ユースケースの変換のみ。Express の Request/Response には依存しない。 */
export class HomeController {
  constructor(private readonly getHome: GetHomeUseCase) {}

  async home(userId: string): Promise<{ status: number; body: HomeView }> {
    const view = await this.getHome.execute({ userId });
    return { status: 200, body: view };
  }
}
