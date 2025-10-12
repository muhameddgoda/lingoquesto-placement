// MCQQuestion.jsx - Updated with consistent timer and styling
import React, { useState, useRef, useEffect } from "react";
import { CheckCircle, Loader2, Send, Check } from "lucide-react";
import { useTimer } from "../contexts/TimerContext";
import { BRAND_PURPLE, BUTTON_STYLE } from "../config/theme";

const MCQQuestion = ({ question, onSubmit, disabled }) => {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Use global timer
  const { startTimer, stopTimer } = useTimer();

  // keep latest selection without retriggering effects
  const selectedRef = useRef("");
  useEffect(() => {
    selectedRef.current = selectedAnswer;
  }, [selectedAnswer]);

  // start/stop timer per question (no restarts on option click)
  useEffect(() => {
    const totalTime = question?.timing?.total_estimated_sec || 30;

    startTimer({
      responseTime: totalTime,
      onTimeExpired: () => onSubmit(selectedRef.current || ""),
    });

    return () => {
      stopTimer();
    };
  }, [question?.q_id, startTimer, stopTimer, onSubmit]);

  const handleOptionChange = (value) => {
    if (!disabled) setSelectedAnswer(value);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || disabled || submitting) return;
    setSubmitting(true);
    stopTimer();
    try {
      await onSubmit(selectedAnswer);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 1200);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Main heading */}
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-3">
          {question?.prompt || "Choose the best answer"}
        </h1>

        {/* Question text - displayed prominently below prompt */}
        {question?.metadata?.question && (
          <div className="text-center mb-2">
            <p className="text-xl font-semibold text-gray-800">
              "{question.metadata.question}"
            </p>
          </div>
        )}

        {/* Context/Situation - subtle, helpful info */}
        {(question?.metadata?.context || question?.metadata?.situation) && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 italic">
              {question.metadata.context}
              {question.metadata.context &&
                question.metadata.situation &&
                " • "}
              {question.metadata.situation}
            </p>
          </div>
        )}

        {/* Options with label */}
        <div className="max-w-3xl mx-auto mb-6">
          <label className="mb-3 block text-sm font-semibold text-gray-700 text-center">
            Select your answer
          </label>
          <div className="grid grid-cols-2 gap-4">
            {question?.options?.map((option, index) => (
              <label
                key={index}
                className={[
                  "flex items-center justify-center gap-3 p-6 border-2 rounded-2xl cursor-pointer",
                  "transition-colors duration-200 text-center min-h-[92px] shadow-md",
                  selectedAnswer === option
                    ? "border-[--brand] bg-gradient-to-r from-purple-50 to-purple-100"
                    : "border-gray-200 hover:border-[--brand] hover:bg-gray-50 bg-white",
                  disabled ? "opacity-50 cursor-not-allowed" : "",
                ].join(" ")}
                style={{ ["--brand"]: BRAND_PURPLE }}
              >
                <input
                  type="radio"
                  name={`mcq-${question?.q_id}`}
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={(e) => handleOptionChange(e.target.value)}
                  disabled={disabled}
                  className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="flex-1 text-gray-900 font-medium text-base leading-tight">
                  {option}
                </span>
                {selectedAnswer === option && (
                  <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* No Options Warning */}
        {(!question?.options || question.options.length === 0) && (
          <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
            <p className="text-yellow-800 font-medium">
              No answer options available for this question.
            </p>
          </div>
        )}

        {/* Submit Button - Right aligned */}
        <div className="max-w-3xl mx-auto flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={disabled || !selectedAnswer || submitting}
            className={`${BUTTON_STYLE} ${
              disabled || !selectedAnswer || submitting
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[--brand]"
            }`}
            style={{ ["--brand"]: BRAND_PURPLE }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting…
              </>
            ) : submitted ? (
              <>
                <Check className="w-5 h-5" />
                Submitted
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MCQQuestion;
