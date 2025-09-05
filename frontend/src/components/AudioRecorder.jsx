// AudioRecorder.jsx - Single page with modern UI
import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Play, Pause, Clock, Send, RotateCcw } from "lucide-react";

const AudioRecorder = ({
  onSubmit,
  disabled,
  thinkTime = 5,
  responseTime = 120,
  questionId,
}) => {
  const [phase, setPhase] = useState("thinking");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);

  // Auto-start when question loads
  useEffect(() => {
    console.log("Question changed to:", questionId);
    resetAndStart();
  }, [questionId]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
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
  };

  const resetAndStart = () => {
    cleanup();
    setPhase("thinking");
    setTimeLeft(thinkTime);
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    chunksRef.current = [];
    startThinkingPhase();
  };

  const startThinkingPhase = () => {
    setPhase("thinking");
    startTimer(thinkTime, () => {
      startRecording();
    });
  };

  const startTimer = (duration, onComplete) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeLeft(duration);

    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;

        if (newTime <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          if (onComplete) onComplete();
          return 0;
        }
        return newTime;
      });
    }, 1000);
  };

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

  const startRecording = async () => {
    try {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.log("Previous recorder already stopped");
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(),
      });

      chunksRef.current = [];
      const mimeType = getBestAudioFormat();
      const recorderOptions = mimeType ? { mimeType } : {};

      mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const totalSize = chunksRef.current.reduce(
          (total, chunk) => total + chunk.size,
          0
        );

        if (totalSize > 0) {
          const blob = new Blob(chunksRef.current, {
            type: mimeType || "audio/webm",
          });

          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }

          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setPhase("recording");

      // Start response timer
      startTimer(responseTime, () => {
        // Timer expired, auto-submit
        handleSubmit();
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Unable to access microphone.");
      setPhase("thinking");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
    }
  };

  const startNewRecording = async () => {
    // Clear previous recording
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setIsPlaying(false);

    // Start fresh recording
    await startRecording();
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);

    // Stop any active recording first
    if (isRecording && mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
    }

    // Clear the timer since we're submitting
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Submit immediately
    setTimeout(() => {
      if (audioBlob) {
        onSubmit(audioBlob);
      } else if (chunksRef.current.length > 0) {
        const mimeType = getBestAudioFormat();
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        onSubmit(blob);
      } else {
        onSubmit(null);
      }
    }, 100);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
      <div className="text-center space-y-8">
        {/* Timer - Always visible */}
        <div className="flex items-center justify-center space-x-3">
          <Clock
            className={`w-6 h-6 ${
              phase === "thinking"
                ? "text-yellow-600"
                : timeLeft <= 10
                ? "text-red-600"
                : "text-blue-600"
            }`}
          />
          <span
            className={`text-3xl font-mono font-bold ${
              phase === "thinking"
                ? "text-yellow-600"
                : timeLeft <= 10
                ? "text-red-600"
                : "text-blue-600"
            }`}
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Phase Display */}
        <div
          className={`text-xl font-semibold ${
            phase === "thinking" ? "text-yellow-600" : "text-gray-700"
          }`}
        >
          {phase === "thinking"
            ? "Think About Your Answer..."
            : "Recording Your Response"}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-3 text-red-600">
            <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
            <span className="font-semibold">Recording in progress...</span>
          </div>
        )}

        {/* Control Buttons - Enhanced Design */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* Record/Stop Button */}
          {phase !== "thinking" && (
            <button
              onClick={isRecording ? stopRecording : startNewRecording}
              disabled={disabled}
              className={`
                flex items-center space-x-3 px-8 py-4 rounded-xl font-semibold text-lg
                transition-all duration-300 transform hover:scale-105 shadow-lg
                ${
                  isRecording
                    ? "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                }
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              `}
            >
              {isRecording ? (
                <>
                  <Square className="w-6 h-6" />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6" />
                  <span>{audioBlob ? "Record Again" : "Start Recording"}</span>
                </>
              )}
            </button>
          )}

          {/* Play Button */}
          {audioUrl && phase !== "thinking" && (
            <button
              onClick={playAudio}
              className="
                flex items-center space-x-3 px-6 py-4 rounded-xl font-semibold text-lg
                border-2 border-purple-300 text-purple-700 hover:bg-purple-50 
                transition-all duration-300 transform hover:scale-105
              "
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Play Recording</span>
                </>
              )}
            </button>
          )}

          {/* Submit Button */}
          {phase !== "thinking" && (audioBlob || isRecording) && (
            <button
              onClick={handleSubmit}
              disabled={disabled}
              className="
                flex items-center space-x-3 px-8 py-4 rounded-xl font-semibold text-lg
                bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 
                text-white transition-all duration-300 transform hover:scale-105 shadow-lg
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              "
            >
              <Send className="w-5 h-5" />
              <span>Submit Response</span>
            </button>
          )}
        </div>

        {/* Instructions */}
        <div
          className={`p-6 rounded-xl border-2 ${
            phase === "thinking"
              ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200"
              : isRecording
              ? "bg-gradient-to-r from-red-50 to-pink-50 border-red-200"
              : isSubmitting
              ? "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
          }`}
        >
          <p
            className={`font-medium ${
              phase === "thinking"
                ? "text-yellow-800"
                : isRecording
                ? "text-red-800"
                : isSubmitting
                ? "text-gray-700"
                : "text-blue-800"
            }`}
          >
            {phase === "thinking"
              ? "Thinking time: Prepare your answer. Recording will start automatically."
              : isSubmitting
              ? "Submitting your response..."
              : isRecording
              ? "Recording now: Speak clearly into your microphone. You can stop early or submit directly."
              : audioBlob
              ? "Recording complete: You can play your recording, record again, or submit."
              : "Ready to record your response."}
          </p>
        </div>

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
