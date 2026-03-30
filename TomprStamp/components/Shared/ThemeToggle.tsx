
import React from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../../contexts/ThemeContext';
import Button from './Button';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="sm"
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      className="!p-3 !rounded-full"
    >
      {theme === 'light' ? <FaMoon size={18} /> : <FaSun size={18} />}
    </Button>
  );
};

export default ThemeToggle;