// MinimalPairQuestion.jsx - Listening pronunciation test component
import React, { useState, useRef, useEffect } from "react";
import { Volume2, Play, CheckCircle } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import { useGlobalTimer } from "../hooks/useGlobalTimer";
import TimerDisplay from "./TimerDisplay";

const MinimalPairQuestion = ({ question, onSubmit, disabled }) => {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef(null);
  const MAX_PLAYS = 3;

  // Use global timer
  const { timeLeft, formatTime, startTimer, stopTimer } = useGlobalTimer();

  // Start timer when question loads
  useEffect(() => {
    const totalTime = question.timing?.total_estimated_sec || 30;

    console.log(
      "MinimalPairQuestion: Starting timer for question:",
      question.q_id
    );

    startTimer({
      responseTime: totalTime,
      onTimeExpired: () => {
        console.log(
          "MinimalPairQuestion: Time expired, auto-submitting for:",
          question.q_id
        );
        handleAutoSubmit();
      },
    });

    // Reset state when question changes
    setSelectedAnswer("");
    setIsPlaying(false);
    setPlayCount(0);
    setIsLoading(false);
    setAudioError(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }

    // Cleanup function to prevent stale submissions
    return () => {
      console.log(
        "MinimalPairQuestion: Cleaning up for question:",
        question.q_id
      );
      stopTimer();
    };
  }, [question.q_id]);

  // Handle auto-submit
  const handleAutoSubmit = () => {
    console.log(
      "MinimalPairQuestion: Auto-submitting for question:",
      question.q_id,
      "Selected:",
      selectedAnswer
    );

    // Prevent double submission
    if (disabled) {
      console.log("MinimalPairQuestion: Already disabled, skipping submission");
      return;
    }

    if (selectedAnswer) {
      onSubmit(selectedAnswer);
    } else {
      onSubmit(""); // Submit empty if no selection
    }
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
    <div className="space-y-3">
      {/* Question Prompt */}
      <div className="mb-2">
        <p className="text-md font-semibold text-gray-600">
          Listen carefully and choose which word or phrase you hear.
        </p>
      </div>

      {/* Audio Player Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-amber-200/50">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-amber-800">
                Minimal Pairs
              </h3>
            </div>

            {/* Timer on the right side */}
            <TimerDisplay
              timeLeft={timeLeft}
              formatTime={formatTime}
              phase="active"
              size="large"
            />
          </div>

          <div className="flex items-center justify-center">
            <div className="bg-white rounded-lg px-3 py-1 border border-amber-200">
              <span className="text-sm font-medium text-amber-700">
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

          {/* Play Button */}
          <div className="flex justify-center">
            <button
              onClick={handleAudioPlay}
              disabled={
                !canPlay || isLoading || !audioUrl || playCount >= MAX_PLAYS
              }
              className={`
    w-16 h-16 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center
    ${
      !isLoading && audioUrl && canPlay
        ? "bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
        : "bg-gray-300 text-gray-500 cursor-not-allowed"
    }
  `}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>
          </div>

          {/* Audio Error Message */}
          {audioError && (
            <div className="text-center">
              <p className="text-sm text-red-600">
                Audio could not be loaded. Please contact support if this
                persists.
              </p>
            </div>
          )}

          {/* Audio Playing Indicator */}
          {isPlaying && (
            <div className="flex items-center justify-center space-x-2 text-amber-700">
              <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Playing audio...</span>
            </div>
          )}
        </div>
      </div>

      {/* MCQ Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.metadata?.options?.map((option, index) => (
          <label
            key={index}
            className={`
    flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md
    ${
      selectedAnswer === option
        ? "border-amber-400 bg-gradient-to-r from-amber-50 to-amber-100 shadow-md transform scale-[1.02]"
        : "border-gray-200 hover:border-amber-300 hover:bg-gray-50 bg-white/80 backdrop-blur-sm"
    }
    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
  `}
          >
            <input
              type="radio"
              name={`minimal-pair-${question.q_id}`}
              value={option}
              checked={selectedAnswer === option}
              onChange={(e) => handleOptionChange(e.target.value)}
              disabled={disabled}
              className="w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500"
            />
            <span className="flex-1 text-gray-900 font-medium text-lg">
              {option}
            </span>
            {selectedAnswer === option && (
              <CheckCircle className="w-5 h-5 text-amber-600" />
            )}
          </label>
        ))}
      </div>

      {/* No Options Warning */}
      {(!question.metadata?.options ||
        question.metadata.options.length === 0) && (
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
        : "bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800"
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

export default MinimalPairQuestion;
