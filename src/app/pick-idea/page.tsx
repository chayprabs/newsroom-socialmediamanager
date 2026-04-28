import { Suspense } from 'react';
import { PickIdea } from '../components/PickIdea';

export default function PickIdeaPage() {
  return (
    <Suspense fallback={null}>
      <PickIdea />
    </Suspense>
  );
}
