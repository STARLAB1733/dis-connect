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

const NumericInputStep: React.FC<NumericInputStepProps> = ({ chartData, expected, tolerance, onComplete }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const num = parseFloat(value);
    if (isNaN(num) || Math.abs(num - expected) > tolerance) {
      setError('Impractical value, please try again.');
      return;
    }
    onComplete({ userValue: num });
  };

  // bar chart colors
  const barFill = 'rgba(255, 255, 255, 0.8)';
  const barBorder = 'rgba(0, 0, 0, 0.8)';

  const data = {
    labels: chartData.map((_, i) => `#${i + 1}`),
    datasets: [{ 
      label: 'Value', 
      data: chartData,
      backgroundColor: barFill,
      borderColor: barBorder,
      borderWidth: 1, 
    }],
  };

  const barOptions = {
    scales: {
      x: {
        ticks: {
          color: 'white',
          font: { size: 14 },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: 'white',
          font: { size: 14 },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: 'white',
          font: { size: 14 },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        titleColor: '#000',
        bodyColor: '#000',
        backgroundColor: 'rgba(255,255,255,0.9)',
      },
    },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="max-w-2xl mx-auto">
        <Bar data={data} options={barOptions}/>
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
        onChange={e => setValue(e.target.value)}
        placeholder="Answer"
        className="
          border border-gray-900
          bg-white
          text-black
          placeholder:text-gray-500
          p-2
          rounded
          w-3/5
          my-2
          mx-auto
          text-center
        "
      />
      {error && <p className="text-red-900 text-center">{error}</p>}
      <button 
        onClick={handleSubmit} 
        className="
          mt-10
          px-4
          py-2
          bg-[#FF6600]
          hover:bg-[#b34400]
          hover:cursor-pointer
          rounded
          disabled:opacity-50
          disabled:cursor-not-allowed
          border
          border-black
          border-2
          text-black
          rounded-lg
          tracking-wider
          uppercase
          transition duration-200
          text-xl
          "
          disabled={!value}
        >
        Submit
      </button>
    </div>
  );
};

export default NumericInputStep;