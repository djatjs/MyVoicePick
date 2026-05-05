import React from 'react';

interface MvpButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'md' | 'lg';
  className?: string;
}

export const MvpButton: React.FC<MvpButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseClass = 'inline-flex items-center justify-center transition-all duration-300';
  
  const variants = {
    primary: 'mvp-btn-primary',
    outline: 'mvp-btn-outline',
    ghost: 'bg-transparent text-[var(--mvp-text-main)] hover:bg-white/5 border-none',
  };

  const sizes = {
    md: 'py-3 px-6 text-base',
    lg: 'py-4 px-10 text-lg',
  };

  return (
    <button
      className={`${baseClass} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
