// ImageDescription.jsx - Updated with consistent styling
import React, { useState, useEffect } from "react";
import AudioRecorder from "./AudioRecorder";
import { API_BASE_URL } from '../config/api';

const ImageDescription = ({ question, onSubmit, disabled }) => {
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(null);

  console.log('ImageDescription - Question:', question);
  console.log('ImageDescription - Image ref:', question.metadata?.imageRef || question.image_ref);
  
  useEffect(() => {
    const loadImage = async () => {
      setImageLoading(true);
      setImageError(null);
      
      const imageRef = question.metadata?.imageRef || question.image_ref;
      if (!imageRef) {
        setImageLoading(false);
        return;
      }
      
      const cleanImageRef = imageRef.startsWith('images/') 
        ? imageRef.substring(7) 
        : imageRef;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/image/${cleanImageRef}`);
        const result = await response.json();
        
        if (result.success) {
          setImageDataUrl(result.data_url);
        } else {
          setImageError('Failed to load image');
        }
      } catch (error) {
        console.error('Error loading image:', error);
        setImageError('Error loading image: ' + error.message);
      } finally {
        setImageLoading(false);
      }
    };
    
    loadImage();
  }, [question]);

  return (
    <div className="space-y-8">
      {/* Question Prompt - Consistent with other components */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {question.prompt}
        </h3>
        {question.metadata?.context?.question && (
          <p className="text-gray-600">{question.metadata.context.question}</p>
        )}
      </div>

      {/* Image Display - Enhanced styling to match other components */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-8 rounded-2xl border-2 border-indigo-200 shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-200/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10">
          <div className="flex justify-center">
            {imageLoading ? (
              <div className="flex items-center justify-center h-64 w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-indigo-700 font-medium">Loading image...</span>
              </div>
            ) : imageError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center w-full">
                <p className="text-red-600 font-medium">
                  {imageError}
                </p>
              </div>
            ) : imageDataUrl ? (
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-indigo-200 shadow-lg">
                <img
                  src={imageDataUrl}
                  alt="Describe this image"
                  className="max-w-full max-h-96 rounded-lg shadow-lg"
                  onLoad={() => {
                    console.log('Image loaded successfully from base64');
                  }}
                />
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center w-full">
                <p className="text-yellow-800 font-medium">
                  No image available for this question
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Recorder - This handles its own timer */}
      <AudioRecorder
        onSubmit={onSubmit}
        disabled={disabled}
        thinkTime={question.timing?.think_time_sec || 10}
        responseTime={question.timing?.response_time_sec || 80}
        questionId={question.q_id}
      />

      {/* Instructions - Consistent styling */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
        <div className="text-center">
          <p className="text-indigo-800 font-medium mb-2">Instructions:</p>
          <p className="text-indigo-700 text-sm leading-relaxed">
            Look at the image carefully and provide a detailed description. 
            Analyze what you see and discuss any broader implications or themes that come to mind.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageDescription;