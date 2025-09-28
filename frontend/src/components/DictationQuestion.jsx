// DictationQuestion.jsx - Complete Fixed Version
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Volume2,
  Play,
  Send,
  Clock,
  Headphones,
  AlertTriangle,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";
import TextInput from "./TextInput";
import { useGlobalTimer } from "../hooks/useGlobalTimer";
import TimerDisplay from "./TimerDisplay";

const DictationQuestion = ({ question, onSubmit, disabled }) => {
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef(null);
  const textInputRef = useRef(null);
  const MAX_PLAYS = 3;

  // Use global timer
  const { timeLeft, phase, startTimer, stopTimer, formatTime } =
    useGlobalTimer();

  // FIXED: Create a stable reference to get current input value
  const getCurrentInput = useCallback(() => {
    // Always get the most current value from the DOM element
    return textInputRef.current?.value || "";
  }, []);

  // FIXED: Handle auto-submit with current value (prevents stale closure)
  const handleAutoSubmit = useCallback(() => {
    const currentValue = getCurrentInput();
    console.log(
      "Auto-submitting Dictation - Time expired. User input:",
      currentValue
    );
    // Submit whatever is currently in the text field
    onSubmit(currentValue.trim());
  }, [getCurrentInput, onSubmit]);

  // Start timer when question loads
  useEffect(() => {
    const totalTime = question.timing?.total_estimated_sec || 30;

    startTimer({
      responseTime: totalTime,
      onTimeExpired: handleAutoSubmit, // Use the stable callback
    });

    // Cleanup function to prevent stale timer callbacks
    return () => {
      stopTimer();
    };
  }, [question.audio_ref, handleAutoSubmit, startTimer, stopTimer]);

  // Reset state when question changes
  useEffect(() => {
    setUserInput("");
    setIsPlaying(false);
    setPlayCount(0);
    setIsLoading(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }

    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [question.audio_ref]);

  // FIXED: Handle input changes - keep both state and ref in sync
  const handleInputChange = (e) => {
    const value = e.target.value;
    setUserInput(value);
    // Ensure the ref always has the current value
    if (textInputRef.current) {
      textInputRef.current.value = value;
    }
  };
  // Add this helper function similar to AudioRecorder
  const getInstructions = (timeLeft, playCount, maxPlays) => {
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

    if (playCount === 0) {
      return {
        title: "Listen and Type",
        instruction:
          "Play the audio and type exactly what you hear. You have 3 plays maximum.",
        color: "blue",
        icon: Headphones,
        urgent: false,
      };
    }

    return {
      title: "Type What You Heard",
      instruction: `You have ${maxPlays - playCount} play${
        maxPlays - playCount !== 1 ? "s" : ""
      } remaining. Type the sentence exactly as spoken.`,
      color: "blue",
      icon: Volume2,
      urgent: false,
    };
  };
  // Audio play handling
  const handleAudioPlay = async () => {
    if (!audioRef.current || isLoading || isPlaying || playCount >= MAX_PLAYS)
      return;

    setIsLoading(true);
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setPlayCount((prev) => prev + 1);
    } catch (error) {
      console.error("Audio play error:", error);
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
  };

  // FIXED: Manual submit function
  const handleSubmit = () => {
    if (!disabled) {
      const currentValue = getCurrentInput();
      console.log("Manual submit - User input:", currentValue);
      stopTimer(); // Stop the global timer
      onSubmit(currentValue.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const remainingPlays = MAX_PLAYS - playCount;
  const canPlay = remainingPlays > 0 && !disabled && !isPlaying;

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
          getInstructions(timeLeft, playCount, MAX_PLAYS).urgent
            ? "bg-red-50 border-red-200 text-red-800 animate-pulse"
            : "bg-blue-50 border-blue-200 text-blue-800"
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            {React.createElement(
              getInstructions(timeLeft, playCount, MAX_PLAYS).icon,
              { className: "w-6 h-6" }
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">
              {getInstructions(timeLeft, playCount, MAX_PLAYS).title}
            </h3>
            <p className="text-base">
              {getInstructions(timeLeft, playCount, MAX_PLAYS).instruction}
            </p>
            {question.metadata?.question && (
              <p className="text-sm mt-2 opacity-80">
                {question.metadata.question}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Audio Player Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-purple-200/50">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-purple-800">
                Listen Carefully
              </h3>
            </div>

            {/* Enhanced Timer Display */}
            <div className="flex flex-col items-end">
              <TimerDisplay
                timeLeft={timeLeft}
                formatTime={formatTime}
                phase={phase}
                size="large"
              />
              {timeLeft <= 30 && (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  Auto-submit when time expires
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="bg-white rounded-lg px-3 py-1 border border-purple-200">
              <span className="text-sm font-medium text-purple-700">
                {remainingPlays} play{remainingPlays !== 1 ? "s" : ""} remaining
              </span>
            </div>
          </div>

          <audio
            ref={audioRef}
            onPlay={handleAudioPlayStart}
            onPause={() => setIsPlaying(false)}
            onEnded={handleAudioEnded}
            preload="auto"
            onError={(e) => {
              console.error("Audio failed to load:", audioUrl);
            }}
          >
            {audioUrl && (
              <>
                <source src={audioUrl} type="audio/wav" />
                <source src={audioUrl} type="audio/mp3" />
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
                  canPlay && !isLoading && audioUrl
                    ? "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
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
        </div>
      </div>

      {/* Text Input Section */}
      <div className="space-y-2">
        <TextInput
          ref={textInputRef}
          value={userInput}
          onChange={handleInputChange} // FIXED: Use new handler
          onKeyPress={handleKeyPress}
          placeholder="Type the sentence you heard here..."
          disabled={disabled}
          rows={3}
          disableSpellCheck={true}
          showCharCount={true}
          className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
        />
      </div>

      {/* Submit Button - FIXED: Allow empty submissions */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={disabled} // Only disable if processing, allow empty submissions
          className={`
            px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2
            ${
              disabled
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800"
            }
          `}
        >
          <Send className="w-4 h-4" />
          <span>Submit Answer</span>
        </button>
      </div>
    </div>
  );
};

export default DictationQuestion;
