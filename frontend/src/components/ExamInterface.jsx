// frontend/src/components/ExamInterface.jsx
import React, { useState } from "react";
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
} from "lucide-react";
import AudioRecorder from "./AudioRecorder";
import MCQQuestion from "./MCQQuestion";
import LingoQuestoFinalReport from "./LingoQuestoFinalReport";
import DictationQuestion from "./DictationQuestion";
import ListenMCQQuestion from "./ListenMCQQuestion";
import ImageDescription from "./ImageDescription";
import { API_BASE_URL } from "../config/api";

const ExamInterface = () => {
  const [examState, setExamState] = useState("not_started");
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  // Mock current question for demo
  const mockQuestion = {
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
      setCurrentQuestion(mockQuestion);
      setExamState("in_progress");
    }
  };

  // In your ExamInterface.jsx, replace the submitResponse function with this:

  const submitResponse = async (responseData) => {
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/exam/submit-response`, {
        // Added API_BASE_URL
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
      // For demo, show success message
      setTimeout(() => {
        setIsProcessing(false);
        alert("Response submitted successfully! (Demo mode)");
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Also fix the handleAudioSubmit function:
  const handleAudioSubmit = async (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("session_id", sessionId);
    formData.append("q_id", currentQuestion.q_id);

    try {
      const uploadResponse = await fetch(`${API_BASE_URL}/api/upload-audio`, {
        // Added API_BASE_URL
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.success) {
        await submitResponse({
          response_type: "audio",
          audio_file_path: uploadResult.file_path,
        });
      }
    } catch (error) {
      console.error("Failed to upload audio:", error);
      await submitResponse({
        response_type: "audio",
        audio_file_path: "mock_path",
      });
    }
  };

  const handleTextSubmit = async (text) => {
    await submitResponse({
      response_type: "text",
      response_data: text,
    });
  };

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case "open_response":
        return <MessageSquare className="w-5 h-5" />;
      case "image_description":
        return <Image className="w-5 h-5" />;
      case "mcq":
        return <List className="w-5 h-5" />;
      case "listen_mcq":
        return <Headphones className="w-5 h-5" />;
      case "dictation":
        return <Volume2 className="w-5 h-5" />;
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
      case "mcq":
        return "Multiple Choice";
      case "listen_mcq":
        return "Listen & Choose";
      case "dictation":
        return "Dictation";
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
      case "mcq":
        return "bg-green-100 text-green-800 border-green-200";
      case "listen_mcq":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "dictation":
        return "bg-red-100 text-red-800 border-red-200";
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
              {/* Header */}
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
                multiple levels. The exam will automatically adjust based on
                your performance.
              </p>

              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-8 rounded-xl border border-purple-200">
                <h3 className="text-xl font-bold mb-6 text-gray-800">
                  Exam Structure:
                </h3>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-purple-600" />
                    </div>
                    <span className="font-semibold text-center">
                      Progressive levels from A1 to C2
                    </span>
                  </div>
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="font-semibold text-center">
                      75% score required to advance
                    </span>
                  </div>
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Brain className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="font-semibold text-center">
                      Speaking, listening, and multiple choice questions
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={startExam}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-12 py-4 rounded-xl text-xl font-semibold hover:from-purple-700 hover:to-blue-700 flex items-center mx-auto transition-all transform hover:scale-105 shadow-lg"
              >
                <Play className="w-6 h-6 mr-3" />
                Start Assessment
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

                {/* Timing info for different question types */}
                {currentQuestion.timing && (
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    {(currentQuestion.q_type === "open_response" ||
                      currentQuestion.q_type === "image_description") && (
                      <>
                        {currentQuestion.timing.think_time_sec && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              Think: {currentQuestion.timing.think_time_sec}s
                            </span>
                          </div>
                        )}
                        {currentQuestion.timing.response_time_sec && (
                          <div className="flex items-center space-x-1">
                            <Mic className="w-4 h-4" />
                            <span>
                              Record: {currentQuestion.timing.response_time_sec}
                              s
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {(currentQuestion.q_type === "listen_mcq" ||
                      currentQuestion.q_type === "dictation") && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          Time limit:{" "}
                          {currentQuestion.timing.response_time_sec || 25}s
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Question Interface - Clean routing */}
              {currentQuestion.q_type === "image_description" ? (
                <ImageDescription
                  question={currentQuestion}
                  onSubmit={handleAudioSubmit}
                  disabled={isProcessing}
                />
              ) : currentQuestion.q_type === "open_response" ? (
                <>
                  {/* Simple open response - just prompt and audio recorder */}
                  <div className="mb-6">
                    <div className="text-xl font-medium text-gray-800 mb-4">
                      {currentQuestion.prompt}
                    </div>

                    {/* Additional Context */}
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
                      currentQuestion.timing?.response_time_sec || 120
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
