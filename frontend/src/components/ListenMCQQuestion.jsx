// ListenMCQQuestion.jsx - Complete version with consistent styling
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  CheckCircle,
  Headphones,
  Loader2,
  Send,
  Check,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";
import { useTimer } from "../contexts/TimerContext";
import { BRAND_PURPLE, BUTTON_STYLE } from "../config/theme";

const ListenMCQQuestion = ({ question, onSubmit, disabled }) => {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const audioRef = useRef(null);
  const MAX_PLAYS = 3;

  // Use global timer
  const { startTimer, stopTimer } = useTimer();

  const selectedRef = useRef("");
  useEffect(() => {
    selectedRef.current = selectedAnswer;
  }, [selectedAnswer]);

  useEffect(() => {
    const totalTime = question.timing?.total_estimated_sec || 30;

    startTimer({
      responseTime: totalTime,
      onTimeExpired: () => onSubmit(selectedRef.current || ""),
    });

    return () => {
      stopTimer();
    };
  }, [question.q_id, startTimer, stopTimer, onSubmit]);

  const handleAudioPlay = async () => {
    if (
      !audioRef.current ||
      isLoading ||
      isPlaying ||
      playCount >= MAX_PLAYS ||
      audioError
    )
      return;

    setIsLoading(true);
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setPlayCount((prev) => prev + 1);
    } catch (error) {
      console.error("Audio play error:", error);
      setAudioError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleAudioPlayStart = () => {
    setIsPlaying(true);
    setIsLoading(false);
    setAudioError(false);
  };

  const handleAudioError = (e) => {
    console.error("Audio failed to load:", audioUrl);
    setAudioError(true);
    setIsLoading(false);
    setIsPlaying(false);
  };

  const handleOptionChange = (value) => {
    if (!disabled) {
      setSelectedAnswer(value);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || disabled || submitting) return;
    setSubmitting(true);
    stopTimer();
    try {
      await onSubmit(selectedAnswer);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 1200);
    } finally {
      setSubmitting(false);
    }
  };

  const remainingPlays = MAX_PLAYS - playCount;
  const canPlay = remainingPlays > 0 && !disabled && !isPlaying && !audioError;

  // Get audio URL
  const audioFileName = question.metadata?.audioRef || question.audio_ref;
  const cleanAudioFileName = audioFileName?.startsWith("audio/")
    ? audioFileName.substring(6)
    : audioFileName;
  const audioUrl = cleanAudioFileName
    ? `${API_BASE_URL}/api/audio/${cleanAudioFileName}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Audio Player Section - Centered like MinimalPair */}
        <div className="flex flex-col items-center justify-center mb-8">
          {/* Main heading */}
          <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
            {question.prompt || "Listen and choose the correct answer"}
          </h1>

          {/* Micro-instructions */}
          <div className="mx-auto max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-2 mb-8">
            {[
              {
                icon: <Headphones className="w-4 h-4" />,
                text: "Listen carefully",
              },
              { icon: <Play className="w-4 h-4" />, text: "Up to 3 replays" },
              {
                icon: <CheckCircle className="w-4 h-4" />,
                text: "Choose best answer",
              },
            ].map((it, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm text-gray-700"
              >
                <span className="shrink-0 text-gray-600">{it.icon}</span>
                <span>{it.text}</span>
              </div>
            ))}
          </div>

          {/* Large play button */}
          <button
            onClick={handleAudioPlay}
            disabled={!canPlay || !audioUrl}
            className={[
              "relative w-36 h-36 rounded-full flex items-center justify-center transition-all",
              "shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none",
              !audioUrl || !canPlay
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-[--brand] text-white",
            ].join(" ")}
            style={{ ["--brand"]: BRAND_PURPLE }}
            aria-label="Play audio"
          >
            <span
              className={[
                "absolute inset-0 rounded-full",
                isPlaying ? "animate-ping bg-purple-300/40" : "hidden",
              ].join(" ")}
            />
            {isLoading ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : (
              <Play className="w-20 h-20 translate-x-1" />
            )}
          </button>

          {/* Replay dots + status */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_PLAYS }).map((_, idx) => (
                <span
                  key={idx}
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    idx < playCount ? "bg-gray-300" : "bg-purple-500",
                  ].join(" ")}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-gray-600 tracking-wider">
              {isPlaying
                ? "Playing…"
                : audioError
                ? "Audio unavailable"
                : isAudioReady
                ? `Replays left: ${remainingPlays}`
                : "Loading audio…"}
            </span>
          </div>

          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            preload="auto"
            className="hidden"
            onCanPlayThrough={() => setIsAudioReady(true)}
            onPlay={handleAudioPlayStart}
            onPause={() => setIsPlaying(false)}
            onEnded={handleAudioEnded}
            onError={() => {
              setAudioError(true);
              setIsAudioReady(false);
              setIsPlaying(false);
            }}
          >
            {audioUrl && (
              <>
                <source src={audioUrl} type="audio/wav" />
                <source src={audioUrl} type="audio/mp3" />
                <source src={audioUrl} type="audio/webm" />
                <source src={audioUrl} type="audio/m4a" />
              </>
            )}
          </audio>

          {/* Audio error message */}
          {audioError && (
            <div className="text-center mt-4">
              <p className="text-xs text-[#FF5454]">
                Audio could not be loaded. Please contact support if this
                persists.
              </p>
            </div>
          )}
        </div>

        {/* MCQ Options with label */}
        <div className="max-w-3xl mx-auto mb-6">
          <label className="mb-3 block text-sm font-semibold text-gray-700 text-center">
            {question.metadata?.question || "Select your answer"}
          </label>
          <div className="grid grid-cols-2 gap-4">
            {question.options?.map((option, index) => {
              const gradients = [
                "border-[#967AFE] bg-gradient-to-br from-[#967AFE]/10 to-[#9AD0F0]/10",
                "border-[#FFAF54] bg-gradient-to-br from-[#FFAF54]/10 to-[#FF82AC]/10",
                "border-[#48D19C] bg-gradient-to-br from-[#48D19C]/10 to-[#9AD0F0]/10",
                "border-[#FF82AC] bg-gradient-to-br from-[#FF82AC]/10 to-[#FFAF54]/10",
              ];

              const selectedGradient = gradients[index % gradients.length];

              return (
                <label
                  key={index}
                  className={[
                    "flex items-center justify-center gap-3 p-6 border-2 rounded-2xl cursor-pointer",
                    "transition-colors duration-200 text-center min-h-[92px] shadow-md",
                    selectedAnswer === option
                      ? "border-[--brand] bg-gradient-to-r from-purple-50 to-purple-100"
                      : "border-gray-200 hover:border-[--brand] hover:bg-gray-50 bg-white",
                    disabled ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                  style={{ ["--brand"]: BRAND_PURPLE }}
                >
                  <input
                    type="radio"
                    name={`listen-mcq-${question.q_id}`}
                    value={option}
                    checked={selectedAnswer === option}
                    onChange={(e) => handleOptionChange(e.target.value)}
                    disabled={disabled}
                    className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <span className="flex-1 text-gray-900 font-medium text-base leading-tight">
                    {option}
                  </span>
                  {selectedAnswer === option && (
                    <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* No Options Warning */}
        {(!question.options || question.options.length === 0) && (
          <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium">
              No answer options available for this question.
            </p>
          </div>
        )}

        {/* Submit Button - Right aligned like MinimalPair */}
        <div className="max-w-3xl mx-auto flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={disabled || !selectedAnswer || submitting}
            className={`${BUTTON_STYLE} ${
              disabled || !selectedAnswer || submitting
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[--brand]"
            }`}
            style={{ ["--brand"]: BRAND_PURPLE }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting…
              </>
            ) : submitted ? (
              <>
                <Check className="w-5 h-5" />
                Submitted
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListenMCQQuestion;
