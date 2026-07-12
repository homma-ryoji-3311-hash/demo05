import { Card, CardContent, CardHeader, CardTitle } from '@/common/components/ui/card';
import { useGreeting } from '../api/useGreeting';

export function GreetingCard() {
  const { data, isLoading, isError } = useGreeting();

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Greeting</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p>読み込み中...</p>}
        {isError && (
          <p role="alert" className="text-red-600">
            取得に失敗しました
          </p>
        )}
        {data && <p>{data.message}</p>}
      </CardContent>
    </Card>
  );
}
