import React, { useState } from "react";
import AudioRecorder from "./AudioRecorder";
import AudioVisualizer from "./AudioVisualizer";

const RepeatSentence = ({ question, onSubmit, disabled }) => {
  const [audioLevel, setAudioLevel] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-4xl px-6">
        {/* Main Prompt */}
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
          {question?.prompt || "Listen and repeat!"}
        </h1>

        {/* Sentence to Repeat */}
        {question?.metadata?.sentence && (
          <div className="text-center mb-6">
            <p className="text-xl font-semibold text-gray-800">
              "{question.metadata.sentence}"
            </p>
          </div>
        )}

        {/* Single White Box Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-blue-200/50">
          {/* Visualizer and Submit Button Row */}
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Audio Visualizer */}
            <div className="flex-1">
              <AudioVisualizer audioLevel={audioLevel} />
            </div>
          </div>

          {/* Audio Recorder Controls - NO minimum time */}
          <AudioRecorder
            onSubmit={onSubmit}
            disabled={disabled}
            thinkTime={question.timing?.think_time_sec || 5}
            responseTime={question.timing?.response_time_sec || 15}
            questionId={question.q_id}
            forceSubmitting={disabled}
            onAudioLevelChange={setAudioLevel}
            noMinimumTime={true}
          />
        </div>
      </div>
    </div>
  );
};

export default RepeatSentence;
