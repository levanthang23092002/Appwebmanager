import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { taskNavItems } from '../../lib/taskScope';

interface TasksNavGroupProps {
  onClose: () => void;
}

export function TasksNavGroup({ onClose }: TasksNavGroupProps) {
  const { user, canAccess } = useAuth();
  const location = useLocation();
  const onTasks = location.pathname.startsWith('/tasks');
  const [open, setOpen] = useState(onTasks);

  if (!user || !canAccess('/tasks')) return null;

  const items = taskNavItems(user.role);

  return (
    <div className={`menu-item${open || onTasks ? ' open' : ''}`}>
      <button
        type="button"
        className="submenu-toggle menu-item-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open || onTasks}
      >
        <span className="menu-item-link-inner">
          <i className="bx bx-task" />
          <span>Công việc</span>
        </span>
        <i className="bx bx-chevron-down arrow" />
      </button>
      <ul className="submenu">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
