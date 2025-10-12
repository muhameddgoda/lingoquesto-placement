import React, { useState } from "react";
import AudioRecorder from "./AudioRecorder";
import AudioVisualizer from "./AudioVisualizer";
const OpenResponse = ({ question, onSubmit, disabled }) => {
  const [audioLevel, setAudioLevel] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-4xl px-6">
        {/* Main Prompt - Outside white box */}
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
          {question?.prompt || "Your turn to talk!"}
        </h1>

        {/* Question - Below prompt */}
        <div className="text-center mb-2">
          <p className="text-base text-gray-700">
            {question?.metadata?.question || ""}
          </p>
        </div>

        {/* Speaking Time - Outside, below question */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">
            You have{" "}
            {Math.floor((question.timing?.response_time_sec || 90) / 60)} minute
            {Math.floor((question.timing?.response_time_sec || 90) / 60) !== 1
              ? "s"
              : ""}{" "}
            to speak
          </p>
        </div>

        {/* Single White Box Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-blue-200/50">
          {/* Helpers inside white box */}
          {question?.metadata?.helpers &&
            question.metadata.helpers.length > 0 && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Ideas to help you:
                </p>
                <ul className="space-y-1">
                  {question.metadata.helpers.map((helper, idx) => (
                    <li key={idx} className="text-sm text-blue-800">
                      • {helper}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Visualizer and Submit Button Row */}
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Audio Visualizer - Takes most space */}
            <div className="flex-1">
              <AudioVisualizer audioLevel={audioLevel} />
            </div>

            {/* Submit Button Placeholder - Will be filled by AudioRecorder */}
            <div id="submit-button-container" className="flex-shrink-0">
              {/* Button will be rendered here by AudioRecorder */}
            </div>
          </div>

          {/* Audio Recorder Controls */}
          <AudioRecorder
            onSubmit={onSubmit}
            disabled={disabled}
            thinkTime={question.timing?.think_time_sec || 10}
            responseTime={question.timing?.response_time_sec || 90}
            questionId={question.q_id}
            forceSubmitting={disabled}
            onAudioLevelChange={setAudioLevel}
          />
        </div>
      </div>
    </div>
  );
};

export default OpenResponse;
