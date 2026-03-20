import React, { ReactNode } from 'react';
import { FaTimes } from 'react-icons/fa';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900 bg-opacity-60 backdrop-blur-md p-4 fade-in">
      <div className={`bg-cream-light dark:bg-charcoal-dark rounded-xl shadow-2xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`}>
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-charcoal/10 dark:border-cream-light/10">
          <div className="text-xl font-extrabold text-charcoal-dark dark:text-cream-light">{title}</div>
          <button
            onClick={onClose}
            className="text-charcoal-light hover:text-charcoal dark:text-charcoal-light dark:hover:text-cream-light transition-colors p-1 rounded-full"
            aria-label="Close modal"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <div className="p-5 md:p-6 overflow-y-auto flex-grow">
          {children}
        </div>
        {footer && (
          <div className="flex-shrink-0 p-4 border-t border-charcoal/10 dark:border-cream-light/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;