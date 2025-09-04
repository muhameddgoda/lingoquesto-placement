// frontend/src/components/ImageDescription.jsx
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
    <div className="space-y-6">
      {/* Question Prompt */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-200">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">
          {question.prompt}
        </h3>
        {question.metadata?.context?.question && (
          <p className="text-gray-700 text-sm leading-relaxed">
            {question.metadata.context.question}
          </p>
        )}
      </div>

      {/* Image Display */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-center">
          {imageLoading ? (
            <div className="flex items-center justify-center h-64 w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading image...</span>
            </div>
          ) : imageError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center w-full">
              <p className="text-red-600 font-medium">
                {imageError}
              </p>
            </div>
          ) : imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt="Describe this image"
              className="max-w-full max-h-96 rounded-lg border shadow-lg"
              onLoad={() => {
                console.log('Image loaded successfully from base64');
              }}
            />
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center w-full">
              <p className="text-yellow-800 font-medium">
                No image available for this question
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Audio Recorder */}
      <AudioRecorder
        onSubmit={onSubmit}
        disabled={disabled}
        thinkTime={question.timing?.think_time_sec || 10}
        responseTime={question.timing?.response_time_sec || 80}
        questionId={question.q_id}
      />

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-blue-800 text-sm">
          <strong>Instructions:</strong> Look at the image carefully and provide a detailed description. 
          Analyze what you see and discuss any broader implications or themes that come to mind.
        </p>
      </div>
    </div>
  );
};

export default ImageDescription;