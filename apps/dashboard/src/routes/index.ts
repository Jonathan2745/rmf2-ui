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
    path: 'system/network',
    lazy: async () => {
      const { Network } = await import('@/pages/dashboard/system/network');
      return { Component: Network };
    },
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
