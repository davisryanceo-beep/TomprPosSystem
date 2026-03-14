
import React, { useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useKeyboard } from '../../contexts/KeyboardContext';
import { ROLES } from '../../constants';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, error, className = '', ...props }) => {
  const { currentUser } = useAuth();
  const { showKeyboard } = useKeyboard();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isTouchRole = currentUser && [ROLES.CASHIER, ROLES.BARISTA, ROLES.STOCK_MANAGER].includes(currentUser.role);
  
  const handleFocus = () => {
    if (isTouchRole && textareaRef.current) {
        showKeyboard(textareaRef.current);
    }
  };

  const baseTextareaClasses = "mt-1 block w-full px-4 py-3 bg-cream dark:bg-charcoal-dark border border-charcoal/20 dark:border-charcoal-light/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald focus:border-emerald sm:text-base text-charcoal dark:text-cream-light transition-colors duration-200 ease-in-out placeholder-charcoal-light/50";
  const errorTextareaClasses = "border-terracotta focus:ring-terracotta focus:border-terracotta";

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-charcoal dark:text-cream-light">
          {label}
        </label>
      )}
      <textarea
        id={id}
        ref={textareaRef}
        className={`${baseTextareaClasses} ${error ? errorTextareaClasses : ''} ${className}`}
        onFocus={handleFocus}
        readOnly={isTouchRole}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-terracotta">{error}</p>}
    </div>
  );
};

export default Textarea;