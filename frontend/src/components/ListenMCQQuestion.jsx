// frontend/src/components/ListenMCQQuestion.jsx
import React, { useState, useRef, useEffect } from "react";
import { Volume2, Play, Pause, RotateCcw, Clock, CheckCircle } from "lucide-react";

const ListenMCQQuestion = ({ question, onSubmit, disabled }) => {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const MAX_PLAYS = 3;

  // Get timing from question configuration
  const responseTimeLimit = question.timing?.response_time_sec || 25; // Default 25 seconds for MCQ

  useEffect(() => {
    // Reset state when question changes
    setSelectedAnswer('');
    setIsPlaying(false);
    setPlayCount(0);
    setIsLoading(false);
    setTimeRemaining(responseTimeLimit);
    setShowTimeWarning(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }

    // Start countdown timer
    if (!disabled) {
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [question.q_id, disabled, responseTimeLimit]);

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up - auto-submit current answer or empty
          clearInterval(timerRef.current);
          if (selectedAnswer) {
            onSubmit(selectedAnswer);
          } else {
            onSubmit(''); // Submit empty answer if no selection
          }
          return 0;
        }
        
        // Show warning when 10 seconds or less remain
        if (prev <= 10 && !showTimeWarning) {
          setShowTimeWarning(true);
        }
        
        return prev - 1;
      });
    }, 1000);
  };

  const handleAudioPlay = async () => {
    if (!audioRef.current || playCount >= MAX_PLAYS) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      try {
        await audioRef.current.play();
        setPlayCount(prev => prev + 1);
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

  const handleOptionChange = (value) => {
    if (!disabled) {
      setSelectedAnswer(value);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer && !disabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      onSubmit(selectedAnswer);
    }
  };

  const handleReplay = async () => {
    if (!audioRef.current || playCount >= MAX_PLAYS) return;
    
    setIsLoading(true);
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setPlayCount(prev => prev + 1);
    } catch (error) {
      console.error("Audio replay error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const remainingPlays = MAX_PLAYS - playCount;
  const canPlay = remainingPlays > 0 && !disabled;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Timer Display */}
      {timeRemaining !== null && (
        <div className={`flex justify-center ${showTimeWarning ? 'animate-pulse' : ''}`}>
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border-2 ${
            showTimeWarning 
              ? 'bg-red-50 border-red-300 text-red-700' 
              : 'bg-blue-50 border-blue-300 text-blue-700'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              Time remaining: {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      )}

      {/* Question Prompt */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {question.prompt}
        </h3>
        {question.metadata?.question && (
          <p className="text-gray-600">
            {question.metadata.question}
          </p>
        )}
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
                  {remainingPlays} play{remainingPlays !== 1 ? 's' : ''} remaining
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
                ${canPlay && !isLoading
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
                ${canPlay && !isLoading
                  ? 'bg-white/80 backdrop-blur-sm hover:bg-white text-green-600 border-2 border-green-300 hover:border-green-400' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300'
                }
              `}
              title="Replay from beginning"
            >
              <RotateCcw className="w-5 h-5 mx-auto" />
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
                ? 'border-green-500 bg-gradient-to-r from-green-50 to-blue-50 shadow-lg' 
                : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 hover:scale-105 shadow-lg'
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          <span>Submit Answer</span>
        </button>
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-4">
          Question ID: {question.q_id} | Selected: {selectedAnswer || 'None'} | Time: {timeRemaining}s | Plays: {playCount}/{MAX_PLAYS}
        </div>
      )}
    </div>
  );
};

export default ListenMCQQuestion;