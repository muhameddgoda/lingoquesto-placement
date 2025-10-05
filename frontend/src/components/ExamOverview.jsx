// ExamOverview.jsx
import React from 'react';
import { 
  Mic, 
  Headphones, 
  MessageSquare, 
  Image,
  Volume2,
  CheckCircle,
  ChevronRight,
  Target,
  Clock,
  Award
} from 'lucide-react';

const ExamOverview = ({ onContinue }) => {
  const questionTypes = [
    {
      icon: Mic,
      title: "Speaking Questions",
      description: "Record your spoken responses using your microphone",
      types: ["Open Response", "Image Description", "Listen & Answer", "Repeat Sentences"],
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: MessageSquare,
      title: "Writing Questions",
      description: "Type your answers using the keyboard",
      types: ["Dictation", "Fill in the blanks"],
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: CheckCircle,
      title: "Multiple Choice",
      description: "Select the best answer from the options provided",
      types: ["Listen & Choose", "Best Response", "Pronunciation Recognition"],
      color: "from-green-500 to-green-600"
    },
    {
      icon: Headphones,
      title: "Listening Questions",
      description: "Listen carefully to audio clips before responding",
      types: ["Audio comprehension", "Minimal pairs", "Conversation sequences"],
      color: "from-amber-500 to-amber-600"
    }
  ];

  const evaluationCriteria = [
    {
      icon: Volume2,
      title: "Pronunciation",
      description: "Clarity, accent, and sound accuracy"
    },
    {
      icon: Clock,
      title: "Fluency",
      description: "Speech flow, pace, and naturalness"
    },
    {
      icon: Target,
      title: "Grammar",
      description: "Sentence structure and accuracy"
    },
    {
      icon: Award,
      title: "Vocabulary",
      description: "Word choice and range"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      <div className="relative z-10 max-w-5xl mx-auto p-2 py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/50 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            Question Types You'll Encounter
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionTypes.map((type, index) => {
              const IconComponent = type.icon;
              return (
                <div 
                  key={index}
                  className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${type.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 mb-2">{type.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {type.types.map((t, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/50 mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
              <Target className="w-5 h-5 text-white" />
            </div>
            How You'll Be Evaluated
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {evaluationCriteria.map((criterion, index) => {
              const IconComponent = criterion.icon;
              return (
                <div 
                  key={index}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 text-center"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">{criterion.title}</h3>
                  <p className="text-sm text-gray-600">{criterion.description}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="text-center">
          <button
            onClick={onContinue}
            className="group bg-gradient-to-r from-purple-600 to-purple-700 text-white px-10 py-4 rounded-2xl text-lg font-bold hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center mx-auto"
          >
            I'm Ready to Begin
            <ChevronRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
          </button>
          <p className="text-sm text-gray-500 mt-4">
            The assessment will begin immediately after you click this button
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExamOverview;