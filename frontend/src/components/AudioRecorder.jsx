// AudioRecorder.jsx - Clean rewrite with clear phase guidance
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Send, Brain, Clock, CheckCircle } from "lucide-react";
import { useTimer } from "../contexts/TimerContext";

const AudioRecorder = ({
  onSubmit,
  disabled,
  thinkTime = 5,
  responseTime = 120,
  questionId,
  questionContext = null,
  forceSubmitting = false,
  onAudioLevelChange,
  noMinimumTime = false,
}) => {
  // State
  const [recordingState, setRecordingState] = useState("idle");
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const animationFrameRef = useRef(null);

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

  useEffect(() => {
    if (!navigator.mediaDevices) {
      console.error("Microphone not supported");
      setRecordingState("error");
    }
  }, []);

  useEffect(() => {
    if (onAudioLevelChange) {
      onAudioLevelChange(audioLevel);
    }
  }, [audioLevel, onAudioLevelChange]);

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

  const setupAudioAnalyzer = useCallback(() => {
    if (!streamRef.current) return;

    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(streamRef.current);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 256;
    microphone.connect(analyser);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average);
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
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

const submitDisabled =
  disabled || (!noMinimumTime && responseTime > 30 && timeLeft > responseTime - 30);

  // Cleanup media resources
  const cleanupResources = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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
      setupAudioAnalyzer();
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

  return (
    <div>
      {/* Single Action Button - THINKING PHASE */}
      {phase === "thinking" && (
        <div className="flex justify-end">
          <button
            onClick={skipThinking}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-bold text-white transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] focus:outline-none bg-[#967AFE] disabled:opacity-50"
          >
            <Mic className="w-5 h-5" />
            Record Now
          </button>
        </div>
      )}

      {/* RESPONDING PHASE - Submit Button */}
      {phase === "responding" && (
        <>
          {/* Single Submit Button - NO countdown, just stable message */}
          {!forceSubmitting && recordingState !== "submitting" && (
            <div className="flex justify-end">
              <button
                onClick={handleManualSubmit}
                disabled={submitDisabled}
                className={[
                  "inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-bold text-white transition-all",
                  "shadow-lg hover:shadow-xl hover:scale-[1.02] focus:outline-none",
                  submitDisabled
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-[#967AFE]",
                ].join(" ")}
                title={
                  timeLeft > responseTime - 30
                    ? "You can submit after 30 seconds of recording"
                    : ""
                }
              >
                <Send className="w-5 h-5" />
                {responseTime > 30 && timeLeft > responseTime - 30
                  ? "You can submit after 30 seconds"
                  : "Submit"}
              </button>
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
  );
};

export default AudioRecorder;
