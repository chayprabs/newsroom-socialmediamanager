import { Suspense } from 'react';
import { GeneratingPost } from '../components/GeneratingPost';

export default function GeneratingPage() {
  return (
    <Suspense fallback={null}>
      <GeneratingPost />
    </Suspense>
  );
}
