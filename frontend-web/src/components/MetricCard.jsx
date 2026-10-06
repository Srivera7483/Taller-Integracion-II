import React from 'react';

const MetricCard = ({ title, value, icon: Icon, color }) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const selectedStyle = colorStyles[color] || 'bg-gray-50 text-gray-600';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between transition-all hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${selectedStyle}`}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
    </div>
  );
};

export default MetricCard;
