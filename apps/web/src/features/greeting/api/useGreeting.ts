import { useGetGreeting } from '@/common/api/generated/greeting/greeting';

/** greeting フィーチャーの公開データフック。生成 hook をラップする。 */
export function useGreeting() {
  return useGetGreeting();
}
