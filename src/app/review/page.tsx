import { Suspense } from 'react';
import { ReviewPost } from '../components/ReviewPost';

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewPost />
    </Suspense>
  );
}
