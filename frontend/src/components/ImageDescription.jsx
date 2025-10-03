// ImageDescription.jsx - Modified for side-by-side layout
import React, { useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import AudioRecorder from "./AudioRecorder";

const ImageDescription = ({ question, onSubmit, disabled }) => {
  const [imageError, setImageError] = useState(false);

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
    <div className="space-y-6">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT SIDE - Recording Controls */}
        <div className="order-2 lg:order-1">
          <AudioRecorder
            onSubmit={onSubmit}
            disabled={disabled}
            thinkTime={question.timing?.think_time_sec || 10}
            responseTime={question.timing?.response_time_sec || 80}
            questionId={question.q_id}
            questionContext={question.metadata?.context?.question}
          />
        </div>

        {/* RIGHT SIDE - Image Display */}
        <div className="order-1 lg:order-2">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-4 border border-indigo-200/50 h-full">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Look at this image
              </h3>
            </div>

            {imageUrl && !imageError ? (
              <div className="relative rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={imageUrl}
                  alt={imageDescription || "Question image"}
                  className="w-full h-auto max-h-[500px] object-contain"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
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
        </div>

      </div>
    </div>
  );
};

export default ImageDescription;