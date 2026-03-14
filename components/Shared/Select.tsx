
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

const Select: React.FC<SelectProps> = ({ label, id, error, options, className = '', ...props }) => {
  const baseSelectClasses = "mt-1 block w-full pl-4 pr-10 py-3 text-base border-charcoal/20 dark:border-charcoal-light/20 focus:outline-none focus:ring-2 focus:ring-emerald focus:border-emerald rounded-lg bg-cream dark:bg-charcoal-dark text-charcoal dark:text-cream-light transition-colors duration-200 ease-in-out";
  const errorSelectClasses = "border-terracotta focus:ring-terracotta focus:border-terracotta";
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-charcoal dark:text-cream-light">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`${baseSelectClasses} ${error ? errorSelectClasses : ''} ${className}`}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-terracotta">{error}</p>}
    </div>
  );
};

export default Select;