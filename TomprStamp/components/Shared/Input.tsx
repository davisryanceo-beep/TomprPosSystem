
import React, { useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useKeyboard } from '../../contexts/KeyboardContext';
import { ROLES } from '../../constants';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({ label, id, error, leftIcon, rightIcon, helperText, className = '', type = "text", ...props }) => {
  const { currentUser } = useAuth();
  const { showKeyboard } = useKeyboard();
  const inputRef = useRef<HTMLInputElement>(null);

  const isTouchRole = currentUser && [ROLES.CASHIER, ROLES.BARISTA, ROLES.STOCK_MANAGER].includes(currentUser.role);

  const handleFocus = () => {
    if (isTouchRole && inputRef.current) {
      showKeyboard(inputRef.current);
    }
  };

  const baseInputClasses = "mt-1 block w-full px-4 py-3 bg-cream dark:bg-charcoal-dark border border-charcoal/20 dark:border-charcoal-light/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald focus:border-emerald sm:text-base text-charcoal dark:text-cream-light transition-colors duration-200 ease-in-out placeholder-charcoal-light/50";
  const errorInputClasses = "border-terracotta focus:ring-terracotta focus:border-terracotta";

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-charcoal dark:text-cream-light">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-charcoal-light">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          ref={inputRef}
          type={type}
          className={`${baseInputClasses} ${error ? errorInputClasses : ''} ${leftIcon ? 'pl-10' : ''} ${rightIcon || type === 'password' ? 'pr-10' : ''} ${className}`}
          onFocus={handleFocus}
          readOnly={isTouchRole}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-charcoal-light">
            {rightIcon}
          </div>
        )}
        {type === "password" && props.onClick && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center text-charcoal-light">
            <button type="button" onClick={props.onClick as React.MouseEventHandler<HTMLButtonElement>} className="hover:text-charcoal transition-colors">
              {rightIcon || <span className="text-xs font-bold uppercase">View</span>}
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-terracotta">{error}</p>}
      {!error && helperText && <p className="mt-1 text-[10px] text-charcoal-light italic">{helperText}</p>}
    </div>
  );
};

export default Input;