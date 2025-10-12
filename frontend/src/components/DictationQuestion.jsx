// DictationQuestion.jsx – Tailwind-upgraded UI (drop-in)
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Check, Loader2, Headphones, Send } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import TextInput from "./TextInput";
import { useTimer } from "../contexts/TimerContext";
import { BRAND_PURPLE, BUTTON_STYLE } from "../config/theme";

const DictationQuestion = ({ question, onSubmit, disabled }) => {
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const audioRef = useRef(null);
  const textInputRef = useRef(null);
  const MAX_PLAYS = 3;

  const { startTimer, stopTimer} = useTimer();

  const getCurrentInput = useCallback(
    () => textInputRef.current?.value || "",
    []
  );

  const handleAutoSubmit = useCallback(() => {
    const current = getCurrentInput().trim();
    onSubmit(current);
  }, [getCurrentInput, onSubmit]);

  // Start/cleanup timer for this question
  useEffect(() => {
    const totalTime = question.timing?.total_estimated_sec || 30;
    startTimer({ responseTime: totalTime, onTimeExpired: handleAutoSubmit });
    return () => stopTimer();
  }, [question.audio_ref, startTimer, stopTimer, handleAutoSubmit]);

  // Reset state on question change
  useEffect(() => {
    setUserInput("");
    setIsPlaying(false);
    setPlayCount(0);
    setIsLoading(false);
    setIsAudioReady(false);
    setSubmitting(false);
    setSubmitted(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [question.audio_ref]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
    if (textInputRef.current) textInputRef.current.value = e.target.value;
  };

  const handleAudioPlay = async () => {
    if (!audioRef.current || isLoading || isPlaying || playCount >= MAX_PLAYS)
      return;
    setIsLoading(true);
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setPlayCount((p) => p + 1);
    } catch (e) {
      console.error("Audio play error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (disabled || submitting) return;
    setSubmitting(true);
    stopTimer();
    try {
      await onSubmit(getCurrentInput().trim());
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 1200);
    } finally {
      setSubmitting(false);
    }
  };

  const remainingPlays = Math.max(0, MAX_PLAYS - playCount);
  const canPlay = remainingPlays > 0 && !disabled && !isPlaying && isAudioReady;

  const audioFileName = question.metadata?.audioRef || question.audio_ref;
  const clean = audioFileName?.startsWith("audio/")
    ? audioFileName.slice(6)
    : audioFileName;
  const audioUrl = clean ? `${API_BASE_URL}/api/audio/${clean}` : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Title */}
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
          {question?.prompt || "Type what you hear!"}
        </h1>

        {/* micro-instructions */}
        <div className="mx-auto max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-2 mb-8">
          {[
            {
              icon: <Headphones className="w-4 h-4" />,
              text: "Listen carefully",
            },
            { icon: <Play className="w-4 h-4" />, text: "Up to 3 replays" },
            {
              icon: <Send className="w-4 h-4" />,
              text: "Type exactly & submit",
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

        {/* Play section */}
        <div className="flex flex-col items-center justify-center mb-8">
          <button
            onClick={handleAudioPlay}
            disabled={!canPlay}
            className={[
              "relative w-36 h-36 rounded-full flex items-center justify-center transition-all",
              "shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none",
              canPlay
                ? "bg-[--brand] text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed",
            ].join(" ")}
            style={{ ["--brand"]: BRAND_PURPLE }}
            aria-label="Play audio"
          >
            {/* radial glow when playing */}
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
                : isAudioReady
                ? `Replays left: ${remainingPlays}`
                : "Loading audio…"}
            </span>
          </div>

          {/* hidden audio */}
          <audio
            ref={audioRef}
            preload="auto"
            className="hidden"
            onCanPlayThrough={() => setIsAudioReady(true)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setIsAudioReady(false);
              setIsPlaying(false);
            }}
          >
            {audioUrl && (
              <>
                <source src={audioUrl} type="audio/m4a" />
                <source src={audioUrl} type="audio/webm" />
                <source src={audioUrl} type="audio/mp3" />
                <source src={audioUrl} type="audio/wav" />
              </>
            )}
          </audio>
        </div>

        {/* Input */}
        <div className="max-w-3xl mx-auto">
          <label
            htmlFor="dictation-input"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Your transcription
          </label>
          <TextInput
            id="dictation-input"
            ref={textInputRef}
            value={userInput}
            onChange={handleInputChange}
            placeholder="Type the sentence you heard here…"
            disabled={disabled || submitting}
            rows={3}
            showCharCount={false}
            className="text-lg rounded-2xl w-full px-5 py-4 border-2 border-gray-200 bg-white
                       focus:border-[--brand] focus:ring-4 focus:ring-purple-200/60"
            style={{ ["--brand"]: BRAND_PURPLE }}
            onFocus={(e) => e.target.select?.()}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
            onPaste={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>

        {/* Submit */}
        <div className="max-w-3xl mx-auto mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={disabled || userInput.trim().length === 0 || submitting}
            className={`${BUTTON_STYLE} ${
              disabled || userInput.trim().length === 0 || submitting
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

export default DictationQuestion;
