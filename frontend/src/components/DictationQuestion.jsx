// Enhanced DictationQuestion.jsx with TextInput component and single play button
import React, { useState, useRef, useEffect } from "react";
import { Volume2, Play, Send, Clock } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import TextInput from "./TextInput";

const DictationQuestion = ({ question, onSubmit, disabled }) => {
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef(null);
  const textInputRef = useRef(null);
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

    // Focus on textarea when question loads
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [question.audio_ref]);

  const handleAudioPlay = async () => {
    if (!audioRef.current || isLoading || isPlaying || playCount >= MAX_PLAYS) return;

    setIsLoading(true);
    try {
      audioRef.current.currentTime = 0; // Always start from beginning
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
    // Allow playing again after it ends (if plays remaining)
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

  const handleKeyPress = (e) => {
    // Submit on Enter (but not Shift+Enter for line breaks)
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSubmit();
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
      {/* Question Prompt Display */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {question.prompt}
        </h3>
        {question.metadata?.question && (
          <p className="text-gray-600">{question.metadata.question}</p>
        )}
      </div>

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

          {/* Audio Controls - Single Play Button */}
          <div className="flex items-center justify-center">
            <button
              onClick={handleAudioPlay}
              disabled={!canPlay || isLoading || !audioUrl}
              className={`
                relative w-16 h-16 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg
                ${
                  canPlay && !isLoading && audioUrl
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
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

      {/* Text Input Section - Using TextInput Component */}
      <div className="space-y-6">
        <TextInput
          ref={textInputRef}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type the sentence you heard here..."
          disabled={disabled}
          rows={4}
          disableSpellCheck={true}
          showCharCount={true}
        />

        {/* Helpful instruction */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Type exactly what you hear. Press Enter to submit, or use the button below.
          </p>
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

      {/* Debug info in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-gray-400 mt-4">
          Audio: {audioUrl ? "Loaded" : "Not loaded"} | Plays: {playCount}/{MAX_PLAYS} | 
          Input: {userInput.length} chars | Spell check: disabled
        </div>
      )}
    </div>
  );
};

export default DictationQuestion;