// ListenAnswerQuestion.jsx - Updated with consistent styling
import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import AudioRecorder from "./AudioRecorder";
import { API_BASE_URL } from "../config/api";

const ListenAnswerQuestion = ({ question, onSubmit, disabled }) => {
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [canRecord, setCanRecord] = useState(false);
  const audioRef = useRef(null);

  const audioUrl = question.metadata?.audioRef 
    ? `${API_BASE_URL}/api/audio/${question.metadata.audioRef}`
    : null;

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    setAudioPlayed(true);
    setCanRecord(true);
  };

  return (
    <div className="space-y-8">
      {/* Question Display - Consistent styling */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {question.prompt}
        </h3>
        {question.metadata?.context?.question && (
          <p className="text-gray-600">{question.metadata.context.question}</p>
        )}
      </div>

      {/* Audio Player - Enhanced to match other components */}
      {audioUrl && (
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 rounded-2xl border-2 border-blue-200 shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                Listen to the Question
              </h3>
            </div>
            
            <div className="flex items-center justify-center mb-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 border border-blue-200">
                <span className="text-blue-700 font-medium text-sm">
                  {audioPlayed ? "Audio played - You can now record" : "Click to play the question"}
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={playAudio}
                disabled={disabled}
                className={`
                  relative w-16 h-16 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg
                  ${
                    !disabled
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }
                `}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 mx-auto" />
                ) : (
                  <Play className="w-7 h-7 mx-auto ml-5" />
                )}
              </button>
            </div>
          </div>
          
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={handleAudioEnd}
            onError={(e) => console.error("Audio error:", e)}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* Recording Section - Uses AudioRecorder which handles its own timer */}
      {canRecord ? (
        <AudioRecorder
          onSubmit={onSubmit}
          disabled={disabled}
          thinkTime={question.timing?.think_time_sec || 5}
          responseTime={question.timing?.response_time_sec || 25}
          questionId={question.q_id}
        />
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-gray-200">
          <p className="text-gray-600 font-medium">
            {audioPlayed ? "You can now record your response" : "Please listen to the audio first"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ListenAnswerQuestion;