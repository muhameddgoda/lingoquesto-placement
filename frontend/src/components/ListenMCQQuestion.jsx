// Enhanced ListenMCQQuestion.jsx that works with external timer
import React, { useState, useRef, useEffect } from "react";
import {
  Volume2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Clock,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const ListenMCQQuestion = ({ question, onSubmit, disabled }) => {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef(null);
  const MAX_PLAYS = 3;

  useEffect(() => {
    // Reset state when question changes
    setSelectedAnswer("");
    setIsPlaying(false);
    setPlayCount(0);
    setIsLoading(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [question.q_id]);

  const handleAudioPlay = async () => {
    // Add check to prevent playing when no plays remaining
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

  const remainingPlays = MAX_PLAYS - playCount;
  const canPlay = remainingPlays > 0 && !disabled && !isPlaying;

  // Get audio reference and construct URL
  const audioFileName = question.metadata?.audioRef || question.audio_ref;
  const cleanAudioFileName = audioFileName?.startsWith("audio/")
    ? audioFileName.substring(6)
    : audioFileName;
  const audioUrl = cleanAudioFileName
    ? `${API_BASE_URL}/api/audio/${cleanAudioFileName}`
    : null;

  return (
    <div className="space-y-8">
      {/* Question Prompt */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {question.prompt}
        </h3>
        {question.metadata?.question && (
          <p className="text-gray-600">{question.metadata.question}</p>
        )}
      </div>

      {/* Timer Display */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-300 rounded-full">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">
            30 seconds remaining
          </span>
        </div>
      </div>

      {/* Audio Player Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 p-8 rounded-2xl border-2 border-green-200 shadow-lg">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-200/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-blue-700 bg-clip-text text-transparent">
              Listen Carefully
            </h3>
          </div>
          {/* Play Counter */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 border border-green-200">
              <div className="flex items-center space-x-2 text-green-700">
                <Volume2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {remainingPlays} play{remainingPlays !== 1 ? "s" : ""}{" "}
                  remaining
                </span>
              </div>
            </div>
          </div>
          {/* Hidden Audio Element */}
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
          <div className="flex items-center justify-center">
            <button
              onClick={handleAudioPlay}
              disabled={
                !canPlay || isLoading || !audioUrl || playCount >= MAX_PLAYS
              }
              className={`
      relative w-16 h-16 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg
      ${
        !isLoading && audioUrl && !isPlaying
          ? "bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
          : "bg-gray-300 text-gray-500 cursor-not-allowed"
      }
    `}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                <Play className="w-7 h-7 mx-auto ml-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MCQ Options */}
      <div className="space-y-4">
        {question.options?.map((option, index) => (
          <label
            key={index}
            className={`flex items-center space-x-4 p-6 border-2 rounded-xl cursor-pointer transition-all transform hover:scale-[1.02] ${
              selectedAnswer === option
                ? "border-green-500 bg-gradient-to-r from-green-50 to-blue-50 shadow-lg"
                : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name={`listen-mcq-${question.q_id}`}
              value={option}
              checked={selectedAnswer === option}
              onChange={(e) => handleOptionChange(e.target.value)}
              disabled={disabled}
              className="w-5 h-5 text-green-600"
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
          className={`px-10 py-4 rounded-xl font-semibold text-lg transition-all transform flex items-center space-x-2 ${
            disabled || !selectedAnswer
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 hover:scale-105 shadow-lg"
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          <span>Submit Answer</span>
        </button>
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-gray-400 mt-4">
          Question ID: {question.q_id} | Selected: {selectedAnswer || "None"} |
          Plays: {playCount}/{MAX_PLAYS} | Audio:{" "}
          {audioUrl ? "Loaded" : "Not loaded"}
        </div>
      )}
    </div>
  );
};

export default ListenMCQQuestion;
