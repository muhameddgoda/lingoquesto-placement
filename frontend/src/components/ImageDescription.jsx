import React, { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import AudioRecorder from "./AudioRecorder";
import AudioVisualizer from "./AudioVisualizer";

const ImageDescription = ({ question, onSubmit, disabled }) => {
  const [imageError, setImageError] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Get image URL
  const imageRef = question.metadata?.imageRef || question.image_ref;
  const cleanImageRef = imageRef?.startsWith("images/")
    ? imageRef.substring(7)
    : imageRef;
  const imageUrl = cleanImageRef
    ? `${API_BASE_URL}/images/${cleanImageRef}`
    : null;

  const imageDescription = question.metadata?.imageDescription || "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-4xl px-6">
        {/* Main Prompt */}
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-2">
          {question?.prompt || "Describe what you see!"}
        </h1>

        {/* Speaking Time */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">
            You have{" "}
            {Math.floor((question.timing?.response_time_sec || 80) / 60)} minute
            {Math.floor((question.timing?.response_time_sec || 80) / 60) !== 1
              ? "s"
              : ""}{" "}
            to speak
          </p>
        </div>

        {/* Single White Box Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-blue-200/50">
          {/* Image Display - Centered and Smaller */}
          <div className="mb-6 flex justify-center">
            {imageUrl && !imageError ? (
              <div className="relative rounded-lg overflow-hidden bg-gray-100 max-w-md">
                <img
                  src={imageUrl}
                  alt={imageDescription || "Question image"}
                  className="w-full h-auto max-h-[280px] object-contain"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center max-w-md">
                <ImageIcon className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                <p className="text-yellow-800 font-medium">
                  Image could not be loaded. Please contact support.
                </p>
                {imageDescription && (
                  <p className="text-sm text-yellow-700 mt-2">
                    Expected: {imageDescription}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Visualizer and Submit Button Row */}
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Audio Visualizer */}
            <div className="flex-1">
              <AudioVisualizer audioLevel={audioLevel} />
            </div>
          </div>

          {/* Audio Recorder Controls */}
          <AudioRecorder
            onSubmit={onSubmit}
            disabled={disabled}
            thinkTime={question.timing?.think_time_sec || 10}
            responseTime={question.timing?.response_time_sec || 80}
            questionId={question.q_id}
            forceSubmitting={disabled}
            onAudioLevelChange={setAudioLevel}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageDescription;
