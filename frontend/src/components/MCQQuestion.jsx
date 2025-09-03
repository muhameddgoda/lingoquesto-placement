// frontend/src/components/MCQQuestion.jsx
import React, { useState, useEffect } from 'react';

const MCQQuestion = ({ question, onSubmit, disabled }) => {
  const [selectedAnswer, setSelectedAnswer] = useState('');

  // Reset selection when question changes
  useEffect(() => {
    setSelectedAnswer('');
  }, [question.q_id]);

  const handleOptionChange = (value) => {
    if (!disabled) {
      setSelectedAnswer(value);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer && !disabled) {
      onSubmit(selectedAnswer);
    }
  };

  return (
    <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
      <div className="space-y-6">
        {/* Options */}
        <div className="space-y-4">
          {question.options?.map((option, index) => (
            <label 
              key={index} 
              className={`flex items-center space-x-4 p-6 border-2 rounded-xl cursor-pointer transition-all transform hover:scale-[1.02] ${
                selectedAnswer === option 
                  ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 shadow-lg' 
                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input 
                type="radio" 
                name={`mcq-${question.q_id}`}
                value={option}
                checked={selectedAnswer === option}
                onChange={(e) => handleOptionChange(e.target.value)}
                disabled={disabled}
                className="w-5 h-5 text-purple-600"
              />
              <span className="flex-1 text-lg font-medium">{option}</span>
            </label>
          ))}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-6">
          <button
            onClick={handleSubmit}
            disabled={disabled || !selectedAnswer}
            className={`px-10 py-4 rounded-xl font-semibold text-lg transition-all transform ${
              disabled || !selectedAnswer
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 hover:scale-105 shadow-lg'
            }`}
          >
            Submit Answer
          </button>
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 mt-4">
            Question ID: {question.q_id} | Selected: {selectedAnswer || 'None'}
          </div>
        )}
      </div>
    </div>
  );
};

export default MCQQuestion;