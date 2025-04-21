import React from 'react';

const defaultResponses = ['Pricing Plans', 'Need Help?', 'How does this work?'];

const DefaultResponseTemplete: React.FC = () => {
  return (
    <div className="flex w-[350px] gap-2 px-2 py-2  overflow-x-auto scrollbar-hide">
      {defaultResponses.map((label, index) => (
        <button
          key={index}
          className="bg-gray-100 dark:bg-[#270A62] dark:text-[#FFFFFF]  cursor-pointer text-gray-500 text-sm px-4 py-2 rounded-xl whitespace-nowrap hover:bg-gray-200 transition"
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default DefaultResponseTemplete;
