import React from 'react';
import { Alert } from '../../../types/api';

export default function AlertDetailsDrawer({ alert }: { alert?: Alert }) {
  if (!alert) return null;
  return (
    <aside style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 360, background: '#fff', boxShadow: '-2px 0 8px rgba(0,0,0,0.08)', padding: 12 }}>
      <h3>{alert.type}</h3>
      <div>{alert.message}</div>
      <div>Severity: {alert.severity}</div>
      <div>{typeof alert.details === 'string' ? alert.details : JSON.stringify(alert.details)}</div>
    </aside>
  );
}
