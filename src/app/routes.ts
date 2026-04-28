import { createBrowserRouter } from 'react-router';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { ManageBase } from './components/ManageBase';
import { ManageDesign } from './components/ManageDesign';
import { GeneratingPost } from './components/GeneratingPost';
import { PickIdea } from './components/PickIdea';
import { GeneratingProgress } from './components/GeneratingProgress';
import { ReviewPost } from './components/ReviewPost';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Login,
  },
  {
    Component: ProtectedRoute,
    children: [
      {
        path: '/dashboard',
        Component: Dashboard,
      },
      {
        path: '/manage-base',
        Component: ManageBase,
      },
      {
        path: '/manage-design',
        Component: ManageDesign,
      },
      {
        path: '/generating',
        Component: GeneratingPost,
      },
      {
        path: '/pick-idea',
        Component: PickIdea,
      },
      {
        path: '/generating-progress',
        Component: GeneratingProgress,
      },
      {
        path: '/review',
        Component: ReviewPost,
      },
    ],
  },
]);
