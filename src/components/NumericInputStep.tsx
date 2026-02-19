import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type NumericInputStepProps = {
  chartData: number[];
  expected: number;
  tolerance: number;
  onComplete: (impact: unknown) => void;
};

const NumericInputStep: React.FC<NumericInputStepProps> = ({ chartData, onComplete }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      setError('Please enter a number.');
      return;
    }
    if (num < 0) {
      setError('Value can\'t be negative.');
      return;
    }
    setError('');
    onComplete({ userValue: num });
  };

  const data = {
    labels: chartData.map((_, i) => `#${i + 1}`),
    datasets: [{
      label: 'Value',
      data: chartData,
      backgroundColor: 'rgba(255, 102, 0, 0.6)',
      borderColor: '#FF6600',
      borderWidth: 1,
    }],
  };

  const barOptions = {
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 14 } },
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#94a3b8', font: { size: 14 } },
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
      },
    },
    plugins: {
      legend: {
        labels: { color: '#e2e8f0', font: { size: 14 } },
      },
      title: { display: false },
      tooltip: {
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        backgroundColor: '#1e293b',
      },
    },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="max-w-2xl mx-auto bg-[#1e293b] rounded-lg p-3">
        <Bar data={data} options={barOptions} />
      </div>
      <input
        type="number"
        onFocus={(e) =>
          e.target.addEventListener(
            "wheel",
            function (e) { e.preventDefault() },
            { passive: false }
          )
        }
        value={value}
        onChange={e => { setValue(e.target.value); setError(''); }}
        placeholder="Your prediction"
        className="
          border border-[#334155]
          bg-[#1e293b]
          text-[#e2e8f0]
          placeholder:text-[#94a3b8]
          p-2 rounded-lg
          w-3/5 my-2 mx-auto text-center
          focus:outline-none focus:ring-2 focus:ring-[#FF6600]
        "
      />
      {error && <p className="text-red-400 text-center">{error}</p>}
      <button
        onClick={handleSubmit}
        className="
          mt-10 px-4 py-2
          bg-[#FF6600] hover:bg-[#e65a00]
          hover:cursor-pointer rounded-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          border-2 border-[#FF6600]
          text-white font-semibold
          tracking-wider uppercase
          transition duration-200 text-xl
        "
        disabled={!value}
      >
        Submit
      </button>
    </div>
  );
};

export default NumericInputStep;
