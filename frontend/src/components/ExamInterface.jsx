// Enhanced ExamInterface.jsx with automatic timing
import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Award,
  Mic,
  Square,
  CheckCircle,
  Clock,
  MessageSquare,
  List,
  Volume2,
  Brain,
  Target,
  BookOpen,
  Headphones,
  Image,
  AlertTriangle,
  FastForward,
} from "lucide-react";
import AudioRecorder from "./AudioRecorder";
import MCQQuestion from "./MCQQuestion";
import LingoQuestoFinalReport from "./LingoQuestoFinalReport";
import DictationQuestion from "./DictationQuestion";
import ListenMCQQuestion from "./ListenMCQQuestion";
import ImageDescription from "./ImageDescription";
import { API_BASE_URL } from "../config/api";
import ListenAnswerQuestion from "./ListenAnswerQuestion";

const ExamInterface = () => {
  const [examState, setExamState] = useState("not_started");
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startExam = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/exam/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "user123" }),
      });

      const result = await response.json();
      if (result.success) {
        setSessionId(result.data.session_id);
        setCurrentQuestion(result.data.question);
        setExamState("in_progress");
      }
    } catch (error) {
      console.error("Failed to start exam:", error);
      // For demo, use mock data
      setSessionId("session123");
      setCurrentQuestion({
        q_id: "A1-OR-1",
        current_level: "A1",
        question_number: 1,
        total_questions_in_level: 5,
        q_type: "open_response",
        prompt:
          "Tell me about your hobbies. What do you like to do in your free time?",
        timing: {
          think_time_sec: 8,
          response_time_sec: 120,
          total_estimated_sec: 128,
        },
      });
      setExamState("in_progress");
    }
  };

  // Replace submitResponseInternal with this simpler version:
  const submitResponseInternal = async (responseData) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/exam/submit-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          q_id: currentQuestion.q_id,
          ...responseData,
        }),
      });

      const result = await response.json();
      if (result.success) {
        const data = result.data;
        if (data.exam_complete) {
          setFinalReport(data.final_report);
          setExamState("completed");
        } else {
          setCurrentQuestion(data.next_question);
        }
      }
    } catch (error) {
      console.error("Failed to submit response:", error);
      setTimeout(() => {
        setIsProcessing(false);
        alert("Response submitted successfully! (Demo mode)");
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Modified submit handlers that store response but don't submit immediately

  const handleAudioSubmit = async (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("session_id", sessionId);
    formData.append("q_id", currentQuestion.q_id);

    try {
      const uploadResponse = await fetch(`${API_BASE_URL}/api/upload-audio`, {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.success) {
        const responseData = {
          response_type: "audio",
          audio_file_path: uploadResult.file_path,
        };
        submitResponseInternal(responseData);
      }
    } catch (error) {
      console.error("Failed to upload audio:", error);
      const responseData = {
        response_type: "audio",
        audio_file_path: "mock_path",
      };
      submitResponseInternal(responseData);
    }
  };

  const handleTextSubmit = async (text) => {
    const responseData = {
      response_type: "text",
      response_data: text,
    };
    submitResponseInternal(responseData);
  };

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case "open_response":
        return <MessageSquare className="w-5 h-5" />;
      case "image_description":
        return <Image className="w-5 h-5" />;
      case "listen_mcq":
      case "best_response_mcq":
        return <List className="w-5 h-5" />;
      case "listen_answer":
        return <Headphones className="w-5 h-5" />;
      case "dictation":
        return <Volume2 className="w-5 h-5" />;
      case "repeat_sentence":
      case "minimal_pair":
        return <Mic className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case "open_response":
        return "Speaking Question";
      case "image_description":
        return "Image Description";
      case "listen_mcq":
        return "Listen & Choose";
      case "best_response_mcq":
        return "Best Response";
      case "listen_answer":
        return "Listen & Answer";
      case "dictation":
        return "Dictation";
      case "repeat_sentence":
        return "Repeat Sentence";
      case "minimal_pair":
        return "Pronunciation";
      default:
        return "Question";
    }
  };

  const getQuestionTypeColor = (type) => {
    switch (type) {
      case "open_response":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "image_description":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "listen_mcq":
      case "best_response_mcq":
        return "bg-green-100 text-green-800 border-green-200";
      case "listen_answer":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "dictation":
        return "bg-red-100 text-red-800 border-red-200";
      case "repeat_sentence":
      case "minimal_pair":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (examState === "not_started") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-10">
            <div className="text-center space-y-8">
              <div className="flex items-center justify-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  LingoQuesto
                </h1>
              </div>

              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                English Proficiency Assessment
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                This adaptive exam will assess your English proficiency across
                multiple levels. Each question has a strict time limit and will
                automatically advance.
              </p>

              <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-200">
                <h3 className="text-lg font-bold mb-4 text-red-800 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Important: Timed Exam
                </h3>
                <div className="text-sm text-red-700 space-y-2">
                  <p>• Each question has a strict time limit</p>
                  <p>• Questions advance automatically when time expires</p>
                  <p>• No pausing or going back to previous questions</p>
                  <p>• Prepare your answers quickly and efficiently</p>
                </div>
              </div>

              <button
                onClick={startExam}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-12 py-4 rounded-xl text-xl font-semibold hover:from-purple-700 hover:to-blue-700 flex items-center mx-auto transition-all transform hover:scale-105 shadow-lg"
              >
                <Play className="w-6 h-6 mr-3" />
                Start Timed Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (examState === "completed" && finalReport) {
    return <LingoQuestoFinalReport report={finalReport} />;
  }

  if (examState === "in_progress" && currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 pb-16">
        <div className="max-w-5xl mx-auto p-6 space-y-8 pb-24">
          {/* Header */}
          <div className="flex items-center justify-center space-x-4 py-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              LingoQuesto
            </h1>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-semibold">
                  Level {currentQuestion.current_level}
                </span>
                <span className="text-gray-600 font-medium">
                  Question {currentQuestion.question_number} of{" "}
                  {currentQuestion.total_questions_in_level}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {Math.round(
                  (currentQuestion.question_number /
                    currentQuestion.total_questions_in_level) *
                    100
                )}
                % Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    (currentQuestion.question_number /
                      currentQuestion.total_questions_in_level) *
                    100
                  }%`,
                }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 min-h-fit">
            <div className="space-y-6 pb-8">
              {/* Question Type Badge */}
              <div className="flex items-center justify-between">
                <div
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full border-2 ${getQuestionTypeColor(
                    currentQuestion.q_type
                  )}`}
                >
                  {getQuestionTypeIcon(currentQuestion.q_type)}
                  <span className="font-semibold">
                    {getQuestionTypeLabel(currentQuestion.q_type)}
                  </span>
                </div>
              </div>

              {/* Question Interface */}
              {currentQuestion.q_type === "image_description" ? (
                <ImageDescription
                  question={currentQuestion}
                  onSubmit={handleAudioSubmit}
                />
              ) : currentQuestion.q_type === "open_response" ? (
                <>
                  <div className="mb-6">
                    <div className="text-xl font-medium text-gray-800 mb-4">
                      {currentQuestion.prompt}
                    </div>
                    {currentQuestion.metadata?.context?.question &&
                      currentQuestion.metadata.context.question !==
                        currentQuestion.prompt && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-800 text-sm">
                            <strong>Additional context:</strong>{" "}
                            {currentQuestion.metadata.context.question}
                          </p>
                        </div>
                      )}
                  </div>
                  <AudioRecorder
                    onSubmit={handleAudioSubmit}
                    disabled={isProcessing}
                    thinkTime={currentQuestion.timing?.think_time_sec || 30}
                    responseTime={
                      currentQuestion.timing?.response_time_sec || 90
                    }
                    questionId={currentQuestion.q_id}
                  />
                </>
              ) : currentQuestion.q_type === "listen_answer" ? (
                <>
                  <div className="mb-6">
                    <div className="text-xl font-medium text-gray-800 mb-4">
                      {currentQuestion.prompt}
                    </div>
                    {currentQuestion.metadata?.context?.question && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 text-sm">
                          <strong>Instructions:</strong>{" "}
                          {currentQuestion.metadata.context.question}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Audio Player for Listen Answer */}
                  {currentQuestion.metadata?.audioRef && (
                    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-center space-x-4 mb-4">
                        <Volume2 className="w-6 h-6 text-blue-600" />
                        <span className="font-medium text-blue-800">
                          Listen to the question first:
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <audio
                          controls
                          className="w-full max-w-md"
                          src={`${API_BASE_URL}/api/audio/${currentQuestion.metadata.audioRef}`}
                          onError={(e) => console.error("Audio error:", e)}
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                      <p className="text-center text-sm text-blue-700 mt-2">
                        Listen carefully, then record your response below
                      </p>
                    </div>
                  )}

                  <AudioRecorder
                    onSubmit={handleAudioSubmit}
                    disabled={isProcessing}
                    thinkTime={currentQuestion.timing?.think_time_sec || 5}
                    responseTime={
                      currentQuestion.timing?.response_time_sec || 25
                    }
                    questionId={currentQuestion.q_id}
                  />
                </>
              ) : currentQuestion.q_type === "dictation" ? (
                <DictationQuestion
                  question={currentQuestion}
                  onSubmit={handleTextSubmit}
                  disabled={isProcessing}
                />
              ) : currentQuestion.q_type === "listen_mcq" ? (
                <ListenMCQQuestion
                  question={currentQuestion}
                  onSubmit={handleTextSubmit}
                  disabled={isProcessing}
                />
              ) : (
                <MCQQuestion
                  question={currentQuestion}
                  onSubmit={handleTextSubmit}
                  disabled={isProcessing}
                />
              )}

              {isProcessing && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-4 bg-gradient-to-r from-purple-50 to-blue-50 px-8 py-4 rounded-xl border border-purple-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="text-lg font-semibold text-purple-700">
                      Processing your response...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );
};

export default ExamInterface;
