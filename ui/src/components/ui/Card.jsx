import React from 'react';

export default function Card({ children, interactive = false, className = '', ...rest }) {
  return (
    <div
      className={`bg-white border border-[#ECECEC] rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        interactive
          ? 'hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] cursor-pointer transition-shadow'
          : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
