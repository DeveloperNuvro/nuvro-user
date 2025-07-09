import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DailyData {
    date: string;
    score: number;
    conversationsAnalyzed: number;
}

interface PerformanceChartProps {
    data: DailyData[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
    // Format date for display on the X-axis
    const formatXAxis = (tickItem: string) => {
        const date = new Date(tickItem);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart
                data={data}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxis}
                    stroke="rgba(255, 255, 255, 0.4)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis 
                    stroke="rgba(255, 255, 255, 0.4)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 10]} // Score is 0-10
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#1B1B20', // Matches your dark card background
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem'
                    }}
                    labelStyle={{ color: '#FFFFFF' }}
                />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
                <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8b5cf6" // A nice violet color
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#8b5cf6' }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default PerformanceChart;