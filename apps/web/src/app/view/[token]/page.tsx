import { ViewerClient } from '@/components/viewer/viewer-client';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ViewerPage({ params }: Props) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ViewerClient token={token} />
      </div>
    </div>
  );
}
