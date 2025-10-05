// ListenMCQQuestion.jsx - Complete version with consistent styling
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Volume2,
  Play,
  CheckCircle,
  AlertTriangle,
  Headphones,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";
import { useTimer } from "../contexts/TimerContext";

const ListenMCQQuestion = ({ question, onSubmit, disabled }) => {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef(null);
  const MAX_PLAYS = 3;

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

  const getInstructions = (timeLeft, playCount, maxPlays, hasAudio) => {
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

    if (hasAudio && playCount === 0) {
      return {
        title: "Listen and Choose",
        instruction:
          "Play the audio and select the correct answer. You have 3 plays maximum.",
        color: "blue",
        icon: Headphones,
        urgent: false,
      };
    }

    return {
      title: "Choose Your Answer",
      instruction: hasAudio
        ? `Listen carefully and select the best answer. ${
            maxPlays - playCount
          } play${maxPlays - playCount !== 1 ? "s" : ""} remaining.`
        : "Read the question and select the best answer.",
      color: "blue",
      icon: CheckCircle,
      urgent: false,
    };
  };

  const handleAudioPlay = async () => {
    if (
      !audioRef.current ||
      isLoading ||
      isPlaying ||
      playCount >= MAX_PLAYS ||
      audioError
    )
      return;

    setIsLoading(true);
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setPlayCount((prev) => prev + 1);
    } catch (error) {
      console.error("Audio play error:", error);
      setAudioError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleAudioPlayStart = () => {
    setIsPlaying(true);
    setIsLoading(false);
    setAudioError(false);
  };

  const handleAudioError = (e) => {
    console.error("Audio failed to load:", audioUrl);
    setAudioError(true);
    setIsLoading(false);
    setIsPlaying(false);
  };

  const handleOptionChange = (value) => {
    if (!disabled) {
      setSelectedAnswer(value);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer && !disabled) {
      stopTimer(); // Stop the timer
      onSubmit(selectedAnswer);
    }
  };

  const remainingPlays = MAX_PLAYS - playCount;
  const canPlay = remainingPlays > 0 && !disabled && !isPlaying && !audioError;

  // Get audio URL
  const audioFileName = question.metadata?.audioRef || question.audio_ref;
  const cleanAudioFileName = audioFileName?.startsWith("audio/")
    ? audioFileName.substring(6)
    : audioFileName;
  const audioUrl = cleanAudioFileName
    ? `${API_BASE_URL}/api/audio/${cleanAudioFileName}`
    : null;

  return (
    <div className="space-y-4">
      {/* Instruction Panel */}
      <div
        className={`rounded-xl border-2 p-4 mb-4 ${
          getInstructions(timeLeft, playCount, MAX_PLAYS, !!audioUrl).urgent
            ? "bg-red-50 border-red-200 text-red-800 animate-pulse"
            : "bg-blue-50 border-blue-200 text-blue-800"
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            {React.createElement(
              getInstructions(timeLeft, playCount, MAX_PLAYS, !!audioUrl).icon,
              { className: "w-6 h-6" }
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">
              {
                getInstructions(timeLeft, playCount, MAX_PLAYS, !!audioUrl)
                  .title
              }
            </h3>
            <p className="text-base">
              {
                getInstructions(timeLeft, playCount, MAX_PLAYS, !!audioUrl)
                  .instruction
              }
            </p>
          </div>
        </div>
      </div>
      {/* Audio Player Section with Timer */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-3 border border-gray-200/50 mb-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#967AFE] to-[#9AD0F0] rounded-lg flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-md font-semibold text-gray-800">
                Listen Carefully
              </h3>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="bg-gray-50 rounded-lg px-3 py-1 border border-gray-200">
              <span className="text-xs font-medium text-gray-600">
                {audioError
                  ? "Audio unavailable"
                  : `${remainingPlays} play${
                      remainingPlays !== 1 ? "s" : ""
                    } remaining`}
              </span>
            </div>
          </div>

          {/* Audio Element */}
          <audio
            ref={audioRef}
            onPlay={handleAudioPlayStart}
            onPause={() => setIsPlaying(false)}
            onEnded={handleAudioEnded}
            onError={handleAudioError}
            preload="auto"
            style={{ display: "none" }}
          >
            {audioUrl && (
              <>
                <source src={audioUrl} type="audio/wav" />
                <source src={audioUrl} type="audio/mp3" />
                <source src={audioUrl} type="audio/webm" />
                <source src={audioUrl} type="audio/m4a" />
              </>
            )}
          </audio>

          {/* Play Button - Smaller */}
          <div className="flex justify-center">
            <button
              onClick={handleAudioPlay}
              disabled={
                !canPlay || isLoading || !audioUrl || playCount >= MAX_PLAYS
              }
              className={`
          w-16 h-16 rounded-full transition-all shadow-sm flex items-center justify-center
          ${
            !isLoading && audioUrl && canPlay
              ? "bg-gradient-to-br from-[#967AFE] to-[#9AD0F0] hover:from-[#8B6FF7] hover:to-[#87C5EC] text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }
        `}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </div>

          {/* Audio Error Message */}
          {audioError && (
            <div className="text-center">
              <p className="text-xs text-[#FF5454]">
                Audio could not be loaded. Please contact support if this
                persists.
              </p>
            </div>
          )}

          {/* Audio Playing Indicator */}
          {isPlaying && (
            <div className="flex items-center justify-center space-x-2 text-[#967AFE]">
              <div className="w-2 h-2 bg-[#967AFE] rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">Playing audio...</span>
            </div>
          )}
        </div>
      </div>

      {/* MCQ Options - 2x2 Grid with smaller boxes */}
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
                name={`listen-mcq-${question.q_id}`}
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

      {/* No Options Warning */}
      {(!question.options || question.options.length === 0) && (
        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium">
            No answer options available for this question.
          </p>
        </div>
      )}

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
  );
};

export default ListenMCQQuestion;
