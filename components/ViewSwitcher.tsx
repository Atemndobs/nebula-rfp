
import React from 'react';
import { AppView, ViewSwitcherProps } from '../types'; // Updated to import AppView from types.ts

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
  </svg>
);

const TableIcon = () => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375V4.625A1.125 1.125 0 017.125 3.5H10.5m0 0h3m0 0h3.375c.621 0 1.125.504 1.125 1.125V18.375c0 .621-.504 1.125-1.125 1.125h-1.5m-17.25 0h17.25M4.5 8.25h15M4.5 12h15M4.5 15.75h15" />
</svg>
);

const CogIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.333.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);


const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onSwitchView }) => {
  const views: { name: AppView; label: string; icon: JSX.Element, title: string }[] = [
    { name: 'home', label: 'Home', icon: <HomeIcon />, title: 'Switch to Home View (Processed RFPs)' },
    { name: 'rawData', label: 'Data', icon: <TableIcon />, title: 'Switch to Raw API Data View' },
    { name: 'admin', label: 'Admin', icon: <CogIcon />, title: 'Switch to Admin/Settings View'},
  ];

  return (
    <div className="flex p-0.5 bg-accents-1 dark:bg-dark-accents-1 border border-accents-2 dark:border-dark-accents-2 rounded-md shadow-vercel-sm">
      {views.map((view) => {
        const isActive = currentView === view.name;
        return (
          <button
            key={view.name}
            onClick={() => onSwitchView(view.name)}
            aria-pressed={isActive}
            title={view.title}
            className={`px-2.5 py-1.5 rounded-sm text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 ${
              isActive
                ? 'bg-white dark:bg-dark-accents-2 text-geist-foreground dark:text-dark-geist-foreground shadow-sm'
                : 'text-accents-5 dark:text-accents-4 hover:bg-accents-2 dark:hover:bg-dark-accents-2'
            }`}
          >
            {view.icon}
            <span className="hidden sm:inline">{view.label}</span>
            <span className="sr-only">{view.label} View</span>
          </button>
        );
      })}
    </div>
  );
};

export default ViewSwitcher;
