import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, AlertCircle, CheckCircle, Download, RotateCcw, ChevronDown, ChevronUp, Volume2, Brain, Star, Zap, Target, BookOpen } from 'lucide-react';

const LingoQuestoFinalReport = ({ report }) => {
  const [expandedSections, setExpandedSections] = useState({});
  const [animatedScore, setAnimatedScore] = useState(0);

  // Mock report data for demonstration
  const mockReport = report || {
    overall_performance: { 
      overall_score: 25,
      points_earned: 750,
      points_possible: 3000
    },
    exam_progress: { 
      highest_level_attempted: "A1",
      questions_attempted: 7,
      total_questions_available: 30
    },
    skill_breakdown: {
      pronunciation: { 
        percentage: 23.8,
        points_earned: 257.1,
        points_possible: 1080.0
      },
      fluency: { 
        percentage: 4.1,
        points_earned: 35.3,
        points_possible: 860.0
      },
      grammar: { 
        percentage: 16.0,
        points_earned: 84.8,
        points_possible: 530.0
      },
      vocabulary: { 
        percentage: 16.2,
        points_earned: 85.9,
        points_possible: 530.0
      }
    },
    level_details: [{
      level: "A1",
      average_score: 62,  // This is the level-specific score
      passed_threshold: false,
      skill_breakdown: {
        pronunciation: 23.8,
        fluency: 4.1,
        grammar: 16.0,
        vocabulary: 16.2
      },
      questions: [{
        question_info: { original_type: 'open_response' },
        q_id: 'A1-OR-1',
        evaluation_details: {
          transcription: "Oh, my family members are awesome. We're four siblings and my parents. My parents are teachers. And we are three brothers and my sister.",
          word_phoneme_data: [
            {
              word: "my",
              phonemes: [
                { ipa: "m", score: 100, confidence: 0.95, expected_ipa: "m", actual_ipa: "m" },
                { ipa: "aÉª", score: 100, confidence: 0.98, expected_ipa: "aÉª", actual_ipa: "aÉª" }
              ]
            },
            {
              word: "family",
              phonemes: [
                { ipa: "f", score: 100, confidence: 0.92, expected_ipa: "f", actual_ipa: "f" },
                { ipa: "Ã¦", score: 100, confidence: 0.89, expected_ipa: "Ã¦", actual_ipa: "Ã¦" },
                { ipa: "m", score: 100, confidence: 0.94, expected_ipa: "m", actual_ipa: "m" },
                { ipa: "l", score: 100, confidence: 0.97, expected_ipa: "l", actual_ipa: "l" },
                { ipa: "i", score: 73, confidence: 0.82, expected_ipa: "i", actual_ipa: "i" }
              ]
            },
            {
              word: "members",
              phonemes: [
                { ipa: "m", score: 100, confidence: 0.96, expected_ipa: "m", actual_ipa: "m" },
                { ipa: "É›", score: 100, confidence: 0.93, expected_ipa: "É›", actual_ipa: "É›" },
                { ipa: "m", score: 100, confidence: 0.91, expected_ipa: "m", actual_ipa: "m" },
                { ipa: "b", score: 98, confidence: 0.88, expected_ipa: "b", actual_ipa: "b" },
                { ipa: "É™", score: 80, confidence: 0.85, expected_ipa: "É™", actual_ipa: "É™" },
                { ipa: "r", score: 88, confidence: 0.90, expected_ipa: "r", actual_ipa: "r" },
                { ipa: "z", score: 92, confidence: 0.94, expected_ipa: "z", actual_ipa: "z" }
              ]
            }
          ],
          is_mock_data: false
        }
      }]
    }],
    recommendations: [
      "Focus on basic pronunciation patterns",
      "Practice speaking slowly and clearly",
      "Work on fundamental vocabulary"
    ]
  };

  const actualReport = mockReport;

  // Calculate level-based score and classification
  const calculateLevelClassification = (levelScore, levelName) => {
    if (levelName === "A1") {
      if (levelScore < 30) return { label: "Needs Support", level: "A1-", color: "bg-red-100 text-red-800 border-red-200" };
      if (levelScore < 55) return { label: "A1 Emerging", level: "A1", color: "bg-orange-100 text-orange-800 border-orange-200" };
      if (levelScore < 75) return { label: "A1", level: "A1", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
      return { label: "A1 Mastery", level: "A1+", color: "bg-green-100 text-green-800 border-green-200" };
    } else {
      const prevLevel = getPreviousLevel(levelName);
      if (levelScore < 30) return { label: `${prevLevel}+`, level: prevLevel, color: "bg-orange-100 text-orange-800 border-orange-200" };
      if (levelScore < 55) return { label: `${levelName} Emerging`, level: levelName, color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
      if (levelScore < 75) return { label: levelName, level: levelName, color: "bg-blue-100 text-blue-800 border-blue-200" };
      if (levelName === "C2") return { label: "Mastery", level: "C2+", color: "bg-purple-100 text-purple-800 border-purple-200" };
      return { label: `${levelName} Mastery`, level: `${levelName}+`, color: "bg-green-100 text-green-800 border-green-200" };
    }
  };

  const getPreviousLevel = (level) => {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const index = levels.indexOf(level);
    return index > 0 ? levels[index - 1] : "A1";
  };

  // Get level score and classification
  const currentLevelData = actualReport.level_details?.[actualReport.level_details.length - 1];
  const levelScore = currentLevelData?.average_score || 0;
  const levelName = currentLevelData?.level || "A1";
  const classification = calculateLevelClassification(levelScore, levelName);

  // Animate the level score on mount
  useEffect(() => {
    const targetScore = Math.round(levelScore);
    const duration = 2000;
    const steps = 60;
    const increment = targetScore / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setAnimatedScore(targetScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [levelScore]);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-500';
  };

  const getPhonemeScoreColor = (score) => {
    if (score >= 90) return 'bg-emerald-400/30 border-emerald-400/50 text-emerald-700';
    if (score >= 80) return 'bg-green-400/30 border-green-400/50 text-green-700';
    if (score >= 70) return 'bg-yellow-400/30 border-yellow-400/50 text-yellow-700';
    if (score >= 60) return 'bg-orange-400/30 border-orange-400/50 text-orange-700';
    return 'bg-red-400/30 border-red-400/50 text-red-700';
  };

  // Extract real Language Confidence phoneme data
  const extractSpeechAcePhonemes = (questionData) => {
    const evalDetails = questionData.evaluation_details || {};
    const isRealData = !evalDetails.is_mock_data;
    
    if (!isRealData) {
      return {
        transcription: "Mock data - no real transcription available",
        wordPhonemes: [],
        isRealData: false,
        overallScores: { pronunciation: 0, fluency: 0, grammar: 0, vocabulary: 0 }
      };
    }

    const languageConfidenceResponse = evalDetails.language_confidence_response || evalDetails.speech_ace_response || {};
    
    // Extract transcription with pauses from Language Confidence
    let transcription = evalDetails.transcription || "";
    let wordPhonemes = [];
    
    if (evalDetails.word_phoneme_data && Array.isArray(evalDetails.word_phoneme_data)) {
      wordPhonemes = evalDetails.word_phoneme_data.map(wordData => ({
        word: wordData.word,
        phonemes: wordData.phonemes.map(phoneme => ({
          ipa: phoneme.ipa,
          score: Math.round(phoneme.score || 0),
          confidence: phoneme.confidence,
          expected_ipa: phoneme.expected_ipa,
          actual_ipa: phoneme.actual_ipa
        }))
      }));
    }

    const rawScores = evalDetails.raw_scores || {};
    const overallScores = {
      pronunciation: rawScores.pronunciation || languageConfidenceResponse.pronunciation?.overall_score || languageConfidenceResponse.overall_score || 0,
      fluency: rawScores.fluency || languageConfidenceResponse.fluency?.overall_score || 0,
      grammar: rawScores.grammar || languageConfidenceResponse.grammar || 0,
      vocabulary: rawScores.vocabulary || languageConfidenceResponse.vocabulary || 0
    };

    return { transcription, wordPhonemes, isRealData: true, overallScores };
  };

  const handlePrint = () => window.print();
  const handleRestart = () => window.location.reload();

  // Get cumulative skill data (from all questions attempted)
  const getSkillData = () => {
    if (actualReport.skill_breakdown) {
      // New cumulative format - only return percentages
      return Object.entries(actualReport.skill_breakdown).map(([skill, skillData]) => ({
        skill,
        score: skillData.percentage || 0
      }));
    } else if (actualReport.level_details && actualReport.level_details.length > 0 && actualReport.level_details[0].skill_breakdown) {
      // Old format fallback
      return Object.entries(actualReport.level_details[0].skill_breakdown).map(([skill, score]) => ({
        skill,
        score
      }));
    }
    return [];
  };

  const skillData = getSkillData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-6 py-8">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              LingoQuesto
            </h1>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Assessment Complete!</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Congratulations on completing your English proficiency assessment. Here are your detailed results with AI-powered speech analysis.
          </p>
        </div>

        {/* Main Results Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Overall Score Circle - Now shows level-based score */}
            <div className="flex flex-col items-center space-y-6">
              <div className="relative w-64 h-64">
                <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    stroke="#f3f4f6"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    stroke="url(#scoreGradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(animatedScore / 100) * 282.74} 282.74`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-800">{animatedScore}%</div>
                    <div className="text-lg text-gray-500">{levelName} Level Score</div>
                  </div>
                </div>
              </div>

              {/* Level Badge with new classification */}
              <div className={`px-4 py-2 rounded-full border-2 ${classification.color}`}>
                <div className="text-center">
                  <div className="text-lg font-bold">{classification.label}</div>
                </div>
              </div>
            </div>

            {/* Skills Breakdown - Cumulative across all questions */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                Speaking Skills (Cumulative)
              </h3>
              
              {skillData.map(({ skill, score }) => (
                <div key={skill} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium capitalize text-gray-700">{skill}</span>
                    <span className={`text-base font-bold ${getScoreColor(score)}`}>
                      {score?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(score, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Analysis Sections - Keep phoneme analysis */}
        {actualReport.level_details?.map((level, levelIndex) => {
          const speakingQuestions = level.questions?.filter(q => 
            q.question_info?.original_type === 'open_response' || 
            q.question_info?.original_type === 'repeat_sentence' ||
            q.q_id?.includes('-OR-') || q.q_id?.includes('-RS-')
          ) || [];

          if (speakingQuestions.length === 0) return null;

          return (
            <div key={levelIndex} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <button
                  onClick={() => toggleSection(`level-${levelIndex}`)}
                  className="flex items-center justify-between w-full text-left group hover:bg-gray-50 rounded-lg p-4 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full ${classification.color} font-semibold`}>
                      {level.level}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Speaking Analysis - {level.level} Level</h3>
                      <p className="text-gray-600">{speakingQuestions.length} speaking question(s)</p>
                    </div>
                  </div>
                  {expandedSections[`level-${levelIndex}`] ? 
                    <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </button>
              </div>

              {expandedSections[`level-${levelIndex}`] && (
                <div className="p-6 space-y-8">
                  {speakingQuestions.map((questionData, qIndex) => {
                    const speechData = extractSpeechAcePhonemes(questionData);

                    return (
                      <div key={qIndex} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center mb-6">
                          <Volume2 className="w-5 h-5 text-purple-600 mr-2" />
                          <h4 className="text-lg font-medium text-gray-800">Speaking Question {qIndex + 1}</h4>
                          {speechData.isRealData ? (
                            <span className="ml-3 text-xs bg-green-100 text-green-800 px-2 py-1 rounded border border-green-200">
                              Language Confidence Analysis
                            </span>
                          ) : (
                            <span className="ml-3 text-xs bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200">
                              No Real Data Available
                            </span>
                          )}
                        </div>

                        {/* Full Response */}
                        {speechData.transcription && (
                          <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                            <h6 className="font-medium text-blue-900 mb-2 flex items-center">
                              <BookOpen className="w-4 h-4 mr-2" />
                              Full Response:
                            </h6>
                            <p className="text-blue-800 italic">
                              "
                              {speechData.transcription.split(' ').map((word, index) => {
                                if (word.startsWith('[pause')) {
                                  return (
                                    <span key={index} className="bg-yellow-200 text-yellow-800 px-1 rounded mx-1 text-xs font-mono">
                                      {word}
                                    </span>
                                  );
                                }
                                return <span key={index}>{word} </span>;
                              })}
                              "
                            </p>
                          </div>
                        )}

                        {/* Phoneme Analysis - Restored and Enhanced */}
                        {speechData.isRealData && speechData.wordPhonemes.length > 0 ? (
                          <div className="space-y-6">
                            <h5 className="text-base font-medium mb-3 text-gray-700 flex items-center">
                              <Target className="w-4 h-4 mr-2" />
                              Phoneme Analysis
                            </h5>
                            
                            <div className="flex flex-wrap gap-4">
                              {speechData.wordPhonemes.map((wordData, wordIndex) => (
                                <div key={wordIndex} className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
                                  <div className="text-lg font-medium text-gray-800 mb-3 text-center">
                                    {wordData.word}
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2 justify-center">
                                    {wordData.phonemes.map((phoneme, pIndex) => (
                                      <div key={pIndex} className="text-center">
                                        <div 
                                          className={`w-12 h-12 rounded-lg border-2 font-bold flex items-center justify-center text-sm mb-1 hover:scale-105 transition-transform cursor-pointer ${getPhonemeScoreColor(phoneme.score)}`}
                                          title={`Expected: ${phoneme.expected_ipa || 'N/A'}, Actual: ${phoneme.actual_ipa || 'N/A'}, Confidence: ${phoneme.confidence || 'N/A'}`}
                                        >
                                          {phoneme.ipa}
                                        </div>
                                        <div className="text-xs font-medium text-gray-600">
                                          {phoneme.score}%
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-yellow-800">
                              <strong>No phoneme data available.</strong> 
                              {speechData.isRealData ? 
                                ' The Language Confidence API response may not contain detailed phoneme information.' : 
                                ' This appears to be mock/demo data.'
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Recommendations */}
        {actualReport.recommendations && actualReport.recommendations.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-xl font-bold mb-6 flex items-center text-gray-800">
              <AlertCircle className="w-6 h-6 mr-2 text-orange-600" />
              Recommendations
            </h3>
            <div className="space-y-3">
              {actualReport.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-orange-800">
                    {index + 1}
                  </div>
                  <span className="text-orange-800">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
          <button 
            onClick={handlePrint} 
            className="border border-gray-300 px-8 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Report
          </button>
          <button 
            onClick={handleRestart}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Take Another Exam
          </button>
        </div>
      </div>
    </div>
  );
};

export default LingoQuestoFinalReport;