// MCQQuestion.jsx - Updated with consistent timer and styling
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Volume2,
  Play,
  CheckCircle,
  AlertTriangle,
  Headphones,
} from "lucide-react";
import { useTimer } from "../contexts/TimerContext";

const MCQQuestion = ({ question, onSubmit, disabled }) => {
  const [selectedAnswer, setSelectedAnswer] = useState("");

  // Use global timer
  const { phase, timeLeft, formatTime, startTimer, stopTimer, skipThinking } =
    useTimer();

  // Create a stable reference to get current selected value
  const getCurrentSelection = useCallback(() => {
    return selectedAnswer;
  }, [selectedAnswer]);

  // Handle auto-submit function
  const handleAutoSubmit = useCallback(() => {
    const currentSelection = getCurrentSelection();
    console.log(
      "Auto-submitting MinimalPair - Time expired. Selected:",
      currentSelection
    );
    onSubmit(currentSelection || "");
  }, [getCurrentSelection, onSubmit]);

  // Add a ref to track if timer is already started
  const timerStartedRef = useRef(false);

  useEffect(() => {
    // Only start timer once per question
    if (timerStartedRef.current) return;

    const totalTime = question.timing?.total_estimated_sec || 30;

    startTimer({
      responseTime: totalTime,
      onTimeExpired: handleAutoSubmit,
    });

    timerStartedRef.current = true;

    return () => {
      timerStartedRef.current = false;
      stopTimer();
    };
  }, [question.q_id]); // Only depend on question ID

  const getInstructions = (timeLeft) => {
    if (timeLeft <= 10) {
      return {
        title: "Time Almost Up!",
        instruction:
          "Your answer will be automatically submitted when time expires.",
        color: "red",
        icon: AlertTriangle,
        urgent: true,
      };
    }

    return {
      title: "Choose Your Answer",
      instruction: "Read the question carefully and select the best answer.",
      color: "blue",
      icon: CheckCircle,
      urgent: false,
    };
  };

  const handleOptionChange = (value) => {
    if (!disabled) {
      setSelectedAnswer(value);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer && !disabled) {
      stopTimer(); // Stop the global timer
      onSubmit(selectedAnswer);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-3 border border-gray-200/50">
      <div className="space-y-2">
        {/* Instruction Panel */}
        <div
          className={`rounded-xl border-2 p-4 mb-4 ${
            getInstructions(timeLeft).urgent
              ? "bg-red-50 border-red-200 text-red-800 animate-pulse"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {React.createElement(getInstructions(timeLeft).icon, {
                className: "w-6 h-6",
              })}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">
                {getInstructions(timeLeft).title}
              </h3>
              <p className="text-base">
                {getInstructions(timeLeft).instruction}
              </p>
            </div>
          </div>
        </div>

        {/* Options - 2x2 Grid with smaller boxes */}
        <div className="grid grid-cols-2 gap-3">
          {question.options?.map((option, index) => {
            // Different gradient colors for each option
            const gradients = [
              "border-[#967AFE] bg-gradient-to-br from-[#967AFE]/10 to-[#9AD0F0]/10", // Purple to Blue
              "border-[#FFAF54] bg-gradient-to-br from-[#FFAF54]/10 to-[#FF82AC]/10", // Orange to Pink
              "border-[#48D19C] bg-gradient-to-br from-[#48D19C]/10 to-[#9AD0F0]/10", // Green to Blue
              "border-[#FF82AC] bg-gradient-to-br from-[#FF82AC]/10 to-[#FFAF54]/10", // Pink to Orange
            ];

            const selectedGradient = gradients[index % gradients.length];

            return (
              <label
                key={index}
                className={`
          flex items-center justify-center space-x-2 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 text-center min-h-[80px]
          ${
            selectedAnswer === option
              ? selectedGradient + " shadow-md transform scale-[1.02]"
              : "border-gray-200 hover:border-[#967AFE]/50 hover:bg-gray-50 bg-white/80 backdrop-blur-sm"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
              >
                <input
                  type="radio"
                  name={`mcq-${question.q_id}`}
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={(e) => handleOptionChange(e.target.value)}
                  disabled={disabled}
                  className="w-4 h-4 text-[#967AFE] border-gray-300 focus:ring-[#967AFE]/50"
                />
                <span className="flex-1 text-gray-900 font-medium text-sm leading-tight">
                  {option}
                </span>
                {selectedAnswer === option && (
                  <CheckCircle className="w-4 h-4 text-[#967AFE] flex-shrink-0" />
                )}
              </label>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleSubmit}
            disabled={disabled || !selectedAnswer}
            className={`
      px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2
      ${
        disabled || !selectedAnswer
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-gradient-to-r from-[#967AFE] to-[#9AD0F0] text-white hover:from-[#8B6FF7] hover:to-[#87C5EC]"
      }
    `}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Submit Answer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MCQQuestion;
