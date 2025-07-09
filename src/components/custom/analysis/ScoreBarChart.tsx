import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ConversationFeedback } from '@/features/analysisReport/analysisReportSlice';

interface ScoreBarChartProps {
  data: ConversationFeedback[];
}

// Function to get a color based on the score
const getColor = (score: number) => {
  if (score >= 8) return '#22c55e'; // Green 500
  if (score >= 5) return '#f59e0b'; // Amber 500
  return '#ef4444'; // Red 500
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-bold text-gray-800 dark:text-gray-200">{`Customer: ${label}`}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">{`Score: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};


const ScoreBarChart: React.FC<ScoreBarChartProps> = ({ data }) => {
  const chartData = data.map(conv => ({
    name: conv.customerName, // Use customer name for the X-axis label
    score: conv.overallScore,
  }));

  return (
    <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(230, 230, 230, 0.2)' }}/>
                <Bar dataKey="score">
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default ScoreBarChart;