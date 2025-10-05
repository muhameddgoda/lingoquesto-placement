// AudioRecorder.jsx - Clean rewrite with clear phase guidance
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  Send,
  FastForward,
  Brain,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useTimer } from "../contexts/TimerContext";

const AudioRecorder = ({
  onSubmit,
  disabled,
  thinkTime = 5,
  responseTime = 120,
  questionId,
  questionContext = null,
  forceSubmitting = false, // NEW
}) => {
  // State
  const [recordingState, setRecordingState] = useState("idle");
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // Timer
  const { phase, timeLeft, formatTime, startTimer, stopTimer, skipThinking } =
    useTimer();

  // Initialize on question change
  useEffect(() => {
    resetComponent();
    startTimer({
      thinkTime,
      responseTime,
      onTimeExpired: handleTimeExpiry,
    });
  }, [questionId]);

  // If parent says we're processing, reflect it immediately
  useEffect(() => {
    if (forceSubmitting) {
      submittingRef.current = true;
      setRecordingState("submitting");
      stopTimer(); // freeze any local timer display
    }
  }, [forceSubmitting, stopTimer]);

  // Handle phase transitions
  useEffect(() => {
    if (phase === "responding" && !hasStartedRecording) {
      setHasStartedRecording(true);
      startRecording();
    } else if (phase === "expired") {
      handleTimeExpiry();
    }
  }, [phase, hasStartedRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupResources();
  }, []);

  // Reset state
  const resetComponent = useCallback(() => {
    cleanupResources();
    submittingRef.current = false;
    setRecordingState("idle");
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setHasStartedRecording(false);
    chunksRef.current = [];
  }, []);

  const submittingRef = useRef(false);

  // Cleanup media resources
  const cleanupResources = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    mediaRecorderRef.current = null;
  }, [audioUrl]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (recordingState === "recording") return;

    try {
      cleanupResources();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        createAudioBlob();
        // Don't flip to 'complete' if we're submitting
        if (!submittingRef.current) {
          setRecordingState("complete");
        }
      };

      recorder.onstart = () => {
        setRecordingState("recording");
      };

      recorder.start(1000);
    } catch (error) {
      console.error("Recording error:", error);
      setRecordingState("idle");
    }
  }, [recordingState]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, [recordingState]);

  // Create audio blob from chunks
  const createAudioBlob = useCallback(() => {
    if (chunksRef.current.length === 0) return;

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(blob);
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [audioUrl]);

  const performSubmission = useCallback(() => {
    console.log("performSubmission called, stopping timer");

    // Stop timer FIRST to prevent re-renders
    stopTimer();

    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    const submissionBlob =
      audioBlob ||
      (chunksRef.current.length > 0
        ? new Blob(chunksRef.current, { type: "audio/webm" })
        : null);

    // Submit immediately
    onSubmit(submissionBlob);
  }, [audioBlob, stopTimer, onSubmit, isPlaying]);

  const handleTimeExpiry = useCallback(() => {
    console.log("handleTimeExpiry called");

    // Set submitting state immediately to hide buttons
    submittingRef.current = true;
    setRecordingState("submitting");

    if (mediaRecorderRef.current?.state === "recording") {
      stopRecording();
      setTimeout(() => performSubmission(), 500);
    } else {
      performSubmission();
    }
  }, [stopRecording, performSubmission]);

  const handleManualSubmit = useCallback(() => {
    // Immediately set to submitting to hide all buttons
    submittingRef.current = true;
    setRecordingState("submitting");

    if (mediaRecorderRef.current?.state === "recording") {
      stopRecording();
      setTimeout(() => performSubmission(), 500);
    } else {
      performSubmission();
    }
  }, [stopRecording, performSubmission]);

  // Record again
  const handleRecordAgain = useCallback(async () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setIsPlaying(false);
    setRecordingState("idle");
    chunksRef.current = [];
    await startRecording();
  }, [audioUrl, startRecording]);

  // Play/pause audio
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  // Format time for display
  const formatTimeLimit = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0 && remainingSeconds > 0) {
      return `${minutes} minute${
        minutes > 1 ? "s" : ""
      } and ${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else {
      return `${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`;
    }
  };

  const getPhaseInstructions = () => {
    // PRIORITY: Check if submitting first, regardless of phase
    if (forceSubmitting || recordingState === "submitting") {
      return {
        title: "Response Submitted",
        instruction: "We received your answer. Processing now…",
        action: "Please wait while we save your response.",
        icon: CheckCircle,
        color: "green",
        showTimer: false,
      };
    }
    switch (phase) {
      case "thinking":
        return {
          title: "Preparation Time",
          instruction: questionContext
            ? `${questionContext} You will have ${formatTimeLimit(
                responseTime
              )} to record your response.`
            : `Think about your response. Take your time to organize your thoughts. You have ${formatTimeLimit(
                responseTime
              )} to record your response.`,
          action:
            "Recording will start automatically when preparation time ends.",
          icon: Brain,
          color: "blue",
          showTimer: true,
        };

      case "responding":
        if (recordingState === "recording") {
          return {
            title: "Recording Your Response",
            instruction:
              questionContext ||
              "Speak clearly and at a natural pace. You can stop early if you finish your answer.",
            action:
              "Click 'Stop Recording' when you're done, or let the timer run out.",
            icon: Mic,
            color: "red",
            showTimer: true,
          };
        } else if (recordingState === "complete") {
          return {
            title: "Review Your Recording",
            instruction:
              "You can listen to your recording, record again, or submit your final answer.",
            action: "Choose 'Submit' when you're satisfied with your response.",
            icon: CheckCircle,
            color: "purple",
            showTimer: true,
          };
        } else {
          return {
            title: "Ready to Record",
            instruction:
              questionContext ||
              "Recording will start automatically. Speak your answer when it begins.",
            action: "Get ready to speak your response.",
            icon: Mic,
            color: "orange",
            showTimer: true,
          };
        }
      case "expired":
        return {
          title: "Time Complete",
          instruction:
            "Recording time has ended. Your response is being processed.",
          action: "Please wait while we submit your answer.",
          icon: Clock,
          color: "gray",
          showTimer: false,
        };

      case "stopped":
        return {
          title: "Response Submitted",
          instruction: "Your answer has been submitted successfully.",
          action: "Moving to the next question...",
          icon: CheckCircle,
          color: "green",
          showTimer: false,
        };

      default:
        return {
          title: "Preparing Question",
          instruction: "Loading question...",
          action: "Please wait.",
          icon: Clock,
          color: "gray",
          showTimer: false,
        };
    }
  };

  // Timer display component
  const TimerDisplay = () => {
    const instructions = getPhaseInstructions();

    if (!instructions.showTimer || timeLeft <= 0) {
      return null;
    }

    const getTimerState = () => {
      if (timeLeft <= 10) return "critical";
      if (timeLeft <= 30) return "warning";
      return "normal";
    };

    const timerState = getTimerState();
    const stateColors = {
      normal: "bg-blue-50 border-blue-200 text-blue-700",
      warning: "bg-amber-50 border-amber-200 text-amber-700",
      critical: "bg-red-50 border-red-200 text-red-700 animate-pulse",
    };

    return (
      <div className="flex justify-center mb-4">
        <div
          className={`flex items-center space-x-3 px-6 py-3 rounded-xl border-2 font-medium ${stateColors[timerState]}`}
        >
          <Clock className="w-5 h-5" />
          <div className="text-center">
            <div className="text-lg font-bold">{formatTime(timeLeft)}</div>
            <div className="text-xs opacity-75">
              {phase === "thinking"
                ? "Prep time remaining"
                : "Recording time remaining"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Instruction panel component
  const InstructionPanel = () => {
    const instructions = getPhaseInstructions();
    const IconComponent = instructions.icon;

    const colorClasses = {
      blue: "bg-blue-50 border-blue-200 text-blue-800",
      red: "bg-red-50 border-red-200 text-red-800",
      green: "bg-green-50 border-green-200 text-green-800",
      orange: "bg-orange-50 border-orange-200 text-orange-800",
      gray: "bg-gray-50 border-gray-200 text-gray-800",
      purple: "bg-purple-50 border-purple-200 text-purple-800",
    };
    return (
      <div
        className={`rounded-xl border-2 p-4 mb-6 ${
          colorClasses[instructions.color]
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">{instructions.title}</h3>
            <p className="text-base mb-2">{instructions.instruction}</p>
            <p className="text-sm font-medium opacity-80">
              {instructions.action}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-blue-200/50">
      <div className="space-y-6">
        {/* Phase Instructions */}
        <InstructionPanel />

        {/* Skip Thinking Button */}
        {phase === "thinking" && (
          <div className="flex justify-center">
            <button
              onClick={skipThinking}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center"
            >
              <FastForward className="w-4 h-4 mr-2" />
              Skip to Recording
            </button>
          </div>
        )}

        {/* Recording Indicator */}
        {recordingState === "recording" && phase === "responding" && (
          <div className="flex items-center justify-center space-x-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <span className="font-semibold text-red-700">
              Recording in progress...
            </span>
          </div>
        )}

        {/* Control Buttons OR Processing Message */}

        {phase === "responding" && (
          <>
            {forceSubmitting || recordingState === "submitting" ? (
              // Show only processing message when submitting
              <div className="flex items-center justify-center space-x-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                <span className="font-semibold text-purple-700">
                  Processing your answer...
                </span>
              </div>
            ) : (
              // Show control buttons when NOT submitting
              <div className="flex flex-wrap items-center justify-center gap-3">
                {/* Stop Recording */}
                {recordingState === "recording" && (
                  <button
                    onClick={stopRecording}
                    disabled={disabled}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50"
                  >
                    <Square className="w-4 h-4" />
                    <span>Stop Recording</span>
                  </button>
                )}

                {/* Record Again - Only show when complete (after stop) */}
                {recordingState === "complete" && audioBlob && (
                  <button
                    onClick={handleRecordAgain}
                    disabled={disabled}
                    className="flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm border-2 border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Record Again</span>
                  </button>
                )}

                {/* Play/Pause - Only show when complete (after stop) */}
                {audioUrl && recordingState === "complete" && (
                  <button
                    onClick={togglePlayback}
                    disabled={disabled}
                    className="flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
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

                {/* Submit - Show when recording OR when complete */}
                {(recordingState === "recording" ||
                  (audioBlob && recordingState === "complete")) && (
                  <button
                    onClick={handleManualSubmit}
                    disabled={disabled}
                    className="flex items-center space-x-2 px-8 py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Response</span>
                  </button>
                )}
              </div>
            )}
          </>
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
