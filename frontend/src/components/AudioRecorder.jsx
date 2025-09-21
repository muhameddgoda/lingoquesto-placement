// AudioRecorder.jsx - Cleaned UI with minimal prompts
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Square, Play, Pause, Send, FastForward } from "lucide-react";
import { useGlobalTimer } from "../hooks/useGlobalTimer";
import TimerDisplay from "./TimerDisplay";

const AudioRecorder = ({
  onSubmit,
  disabled,
  thinkTime = 5,
  responseTime = 120,
  questionId,
}) => {
  // Core state - simplified to 3 main states
  const [recordingState, setRecordingState] = useState("idle"); // 'idle', 'recording', 'complete'
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const isProcessingPhaseChangeRef = useRef(false);
  const submissionInProgressRef = useRef(false);

  // Timer
  const { phase, timeLeft, formatTime, startTimer, stopTimer, skipThinking } =
    useGlobalTimer();

  // Reset everything when question changes
  useEffect(() => {
    console.log("Question changed to:", questionId);
    resetComponent();
    initializeTimer();
  }, [questionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  // Handle phase transitions
  useEffect(() => {
    if (isProcessingPhaseChangeRef.current || submissionInProgressRef.current) {
      return;
    }

    console.log(
      "Phase changed to:",
      phase,
      "Current recording state:",
      recordingState
    );

    if (phase === "responding" && !hasStartedRecording) {
      handleRespondingPhaseStart();
    } else if (phase === "expired") {
      handleTimeExpiry();
    }
  }, [phase, recordingState, hasStartedRecording]);

  const resetComponent = useCallback(() => {
    console.log("Resetting component");

    // Stop any ongoing processes
    isProcessingPhaseChangeRef.current = false;
    submissionInProgressRef.current = false;

    // Cleanup resources
    cleanupResources();

    // Reset state
    setRecordingState("idle");
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setIsSubmitting(false);
    setHasStartedRecording(false);
    chunksRef.current = [];
  }, []);

  const initializeTimer = useCallback(() => {
    startTimer({
      thinkTime,
      responseTime,
      onPhaseChange: (newPhase) => {
        console.log("Timer phase change:", newPhase);
      },
      onThinkingComplete: () => {
        console.log("Thinking complete - will transition to responding");
      },
      onTimeExpired: () => {
        console.log("Timer expired");
      },
    });
  }, [thinkTime, responseTime, startTimer]);

  const handleRespondingPhaseStart = useCallback(() => {
    if (isProcessingPhaseChangeRef.current || hasStartedRecording) {
      return;
    }

    console.log("Starting responding phase - auto-starting recording");
    isProcessingPhaseChangeRef.current = true;
    setHasStartedRecording(true);

    // Start recording immediately without any UI prompts
    startRecording().finally(() => {
      isProcessingPhaseChangeRef.current = false;
    });
  }, [hasStartedRecording]);

  const handleTimeExpiry = useCallback(() => {
    if (submissionInProgressRef.current) {
      return;
    }

    console.log("Handling time expiry - current state:", recordingState);
    submissionInProgressRef.current = true;

    if (recordingState === "recording") {
      console.log(
        "Time expired while recording - submitting current recording"
      );
      // Stop recording silently and submit immediately
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.log("MediaRecorder already stopped");
        }
      }

      // Submit after a brief delay for recording to process
      setTimeout(() => {
        performSubmission();
      }, 500);
    } else {
      // No active recording, submit immediately
      console.log("No active recording, submitting immediately");
      performSubmission();
    }
  }, [recordingState]);

  const cleanupResources = useCallback(() => {
    console.log("Cleaning up resources");

    // Stop media recorder
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log("MediaRecorder already stopped");
      }
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Cleanup audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    mediaRecorderRef.current = null;
  }, [audioUrl]);

  const getBestAudioFormat = () => {
    const formats = [
      "audio/mp4",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/wav",
    ];

    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        return format;
      }
    }
    return "";
  };

  const getAudioConstraints = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
      return { sampleRate: 44100, channelCount: 1, echoCancellation: true };
    } else if (userAgent.includes("android")) {
      return { channelCount: 1, echoCancellation: true };
    } else {
      return { sampleRate: 16000, channelCount: 1, echoCancellation: true };
    }
  };

  const startRecording = useCallback(async () => {
    if (recordingState === "recording") {
      console.log("Already recording");
      return;
    }

    console.log("Starting recording...");

    try {
      // Clean up any previous resources
      cleanupResources();

      // Get new media stream silently
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(),
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = getBestAudioFormat();
      const recorderOptions = mimeType ? { mimeType } : {};

      mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);

      // Set up event handlers
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log("Audio chunk received:", event.data.size);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log("MediaRecorder stopped, processing audio...");
        processRecordingData(mimeType);
      };

      mediaRecorderRef.current.onstart = () => {
        console.log("MediaRecorder started successfully");
        setRecordingState("recording");
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setRecordingState("idle");
        cleanupResources();
      };

      // Start recording immediately
      mediaRecorderRef.current.start(1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingState("idle");
      cleanupResources();
      // Silently fail - no alert to user
    }
  }, [recordingState]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && recordingState === "recording") {
        console.log("Stopping recording...");

        // Set up one-time stop handler
        const handleStop = () => {
          mediaRecorderRef.current.removeEventListener("stop", handleStop);
          // Only set to complete if not submitting (i.e., manual stop)
          if (!submissionInProgressRef.current) {
            setRecordingState("complete");
          }
          resolve();
        };

        mediaRecorderRef.current.addEventListener("stop", handleStop);

        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.error("Error stopping recording:", error);
          mediaRecorderRef.current.removeEventListener("stop", handleStop);
          resolve();
        }
      } else {
        console.log("No active recording to stop");
        resolve();
      }
    });
  }, [recordingState]);

  const processRecordingData = useCallback(
    (mimeType) => {
      console.log(
        "Processing recording data, chunks:",
        chunksRef.current.length
      );

      if (chunksRef.current.length === 0) {
        console.log("No audio data to process");
        return;
      }

      const totalSize = chunksRef.current.reduce(
        (total, chunk) => total + chunk.size,
        0
      );

      if (totalSize > 0) {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });

        // Clean up previous audio URL
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        console.log("Audio blob created successfully, size:", totalSize);
      }

      // Clean up stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    },
    [audioUrl]
  );

  const startNewRecording = useCallback(async () => {
    console.log("Starting new recording");

    // Clear previous recording
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setIsPlaying(false);
    setRecordingState("idle");
    chunksRef.current = [];

    // Start new recording
    await startRecording();
  }, [audioUrl, startRecording]);

  const playAudio = useCallback(() => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [audioUrl, isPlaying]);

  const performSubmission = useCallback(() => {
    console.log("Performing submission...");
    stopTimer();

    // Determine what to submit
    let submissionBlob = null;

    if (audioBlob) {
      submissionBlob = audioBlob;
      console.log("Submitting existing audio blob");
    } else if (chunksRef.current.length > 0) {
      const mimeType = getBestAudioFormat();
      submissionBlob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      });
      console.log("Submitting from chunks");
    } else {
      console.log("No audio to submit");
    }

    // Submit after cleanup
    setTimeout(() => {
      onSubmit(submissionBlob);
    }, 100);
  }, [audioBlob, stopTimer, onSubmit]);

  const handleManualSubmit = useCallback(() => {
    console.log("Manual submit triggered");

    // Mark submission in progress
    submissionInProgressRef.current = true;

    // If recording, stop it first and submit immediately
    if (recordingState === "recording") {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.log("MediaRecorder already stopped");
        }
      }

      setTimeout(() => {
        performSubmission();
      }, 500);
    } else {
      performSubmission();
    }
  }, [recordingState, performSubmission]);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-blue-200/50">
      <div className="text-center space-y-6">
        {/* Header with Timer */}
        {phase !== "expired" && phase !== "stopped" && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-blue-800">
                Speaking Question
              </h3>
            </div>

            {/* Timer on the right side */}
            <TimerDisplay
              timeLeft={timeLeft}
              formatTime={formatTime}
              phase={phase}
              size="large"
            />
          </div>
        )}

        {/* Skip Thinking Button - only during thinking phase */}
        {phase === "thinking" && (
          <button
            onClick={skipThinking}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center mx-auto"
          >
            <FastForward className="w-4 h-4 mr-2" />
            Skip to Recording
          </button>
        )}

        {/* Simple recording indicator - only when actively recording */}
        {recordingState === "recording" && phase === "responding" && (
          <div className="flex items-center justify-center space-x-3 text-red-600">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <span className="font-medium">Recording...</span>
          </div>
        )}

        {/* Control Buttons - only show when in responding phase */}
        {phase === "responding" && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Stop Recording Button */}
            {recordingState === "recording" && (
              <button
                onClick={() => stopRecording()}
                disabled={disabled || submissionInProgressRef.current}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Square className="w-4 h-4" />
                <span>Stop Recording</span>
              </button>
            )}

            {/* Record Again Button */}
            {recordingState === "complete" && audioBlob && (
              <button
                onClick={startNewRecording}
                disabled={disabled || submissionInProgressRef.current}
                className="flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm border-2 border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic className="w-4 h-4" />
                <span>Record Again</span>
              </button>
            )}

            {/* Play Button */}
            {audioUrl && recordingState === "complete" && (
              <button
                onClick={playAudio}
                disabled={submissionInProgressRef.current}
                className="flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Play</span>
                  </>
                )}
              </button>
            )}

            {/* Submit Button */}
            {((audioBlob && recordingState === "complete") ||
              recordingState === "recording") && (
              <button
                onClick={handleManualSubmit}
                disabled={disabled || submissionInProgressRef.current}
                className="flex items-center space-x-2 px-8 py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>Submit Response</span>
              </button>
            )}
          </div>
        )}

        {/* Hidden Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: "none" }}
          />
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;
