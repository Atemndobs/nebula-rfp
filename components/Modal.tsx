
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-geist-background dark:bg-dark-accents-1 rounded-lg shadow-vercel-lg w-full max-w-2xl max-h-[90vh] flex flex-col border border-accents-2 dark:border-dark-accents-2"
        onClick={e => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        <div className="flex justify-between items-center p-5 border-b border-accents-2 dark:border-dark-accents-2">
          <h2 id="modal-title" className="text-lg font-semibold text-geist-foreground dark:text-dark-geist-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="text-accents-5 dark:text-accents-4 hover:text-geist-foreground dark:hover:text-dark-geist-foreground transition-colors rounded-full p-1 -m-1"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;