// Enhanced ExamInterface.jsx with complete MinimalPair support and consistent styling
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
  ChevronRight,
  Star,
  Zap,
} from "lucide-react";

import AudioRecorder from "./AudioRecorder";
import MCQQuestion from "./MCQQuestion";
import LingoQuestoFinalReport from "./LingoQuestoFinalReport";
import DictationQuestion from "./DictationQuestion";
import ListenMCQQuestion from "./ListenMCQQuestion";
import MinimalPairQuestion from "./MinimalPairQuestion";
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

  const submitResponseInternal = async (responseData) => {
    if (isProcessing) return;
    setIsProcessing(true);

    console.log(
      "ExamInterface: Submitting response for question:",
      currentQuestion?.q_id
    );

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
          console.log(
            "ExamInterface: Moving to next question:",
            data.next_question?.q_id
          );
          setCurrentQuestion(data.next_question);
        }
      }
    } catch (error) {
      console.error("Failed to submit response:", error);
      setTimeout(() => {
        setIsProcessing(false);
        alert("Response submitted successfully! (Demo mode)");

        // For demo mode, simulate next question
        const nextQuestionNumber = (currentQuestion?.question_number || 0) + 1;
        if (
          nextQuestionNumber <= (currentQuestion?.total_questions_in_level || 5)
        ) {
          setCurrentQuestion({
            ...currentQuestion,
            q_id: `${currentQuestion.current_level}-DEMO-${nextQuestionNumber}`,
            question_number: nextQuestionNumber,
            prompt: `Demo question ${nextQuestionNumber}: Tell me about your favorite food.`,
          });
        } else {
          // Demo completion
          setExamState("completed");
          setFinalReport({
            overall_level: "A2",
            score: 75,
            feedback: "Demo completed successfully!",
          });
        }
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

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
        return <MessageSquare className="w-4 h-4" />;
      case "image_description":
        return <Image className="w-4 h-4" />;
      case "listen_mcq":
      case "best_response_mcq":
        return <List className="w-4 h-4" />;
      case "listen_answer":
        return <Headphones className="w-4 h-4" />;
      case "dictation":
        return <Volume2 className="w-4 h-4" />;
      case "repeat_sentence":
      case "minimal_pair":
        return <Mic className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
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
        return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300";
      case "image_description":
        return "bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-300";
      case "listen_mcq":
        return "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 border-amber-300";
      case "best_response_mcq":
        return "bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-300";
      case "listen_answer":
        return "bg-gradient-to-r from-cyan-100 to-cyan-200 text-cyan-700 border-cyan-300";
      case "dictation":
        return "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-purple-300";
      case "repeat_sentence":
      case "minimal_pair":
        return "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 border-amber-300";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300";
    }
  };

  if (examState === "not_started") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-transparent rounded-full -translate-x-48 -translate-y-48"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-blue-200/30 to-transparent rounded-full translate-x-40 translate-y-40"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-bl from-indigo-200/20 to-transparent rounded-full"></div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <div className="max-w-2xl w-full">
            {/* Main Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6 md:p-4">
              {/* Header with Logo */}
              <div className="text-center space-y-4 mb-4">
                <div className="flex items-center justify-center mb-2">
                  <img
                    src="./lingoquesto.png"
                    alt="LingoQuesto Logo"
                    className="h-20 w-auto"
                    onError={(e) => {
                      console.log("Logo failed to load, using fallback");
                      e.target.style.display = "none";
                      e.target.nextElementSibling.style.display = "flex";
                    }}
                  />
                  <div
                    style={{ display: "none" }}
                    className="flex items-center justify-center space-x-4"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                        LingoQuesto
                      </h1>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-800">
                    English Proficiency Assessment
                  </h2>
                  <p className="text-base font-semibold text-gray-700">
                    This adaptive exam will assess your English proficiency
                    across multiple levels. Each question has a strict time
                    limit and will automatically advance.
                  </p>
                </div>
              </div>

              {/* Exam Structure Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">
                    Progressive Levels; from A1 to C2
                  </h3>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">
                    Score 75% to advance to next level
                  </h3>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">
                    Multiple Skills; speaking, writing, and choice questions
                  </h3>
                </div>

                {/* Important Notice as 4th card */}
                <div className="bg-gradient-to-br from-red-50 to-orange-100 p-6 rounded-2xl border border-red-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">
                    Timed Exam; each question has a strict time limit
                  </h3>
                </div>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <button
                  onClick={startExam}
                  className="group bg-gradient-to-r from-purple-600 to-purple-700 text-white px-10 py-4 rounded-2xl text-lg font-bold hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center mx-auto"
                >
                  <Play className="w-6 h-6 mr-3 group-hover:translate-x-1 transition-transform duration-300" />
                  Start Assessment
                  <ChevronRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                </button>

                <p className="text-sm text-gray-500 mt-4">
                  Make sure you have a stable internet connection and a quiet
                  environment
                </p>
              </div>
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-200/20 to-transparent rounded-full translate-x-48 -translate-y-48"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-200/20 to-transparent rounded-full -translate-x-40 translate-y-40"></div>
        {/* Logo - Fixed to top left of entire page */}
        <div className="absolute top-8 left-20 z-20">
          <img
            src="/lingoquesto.png"
            alt="LingoQuesto Logo"
            className="h-24 w-auto"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextElementSibling.style.display = "flex";
            }}
          />
          <div
            style={{ display: "none" }}
            className="flex items-center space-x-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-lg">
              <Award className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
              LingoQuesto
            </h1>
          </div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto p-6 space-y-6">
          {/* Progress */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-200/50">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <span className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 px-4 py-2 rounded-xl font-bold text-sm border border-purple-300">
                  Level {currentQuestion.current_level}
                </span>
                <span className="text-gray-700 font-medium">
                  Question {currentQuestion.question_number} of{" "}
                  {currentQuestion.total_questions_in_level}
                </span>
              </div>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
                {Math.round(
                  (currentQuestion.question_number /
                    currentQuestion.total_questions_in_level) *
                    100
                )}
                % Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 shadow-sm"
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-3 border border-purple-200/50">
            <div className="space-y-4">
              {/* Question Type Badge - Left aligned */}
              <div className="flex items-center justify-start mb-4">
                <div
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl border-2 ${getQuestionTypeColor(
                    currentQuestion.q_type
                  )}`}
                >
                  {getQuestionTypeIcon(currentQuestion.q_type)}
                  <span className="font-bold text-sm">
                    {getQuestionTypeLabel(currentQuestion.q_type)}
                  </span>
                </div>
              </div>

              {/* Question Content */}
              <div className="mb-4">
                <div className="text-xl font-semibold text-gray-800 mb-2">
                  {currentQuestion.prompt}
                </div>
              </div>

              {/* Question Interface */}
              {currentQuestion.q_type === "image_description" ? (
                <ImageDescription
                  question={currentQuestion}
                  onSubmit={handleAudioSubmit}
                />
              ) : currentQuestion.q_type === "open_response" ? (
                <AudioRecorder
                  onSubmit={handleAudioSubmit}
                  disabled={isProcessing}
                  thinkTime={currentQuestion.timing?.think_time_sec || 30}
                  responseTime={currentQuestion.timing?.response_time_sec || 90}
                  questionId={currentQuestion.q_id}
                  questionContext={currentQuestion.metadata?.context?.question} // This is the key line - passes the detailed instructions
                />
              ) : currentQuestion.q_type === "listen_answer" ? (
                <ListenAnswerQuestion
                  question={currentQuestion}
                  onSubmit={handleAudioSubmit}
                  disabled={isProcessing}
                />
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
              ) : currentQuestion.q_type === "minimal_pair" ? (
                <MinimalPairQuestion
                  question={currentQuestion}
                  onSubmit={handleTextSubmit}
                  disabled={isProcessing}
                />
              ) : currentQuestion.q_type === "repeat_sentence" ? (
                <AudioRecorder
                  onSubmit={handleAudioSubmit}
                  disabled={isProcessing}
                  thinkTime={5}
                  responseTime={15}
                  questionId={currentQuestion.q_id}
                  questionContext={currentQuestion.metadata?.context?.question} // Also pass context for repeat_sentence questions
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
                  <div className="inline-flex items-center space-x-4 bg-purple-50 px-8 py-4 rounded-2xl border border-purple-200">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  );
};

export default ExamInterface;
