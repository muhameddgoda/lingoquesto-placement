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
    <div className="space-y-6">
      {/* Question Display */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {question.prompt}
        </h3>
        {question.metadata?.context?.question && (
          <p className="text-gray-600 mb-4">{question.metadata.context.question}</p>
        )}
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-center space-x-4">
            <Volume2 className="w-6 h-6 text-blue-600" />
            <span className="font-medium text-blue-800">Listen to the question:</span>
            <button
              onClick={playAudio}
              disabled={disabled}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
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

      {/* Recording Section */}
      {canRecord ? (
        <AudioRecorder
          onSubmit={onSubmit}
          disabled={disabled}
          thinkTime={question.timing?.think_time_sec || 5}
          responseTime={question.timing?.response_time_sec || 25}
          questionId={question.q_id}
        />
      ) : (
        <div className="text-center p-6 bg-gray-50 rounded-xl">
          <p className="text-gray-600">
            {audioPlayed ? "You can now record your response" : "Please listen to the audio first"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ListenAnswerQuestion;