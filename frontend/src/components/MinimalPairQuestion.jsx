// MinimalPairQuestion.jsx – fixed audio gating, stable layout, consistent spacing
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Headphones, Play, CheckCircle, Loader2, Send, Check } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import { useTimer } from "../contexts/TimerContext";

const BRAND_PURPLE = "#967AFE";
const MAX_PLAYS = 3;

const MinimalPairQuestion = ({ question, onSubmit, disabled }) => {
  // UI state
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const audioRef = useRef(null);
  const selectedRef = useRef("");

  // Keep latest selection for autosubmit
  useEffect(() => {
    selectedRef.current = selectedAnswer;
  }, [selectedAnswer]);

  // ----- Timer -----
  const { startTimer, stopTimer } = useTimer();
  useEffect(() => {
    const totalTime = question?.timing?.total_estimated_sec || 30;
    startTimer({
      responseTime: totalTime,
      onTimeExpired: () => onSubmit(selectedRef.current || ""),
    });
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.q_id]);

  // ----- Audio URL + MIME detection -----
  const audioFileName = (question?.metadata?.audioRef || question?.audio_ref || "").trim();
  const cleanAudioFileName = audioFileName.replace(/^audio\//, "");
  const audioUrl = cleanAudioFileName ? `${API_BASE_URL}/api/audio/${cleanAudioFileName}` : null;
  const ext = cleanAudioFileName?.split(".").pop()?.toLowerCase();
  const mimeByExt = { mp3: "audio/mpeg", wav: "audio/wav", webm: "audio/webm", m4a: "audio/mp4" };
  const mimeType = mimeByExt[ext] || undefined;

  // Reset audio state when question changes
  useEffect(() => {
    setIsPlaying(false);
    setPlayCount(0);
    setIsLoading(false);
    setAudioError(false);
    setIsAudioReady(false);
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.load();
      } catch {}
    }
  }, [question?.q_id]);

  // Handlers
  const handleAudioPlay = async () => {
    if (!audioRef.current) return;
    if (isLoading || isPlaying || playCount >= MAX_PLAYS || audioError) return;

    setIsLoading(true);
    try {
      // Ensure we start from the beginning
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

  const handleOptionChange = (value) => {
    if (!disabled) setSelectedAnswer(value);
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

  const remainingPlays = Math.max(0, MAX_PLAYS - playCount);
  // Only allow play when we actually have a URL and the audio is ready to go
  const canPlay = !!audioUrl && isAudioReady && remainingPlays > 0 && !disabled && !isPlaying && !audioError;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Title */}
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
          {question?.prompt || "Which word did you hear?"}
        </h1>

        {/* Micro-instructions */}
        <div className="mx-auto max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-2 mb-8">
          {[
            { icon: <Headphones className="w-4 h-4" />, text: "Listen carefully" },
            { icon: <Play className="w-4 h-4" />, text: "Up to 3 replays" },
            { icon: <CheckCircle className="w-4 h-4" />, text: "Choose what you heard" },
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

        {/* Play section */}
        <div className="flex flex-col items-center justify-center mb-8">
          <button
            onClick={handleAudioPlay}
            disabled={!canPlay}
            className={[
              "relative w-36 h-36 rounded-full flex items-center justify-center transition-all",
              "shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none",
              canPlay ? "bg-[--brand] text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed",
            ].join(" ")}
            style={{ ["--brand"]: BRAND_PURPLE }}
            aria-label="Play audio"
            title={!audioUrl ? "Audio not available" : (isAudioReady ? "" : "Loading audio…")}
          >
            {/* radial glow when playing */}
            <span
              className={["absolute inset-0 rounded-full", isPlaying ? "animate-ping bg-purple-300/40" : "hidden"].join(
                " "
              )}
            />
            {isLoading ? <Loader2 className="w-12 h-12 animate-spin" /> : <Play className="w-20 h-20 translate-x-1" />}
          </button>

          {/* Replay dots + status */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_PLAYS }).map((_, idx) => (
                <span
                  key={idx}
                  className={["h-2.5 w-2.5 rounded-full", idx < playCount ? "bg-gray-300" : "bg-purple-500"].join(" ")}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-gray-600 tracking-wider">
              {audioError
                ? "Audio unavailable"
                : isPlaying
                ? "Playing…"
                : isAudioReady
                ? `Replays left: ${remainingPlays}`
                : audioUrl
                ? "Loading audio…"
                : "Audio unavailable"}
            </span>
          </div>

          {/* Hidden audio element – single src for reliability */}
          {audioUrl && (
            <audio
              key={audioUrl} // force reload when URL changes
              ref={audioRef}
              preload="auto"
              className="hidden"
              crossOrigin="anonymous"
              src={audioUrl}
              {...(mimeType ? { type: mimeType } : {})}
              onCanPlayThrough={() => {
                setIsAudioReady(true);
                setAudioError(false);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={() => {
                setAudioError(true);
                setIsAudioReady(false);
                setIsPlaying(false);
              }}
            />
          )}
        </div>

        {/* Options */}
        <div className="max-w-3xl mx-auto mb-6">
          <label className="mb-3 block text-sm font-semibold text-gray-700 text-center">
            Select the word you heard
          </label>
          <div className="grid grid-cols-2 gap-4">
            {(question?.metadata?.options || []).map((option, index) => (
              <label
                key={index}
                className={[
                  // fixed metrics to avoid layout shift on select
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
                  name={`minimal-pair-${question?.q_id}`}
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={(e) => handleOptionChange(e.target.value)}
                  disabled={disabled}
                  className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="flex-1 text-gray-900 font-semibold text-2xl">{option}</span>
                {selectedAnswer === option && <CheckCircle className="w-6 h-6 text-purple-600" />}
              </label>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="max-w-3xl mx-auto flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={disabled || !selectedAnswer || submitting}
            className={[
              "inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-bold text-white transition-all",
              "shadow-lg hover:shadow-xl hover:scale-[1.02] focus:outline-none",
              disabled || !selectedAnswer || submitting ? "bg-gray-300 cursor-not-allowed" : "bg-[--brand]",
            ].join(" ")}
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

export default MinimalPairQuestion;
