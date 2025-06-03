import React from 'react';
import { Route } from 'wouter';

export function UnrestrictedAuthRoute({ path, component: Component }: { path: string; component: React.ComponentType<any> }) {
  return (
    <Route path={path} component={Component} />
  );
}