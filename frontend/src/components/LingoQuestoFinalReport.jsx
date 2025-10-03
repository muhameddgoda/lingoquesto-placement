import React, { useState, useEffect } from "react";
import {
  Award,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Volume2,
  Brain,
  Star,
  Zap,
  Target,
  BookOpen,
} from "lucide-react";

const LingoQuestoFinalReport = ({ report }) => {
  const [expandedSections, setExpandedSections] = useState({});

  // Mock report data for demonstration
  const mockReport = report || {
    overall_performance: {
      overall_score: 25,
      points_earned: 750,
      points_possible: 3000,
    },
    exam_progress: {
      highest_level_attempted: "A1",
      questions_attempted: 7,
      total_questions_available: 30,
    },
    skill_breakdown: {
      pronunciation: {
        percentage: 23.8,
        points_earned: 257.1,
        points_possible: 1080.0,
      },
      fluency: {
        percentage: 4.1,
        points_earned: 35.3,
        points_possible: 860.0,
      },
      grammar: {
        percentage: 16.0,
        points_earned: 84.8,
        points_possible: 530.0,
      },
      vocabulary: {
        percentage: 16.2,
        points_earned: 85.9,
        points_possible: 530.0,
      },
    },
    level_details: [
      {
        level: "A1",
        average_score: 62, // This is the level-specific score
        passed_threshold: false,
        skill_breakdown: {
          pronunciation: 23.8,
          fluency: 4.1,
          grammar: 16.0,
          vocabulary: 16.2,
        },
        questions: [
          {
            question_info: { original_type: "open_response" },
            q_id: "A1-OR-1",
            evaluation_details: {
              transcription:
                "Oh, my family members are awesome. We're four siblings and my parents. My parents are teachers. And we are three brothers and my sister.",
              word_phoneme_data: [
                {
                  word: "my",
                  phonemes: [
                    {
                      ipa: "m",
                      score: 100,
                      confidence: 0.95,
                      expected_ipa: "m",
                      actual_ipa: "m",
                    },
                    {
                      ipa: "aÉª",
                      score: 100,
                      confidence: 0.98,
                      expected_ipa: "aÉª",
                      actual_ipa: "aÉª",
                    },
                  ],
                },
                {
                  word: "family",
                  phonemes: [
                    {
                      ipa: "f",
                      score: 100,
                      confidence: 0.92,
                      expected_ipa: "f",
                      actual_ipa: "f",
                    },
                    {
                      ipa: "Ã¦",
                      score: 100,
                      confidence: 0.89,
                      expected_ipa: "Ã¦",
                      actual_ipa: "Ã¦",
                    },
                    {
                      ipa: "m",
                      score: 100,
                      confidence: 0.94,
                      expected_ipa: "m",
                      actual_ipa: "m",
                    },
                    {
                      ipa: "l",
                      score: 100,
                      confidence: 0.97,
                      expected_ipa: "l",
                      actual_ipa: "l",
                    },
                    {
                      ipa: "i",
                      score: 73,
                      confidence: 0.82,
                      expected_ipa: "i",
                      actual_ipa: "i",
                    },
                  ],
                },
                {
                  word: "members",
                  phonemes: [
                    {
                      ipa: "m",
                      score: 100,
                      confidence: 0.96,
                      expected_ipa: "m",
                      actual_ipa: "m",
                    },
                    {
                      ipa: "É›",
                      score: 100,
                      confidence: 0.93,
                      expected_ipa: "É›",
                      actual_ipa: "É›",
                    },
                    {
                      ipa: "m",
                      score: 100,
                      confidence: 0.91,
                      expected_ipa: "m",
                      actual_ipa: "m",
                    },
                    {
                      ipa: "b",
                      score: 98,
                      confidence: 0.88,
                      expected_ipa: "b",
                      actual_ipa: "b",
                    },
                    {
                      ipa: "É™",
                      score: 80,
                      confidence: 0.85,
                      expected_ipa: "É™",
                      actual_ipa: "É™",
                    },
                    {
                      ipa: "r",
                      score: 88,
                      confidence: 0.9,
                      expected_ipa: "r",
                      actual_ipa: "r",
                    },
                    {
                      ipa: "z",
                      score: 92,
                      confidence: 0.94,
                      expected_ipa: "z",
                      actual_ipa: "z",
                    },
                  ],
                },
              ],
              is_mock_data: false,
            },
          },
        ],
      },
    ],
    recommendations: [
      "Focus on basic pronunciation patterns",
      "Practice speaking slowly and clearly",
      "Work on fundamental vocabulary",
    ],
  };

  const actualReport = mockReport;

  const calculateLevelClassification = (levelScore, levelName) => {
    if (levelName === "A1") {
      if (levelScore < 30)
        return {
          label: "No Qualifications",
          level: "A0",
          color: "bg-gray-100 text-gray-800 border-gray-200",
        };
      if (levelScore < 50)
        return {
          label: "A1 Emerging",
          level: "A1",
          color: "bg-orange-100 text-orange-800 border-orange-200",
        };
      if (levelScore < 75)
        return {
          label: "A1 Proficient",
          level: "A1",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
      return {
        label: "A1 Mastery",
        level: "A1+",
        color: "bg-green-100 text-green-800 border-green-200",
      };
    } else {
      const prevLevel = getPreviousLevel(levelName);
      if (levelScore < 30)
        return {
          label: `${prevLevel}+`,
          level: prevLevel,
          color: "bg-orange-100 text-orange-800 border-orange-200",
        };
      if (levelScore < 50)
        return {
          label: `${levelName} Emerging`,
          level: levelName,
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
      if (levelScore < 75)
        return {
          label: `${levelName} Proficient`,
          level: levelName,
          color: "bg-blue-100 text-blue-800 border-blue-200",
        };
      if (levelName === "C2")
        return {
          label: "C2 Mastery",
          level: "C2+",
          color: "bg-purple-100 text-purple-800 border-purple-200",
        };
      return {
        label: `${levelName} Mastery`,
        level: `${levelName}+`,
        color: "bg-green-100 text-green-800 border-green-200",
      };
    }
  };

  const getPreviousLevel = (levelName) => {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const index = levels.indexOf(levelName);
    return index > 0 ? levels[index - 1] : "A1";
  };
  // Get level score and classification
  const currentLevelData =
    actualReport.level_details?.[actualReport.level_details.length - 1];
  const levelScore = currentLevelData?.average_score || 0;
  const levelName = currentLevelData?.level || "A1";
  const classification = calculateLevelClassification(levelScore, levelName);

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-500";
  };

  const getPhonemeScoreColor = (score) => {
    if (score >= 90)
      return "bg-emerald-400/30 border-emerald-400/50 text-emerald-700";
    if (score >= 80)
      return "bg-green-400/30 border-green-400/50 text-green-700";
    if (score >= 70)
      return "bg-yellow-400/30 border-yellow-400/50 text-yellow-700";
    if (score >= 60)
      return "bg-orange-400/30 border-orange-400/50 text-orange-700";
    return "bg-red-400/30 border-red-400/50 text-red-700";
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
        overallScores: {
          pronunciation: 0,
          fluency: 0,
          grammar: 0,
          vocabulary: 0,
        },
      };
    }

    const languageConfidenceResponse =
      evalDetails.language_confidence_response ||
      evalDetails.speech_ace_response ||
      {};

    // Extract transcription with pauses from Language Confidence
    let transcription = evalDetails.transcription || "";
    let wordPhonemes = [];

    if (
      evalDetails.word_phoneme_data &&
      Array.isArray(evalDetails.word_phoneme_data)
    ) {
      wordPhonemes = evalDetails.word_phoneme_data.map((wordData) => ({
        word: wordData.word,
        phonemes: wordData.phonemes.map((phoneme) => ({
          ipa: phoneme.ipa,
          score: Math.round(phoneme.score || 0),
          confidence: phoneme.confidence,
          expected_ipa: phoneme.expected_ipa,
          actual_ipa: phoneme.actual_ipa,
        })),
      }));
    }

    const rawScores = evalDetails.raw_scores || {};
    const overallScores = {
      pronunciation:
        rawScores.pronunciation ||
        languageConfidenceResponse.pronunciation?.overall_score ||
        languageConfidenceResponse.overall_score ||
        0,
      fluency:
        rawScores.fluency ||
        languageConfidenceResponse.fluency?.overall_score ||
        0,
      grammar: rawScores.grammar || languageConfidenceResponse.grammar || 0,
      vocabulary:
        rawScores.vocabulary || languageConfidenceResponse.vocabulary || 0,
    };

    return { transcription, wordPhonemes, isRealData: true, overallScores };
  };

  const getLowestPhonemeAverages = () => {
    const phonemeMap = {};

    actualReport.level_details?.forEach((level) => {
      level.questions?.forEach((question) => {
        const speechData = extractSpeechAcePhonemes(question);
        if (speechData.isRealData && speechData.wordPhonemes) {
          speechData.wordPhonemes.forEach((wordData) => {
            wordData.phonemes.forEach((phoneme) => {
              if (!phonemeMap[phoneme.ipa]) {
                phonemeMap[phoneme.ipa] = [];
              }
              phonemeMap[phoneme.ipa].push(phoneme.score);
            });
          });
        }
      });
    });

    // Calculate averages
    const phonemeAverages = Object.entries(phonemeMap).map(([ipa, scores]) => ({
      ipa,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }));

    // Sort by average score and get 5 lowest
    return phonemeAverages.sort((a, b) => a.avgScore - b.avgScore).slice(0, 5);
  };

  const handlePrint = () => window.print();
  const handleRestart = () => window.location.reload();

  // In LingoQuestoFinalReport.jsx - replace the getSkillData function:
  const getSkillData = () => {
    // Debug logging
    console.log("Report structure:", actualReport);
    console.log("Cumulative skills:", actualReport.cumulative_skills);

    // Try cumulative_skills first (normalized scoring)
    if (actualReport.cumulative_skills) {
      return Object.entries(actualReport.cumulative_skills).map(
        ([skill, score]) => ({
          skill,
          score: score || 0,
        })
      );
    }
    // Fallback to other formats
    else if (actualReport.skill_breakdown) {
      return Object.entries(actualReport.skill_breakdown).map(
        ([skill, skillData]) => ({
          skill,
          score:
            typeof skillData === "object"
              ? skillData.percentage || 0
              : skillData || 0,
        })
      );
    } else if (
      actualReport.level_details &&
      actualReport.level_details.length > 0 &&
      actualReport.level_details[0].skill_breakdown
    ) {
      return Object.entries(actualReport.level_details[0].skill_breakdown).map(
        ([skill, score]) => ({
          skill,
          score: score || 0,
        })
      );
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
            <img
              src="/lingoquesto.png"
              alt="LingoQuesto Logo"
              className="h-20 w-auto"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextElementSibling.style.display = "flex";
              }}
            />
            <div
              style={{ display: "none" }}
              className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center"
            >
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Assessment Complete!
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Congratulations on completing your English proficiency assessment.
            Here are your detailed results with AI-powered speech analysis.
          </p>
        </div>

        {/* Main Results Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Overall Score Circle - Now shows level-based score */}
            <div className="flex flex-col items-center space-y-6">
              <div className="flex flex-col items-center space-y-4">
                {/* OUTER = gradient border */}
                <div className="p-[3px] rounded-2xl bg-gradient-to-r from-[#967AFE] to-[#FFAF54] shadow-lg">
                  {/* INNER = must have a fill (NOT transparent) */}
                  <div className="rounded-[14px] px-8 py-6 bg-[#FAF9F9]">
                    <h2 className="text-4xl font-bold text-[#967AFE] text-center">
                      {classification.label}
                    </h2>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2"></div>
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
                    <span className="text-base font-medium capitalize text-gray-700">
                      {skill}
                    </span>
                    <span
                      className={`text-base font-bold ${getScoreColor(score)}`}
                    >
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
        {/* Recommendations */}
        {actualReport.recommendations &&
          actualReport.recommendations.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-xl font-bold mb-6 flex items-center text-gray-800">
                <AlertCircle className="w-6 h-6 mr-2 text-orange-600" />
                Recommendations
              </h3>
              <div className="space-y-3">
                {actualReport.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-orange-800">
                      {index + 1}
                    </div>
                    <span className="text-orange-800">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        {getLowestPhonemeAverages().length > 0 && (
          <div className="p-[3px] rounded-xl bg-gradient-to-r from-[#967AFE] to-[#9AD0F0] shadow-lg">
            <div className="rounded-lg bg-white p-6 border border-transparent">
              <h3 className="text-2xl font-bold mb-6 flex items-center text-gray-800">
                <Target className="w-6 h-6 mr-2 text-red-600 animate-pulse" />
                Phonemes Needing Improvement
              </h3>
              <div className="flex flex-wrap gap-4 justify-center">
                {getLowestPhonemeAverages().map((phoneme, index) => (
                  <div
                    key={index}
                    className={`p-[3px] rounded-xl bg-gradient-to-r ${
                      phoneme.avgScore < 30
                        ? "from-[#B42318] to-[#F04438]"
                        : phoneme.avgScore < 50
                        ? "from-[#fCA23A] to-[#FFAF54]"
                        : "from-[#067647] to-[#17B26A]"
                    } transform hover:scale-105 transition-all shadow-md`}
                  >
                    {/* INNER MUST BE FILLED */}
                    <div className="rounded-[10px] bg-[#FAF9F9] text-center p-5">
                      <div className="text-3xl font-bold text-black mb-2">
                        /{phoneme.ipa}/
                      </div>
                      <div className="text-lg font-semibold text-black/90">
                        {phoneme.avgScore}%
                      </div>
                      <div className="text-xs text-black/70 mt-1">
                        avg from {phoneme.count} instance
                        {phoneme.count > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center italic">
                Focus on these sounds to improve your pronunciation clarity
              </p>
            </div>
          </div>
        )}

        {/* Level Classification Guide */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold mb-6 flex items-center text-gray-800">
            <Star className="w-6 h-6 mr-2 text-blue-600" />
            Score Classification Guide
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">
                Score Ranges:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">0-29%:</span>
                  <span>No Qualifications (A1 only) / Previous Level+</span>
                </div>
                <div className="flex justify-between p-2 bg-orange-50 rounded">
                  <span className="font-medium">30-49%:</span>
                  <span>Emerging</span>
                </div>
                <div className="flex justify-between p-2 bg-yellow-50 rounded">
                  <span className="font-medium">50-74%:</span>
                  <span>Proficient</span>
                </div>
                <div className="flex justify-between p-2 bg-green-50 rounded">
                  <span className="font-medium">75-100%:</span>
                  <span>Mastery</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">
                What They Mean:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <strong>No Qualifications:</strong> Below minimum threshold
                  for A1
                </div>
                <div className="p-2 bg-orange-50 rounded">
                  <strong>Emerging:</strong> Basic understanding, needs practice
                </div>
                <div className="p-2 bg-yellow-50 rounded">
                  <strong>Proficient:</strong> Good command, minor improvements
                  needed
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <strong>Mastery:</strong> Excellent command, ready for next
                  level
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grammar Focus Areas by Level */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold mb-6 flex items-center text-gray-800">
            <BookOpen className="w-6 h-6 mr-2 text-purple-600" />
            Grammar Focus Areas by Level
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-700 mb-2">A1</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Present Simple (to be, have)</li>
                <li>• Articles (a/an/the)</li>
                <li>• Basic pronouns</li>
                <li>• Singular/plural nouns</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-700 mb-2">A2</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Past Simple</li>
                <li>• Present Continuous</li>
                <li>• Basic modals (can/can't)</li>
                <li>• Comparatives</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-700 mb-2">B1</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Present Perfect</li>
                <li>• Future forms</li>
                <li>• Conditionals (1st, 2nd)</li>
                <li>• Passive voice basics</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-700 mb-2">B2</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Past Perfect</li>
                <li>• Mixed conditionals</li>
                <li>• Reported speech</li>
                <li>• Advanced passive</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-700 mb-2">C1</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Advanced modals</li>
                <li>• Inversion</li>
                <li>• Subjunctive mood</li>
                <li>• Complex clauses</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-700 mb-2">C2</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Subtle distinctions</li>
                <li>• Idiomatic structures</li>
                <li>• Academic register</li>
                <li>• Stylistic variation</li>
              </ul>
            </div>
          </div>
        </div>

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
