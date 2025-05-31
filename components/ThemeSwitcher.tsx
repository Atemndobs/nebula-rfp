
import React from 'react';

type Theme = 'light' | 'dark';

interface ThemeSwitcherProps {
  currentTheme: Theme;
  toggleTheme: () => void;
}

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-6.364-.386l1.591-1.591M3 12h2.25m.386-6.364l1.591 1.591" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21c1.33 0 2.597-.266 3.752-.748A9.753 9.753 0 0021.752 15.002z" />
  </svg>
);


const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, toggleTheme }) => {
  const isLight = currentTheme === 'light';
  
  return (
    <div className="flex p-0.5 bg-accents-1 dark:bg-dark-accents-1 border border-accents-2 dark:border-dark-accents-2 rounded-md shadow-vercel-sm">
      <button
        onClick={() => { if(!isLight) toggleTheme()}}
        aria-pressed={isLight}
        title="Switch to Light Theme"
        className={`p-1.5 rounded-sm text-xs transition-all duration-150 ${
          isLight 
            ? 'bg-white dark:bg-dark-accents-2 text-geist-foreground dark:text-dark-geist-foreground shadow-sm' 
            : 'text-accents-5 dark:text-accents-4 hover:bg-accents-2 dark:hover:bg-dark-accents-2'
        }`}
      >
        <SunIcon />
        <span className="sr-only">Light</span>
      </button>
      <button
        onClick={() => { if(isLight) toggleTheme()}}
        aria-pressed={!isLight}
        title="Switch to Dark Theme"
        className={`p-1.5 rounded-sm text-xs transition-all duration-150 ${
          !isLight 
            ? 'bg-black dark:bg-dark-accents-8 text-white dark:text-dark-geist-foreground shadow-sm' 
            : 'text-accents-5 dark:text-accents-4 hover:bg-accents-2 dark:hover:bg-dark-accents-2'
        }`}
      >
        <MoonIcon/>
        <span className="sr-only">Dark</span>
      </button>
    </div>
  );
};

export default ThemeSwitcher;