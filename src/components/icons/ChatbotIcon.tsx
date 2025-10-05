import React from 'react';

interface IconProps {
  className?: string;
}

const ChatbotIcon: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" fill="currentColor" />
    <path d="M7 21c1.333-1 2.666-1 5-1s3.667 0 5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="8.5" cy="9" r="1.1" fill="#fff" />
    <circle cx="15.5" cy="9" r="1.1" fill="#fff" />
    <path d="M9.5 12.2c.7.5 1.8.5 2.5 0" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export default ChatbotIcon;
