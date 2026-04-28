import { Suspense } from 'react';
import { GeneratingProgress } from '../components/GeneratingProgress';

export default function GeneratingProgressPage() {
  return (
    <Suspense fallback={null}>
      <GeneratingProgress />
    </Suspense>
  );
}
