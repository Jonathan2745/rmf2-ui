import type { RouteObject } from 'react-router';
import { HomeRedirect } from './home-redirect';
import { NotFound } from './not-found';

export const AdminRoutes: RouteObject[] = [
  {
    // Home
    path: 'home',
    lazy: async () => {
      const { Home } = await import('@/pages/dashboard/home');
      return { Component: Home };
    },
  },
  {
<<<<<<< HEAD
    path: 'system/network',
    lazy: async () => {
      const { Network } = await import('@/pages/dashboard/system/network');
      return { Component: Network };
    },
=======
    // System
    path: 'system',
    children: [
      // System Home
      {
        index: true,
        lazy: async () => {
          const { Home } = await import('@/pages/dashboard/home');
          return { Component: Home };
        },
      },
      {
        // Network
        path: 'network',
        lazy: async () => {
          const { Network } = await import('@/pages/dashboard/system/network');
          return { Component: Network };
        },
      },
      {
        // Simulation
        path: 'simulation',
        lazy: async () => {
          const { Simulation } = await import(
            '@/pages/dashboard/system/simulation'
          );
          return { Component: Simulation };
        },
      },
      {
        // Map
        path: 'map',
        lazy: async () => {
          const { Map } = await import('@/pages/dashboard/system/map');
          return { Component: Map };
        },
      },
      {
        // LIF Editor
        path: 'lif-editor',
        lazy: async () => {
          const { LifEditorPage } = await import(
            '@/pages/dashboard/system/lif-editor'
          );
          return { Component: LifEditorPage };
        },
      },
    ],
>>>>>>> 4432559 (feat(map): integrate Three.js for navigation overlay and scene viewer)
  },
  {
    path: 'system/simulation',
    lazy: async () => {
      const { Simulation } = await import(
        '@/pages/dashboard/system/simulation'
      );
      return { Component: Simulation };
    },
  },
  {
    path: 'operation/schedule',
    lazy: async () => {
      const { Schedule } = await import('@/pages/dashboard/operation/schedule');
      return { Component: Schedule };
    },
  },
];

export const dashboardRoutes: RouteObject[] = [
  {
    // Redirect index page to /home
    index: true,
    Component: HomeRedirect,
  },
  {
    lazy: async () => {
      const { AdminLayout } = await import('@/layouts');
      return { Component: AdminLayout };
    },
    children: AdminRoutes,
  },
  {
    path: '*',
    Component: NotFound,
  },
];

export const routes: RouteObject[] = [
  {
    path: '/',
    children: dashboardRoutes,
  },
];

export default routes;
