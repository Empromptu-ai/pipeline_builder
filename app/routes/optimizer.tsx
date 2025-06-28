import React from 'react';
import { Outlet } from '@remix-run/react';
import { AppLayout } from '~/components/layout/AppLayout';
import { OptimizerLayout } from '~/components/layout/OptimizerLayout';

export default function OptimizerRoute() {
  return (
    <AppLayout mode="optimizer">
      <OptimizerLayout>
        <Outlet />
      </OptimizerLayout>
    </AppLayout>
  );
}
