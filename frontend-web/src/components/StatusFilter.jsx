import React from 'react';

const StatusFilter = ({ options, activeFilter, onFilterChange, counts }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {options.map((option) => {
        const isActive = activeFilter === option;
        const count = counts?.[option] ?? 0;
        
        return (
          <button
            key={option}
            onClick={() => onFilterChange(option)}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap
              ${isActive 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <span>{option}</span>
            {count > 0 && (
              <span 
                className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold transition-colors
                  ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'}
                `}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StatusFilter;
