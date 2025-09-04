// frontend/src/components/QuestionDisplay.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, List, Image, Volume2 } from "lucide-react";

const QuestionDisplay = ({ question }) => {
  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case "open_response":
        return <MessageSquare className="w-5 h-5" />;
      case "mcq":
        return <List className="w-5 h-5" />;
      case "image_description":
        return <Image className="w-5 h-5" />;
      case "listen_answer":
        return <Volume2 className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case "open_response":
        return "Speaking Question";
      case "mcq":
        return "Multiple Choice";
      case "image_description":
        return "Image Description";
      case "listen_answer":
        return "Listen & Answer";
      case "repeat_sentence":
        return "Repeat Sentence";
      case "dictation":
        return "Dictation";
      case "minimal_pair":
        return "Pronunciation";
      default:
        return "Question";
    }
  };

  const getQuestionTypeColor = (type) => {
    switch (type) {
      case "open_response":
        return "bg-blue-100 text-blue-800";
      case "mcq":
        return "bg-green-100 text-green-800";
      case "image_description":
        return "bg-purple-100 text-purple-800";
      case "listen_answer":
        return "bg-orange-100 text-orange-800";
      case "repeat_sentence":
        return "bg-yellow-100 text-yellow-800";
      case "dictation":
        return "bg-red-100 text-red-800";
      case "minimal_pair":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {/* Question Header */}
      <div className="flex items-center justify-between">
        <Badge
          className={`${getQuestionTypeColor(
            question.q_type
          )} flex items-center space-x-2`}
        >
          {getQuestionTypeIcon(question.q_type)}
          <span>{getQuestionTypeLabel(question.q_type)}</span>
        </Badge>

        <Badge variant="outline">
          Level {question.level || question.current_level}
        </Badge>
      </div>

      {/* Question Content */}
      <Card>
        <CardContent className="p-6">
          {/* Audio Reference (if present) */}
          {question.metadata?.audioRef && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800">
                <Volume2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Audio will be played before recording
                </span>
              </div>
            </div>
          )}

          {/* Image Reference (if present) */}
          {(question.metadata?.imageRef || question.image_ref) && (
            <div className="mb-4">
              <img
                src={`/images/${
                  question.metadata?.imageRef || question.image_ref
                }`}
                alt="Question image"
                className="w-full max-w-2xl mx-auto rounded-lg border shadow-lg"
                onError={(e) => {
                  console.error("Image failed to load:", e.target.src);
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}  

          {/* Question Prompt */}
          <div className="text-lg leading-relaxed">{question.prompt}</div>

          {/* Additional Context (for open response questions) */}
          {question.metadata?.context?.question &&
            question.metadata.context.question !== question.prompt && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Additional context:</strong>{" "}
                  {question.metadata.context.question}
                </p>
              </div>
            )}

          {/* Expected Response Time (for speaking questions) */}
          {(question.q_type === "open_response" ||
            question.q_type === "image_description") &&
            question.metadata && (
              <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-600">
                {question.metadata.think_time && (
                  <div className="flex items-center space-x-1">
                    <span>Think time:</span>
                    <span className="font-medium">
                      {question.metadata.think_time}s
                    </span>
                  </div>
                )}
                {question.metadata.response_time && (
                  <div className="flex items-center space-x-1">
                    <span>Response time:</span>
                    <span className="font-medium">
                      {question.metadata.response_time}s
                    </span>
                  </div>
                )}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionDisplay;
