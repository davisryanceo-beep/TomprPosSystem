
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = (props) => {
  const {
    children,
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    ...domProps
  } = props;

  const baseStyles = "font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-charcoal-900 transition-all duration-200 ease-in-out inline-flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transform";

  const variantStyles = {
    primary: 'bg-emerald hover:bg-emerald-dark text-white focus:ring-emerald',
    secondary: 'bg-charcoal-dark hover:bg-charcoal-900 text-cream-light focus:ring-charcoal-light',
    danger: 'bg-terracotta hover:bg-terracotta-dark text-white focus:ring-terracotta',
    ghost: 'bg-cream-light/50 dark:bg-charcoal-dark/50 hover:bg-cream dark:hover:bg-charcoal-dark text-charcoal-light dark:text-cream-light focus:ring-charcoal-light border border-charcoal/20 dark:border-charcoal-light/20 shadow-sm',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthClass} ${className}`}
      {...domProps}
    >
      {leftIcon && <span className="mr-2 flex items-center">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2 flex items-center">{rightIcon}</span>}
    </button>
  );
};

export default Button;