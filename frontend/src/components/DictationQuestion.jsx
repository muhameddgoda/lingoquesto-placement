// frontend/src/components/DictationQuestion.jsx
import React, { useState, useRef, useEffect } from "react";
import { Volume2, Play, Pause, RotateCcw, Send, Clock } from "lucide-react";

const DictationQuestion = ({ question, onSubmit, disabled }) => {
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);
  const MAX_PLAYS = 3;

  useEffect(() => {
    // Reset state when question changes
    setUserInput("");
    setIsPlaying(false);
    setPlayCount(0);
    setIsLoading(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [question.audio_ref]);

  const handleAudioPlay = async () => {
    if (!audioRef.current || playCount >= MAX_PLAYS) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      try {
        await audioRef.current.play();
        setPlayCount((prev) => prev + 1);
      } catch (error) {
        console.error("Audio play error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleAudioPlayStart = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };

  const handleSubmit = () => {
    if (userInput.trim() && !disabled) {
      onSubmit(userInput.trim());
    }
  };

  const handleReplay = async () => {
    if (!audioRef.current || playCount >= MAX_PLAYS) return;

    setIsLoading(true);
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setPlayCount((prev) => prev + 1);
    } catch (error) {
      console.error("Audio replay error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const remainingPlays = MAX_PLAYS - playCount;
  const canPlay = remainingPlays > 0 && !disabled;

  return (
    <div className="space-y-8">
      {/* Audio Player Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-8 rounded-2xl border-2 border-purple-200 shadow-lg">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent">
              Listen Carefully
            </h3>
          </div>

          {/* Play Counter */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 border border-purple-200">
              <div className="flex items-center space-x-2 text-purple-700">
                <Clock className="w-4 h-4" />
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
          >
            <source
              src={`http://localhost:8000/${question.audio_ref}`}
              type="audio/wav"
            />
            <source
              src={`http://localhost:8000/${question.audio_ref}`}
              type="audio/mp3"
            />
          </audio>

          {/* Audio Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleAudioPlay}
              disabled={!canPlay || isLoading}
              className={`
                relative w-16 h-16 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg
                ${
                  canPlay && !isLoading
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }
              `}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : isPlaying ? (
                <Pause className="w-7 h-7 mx-auto" />
              ) : (
                <Play className="w-7 h-7 mx-auto ml-5" />
              )}
            </button>

            <button
              onClick={handleReplay}
              disabled={!canPlay || isLoading}
              className={`
                w-12 h-12 rounded-full transition-all duration-300 transform hover:scale-105 shadow-md
                ${
                  canPlay && !isLoading
                    ? "bg-white/80 backdrop-blur-sm hover:bg-white text-purple-600 border-2 border-purple-300 hover:border-purple-400"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300"
                }
              `}
              title="Replay from beginning"
            >
              <RotateCcw className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* Text Input Section */}
      <div className="space-y-6">
        <div className="relative">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type the sentence you heard here..."
            className="w-full p-6 border-2 border-purple-200 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 resize-none text-lg transition-all duration-200 bg-white/50 backdrop-blur-sm"
            rows={4}
            disabled={disabled}
          />

          {/* Character counter with gradient */}
          <div className="absolute bottom-4 right-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full px-3 py-1 border border-purple-200">
            <span className="text-xs font-medium text-purple-700">
              {userInput.length} characters
            </span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center pt-4 pb-4">
        <button
          onClick={handleSubmit}
          disabled={disabled || !userInput.trim()}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-10 py-4 rounded-2xl text-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-indigo-600 flex items-center space-x-3 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <Send className="w-5 h-5" />
          <span>Submit Answer</span>
        </button>
      </div>

      {/* Progress indicator */}
      {userInput.length > 0 && <div className="flex justify-center"></div>}
    </div>
  );
};

export default DictationQuestion;
