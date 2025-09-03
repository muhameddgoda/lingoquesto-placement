// frontend/src/components/EnhancedFinalReport.jsx
import React, { useState } from 'react';
import { Award, TrendingUp, AlertCircle, CheckCircle, Download, RotateCcw, ChevronDown, ChevronUp, Volume2, Brain } from 'lucide-react';

const EnhancedFinalReport = ({ report }) => {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeLabel = (level) => {
    const grades = {
      'A1': 'Beginner',
      'A2': 'Elementary', 
      'B1': 'Intermediate',
      'B2': 'Upper Intermediate',
      'C1': 'Advanced',
      'C2': 'Proficient'
    };
    return grades[level] || level;
  };

  const getLevelColor = (level) => {
    const colors = {
      'A1': 'bg-red-100 text-red-800',
      'A2': 'bg-orange-100 text-orange-800',
      'B1': 'bg-yellow-100 text-yellow-800',
      'B2': 'bg-blue-100 text-blue-800',
      'C1': 'bg-purple-100 text-purple-800',
      'C2': 'bg-green-100 text-green-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  // Extract real Language Confidence phoneme data
  const extractSpeechAcePhonemes = (questionData) => {
    console.log('Extracting phonemes from question data:', questionData);
    
    const evalDetails = questionData.evaluation_details || {};
    console.log('Evaluation details:', evalDetails);
    
    // Check if this is real Language Confidence data
    const isRealData = !evalDetails.is_mock_data;
    console.log('Is real data:', isRealData);
    
    if (!isRealData) {
      console.warn('Mock data detected, skipping real phoneme extraction');
      return {
        transcription: "Mock data - no real transcription available",
        wordPhonemes: [],
        isRealData: false,
        overallScores: {
          pronunciation: 0,
          fluency: 0,
          grammar: 0,
          vocabulary: 0
        }
      };
    }

    // Extract from the actual Language Confidence response structure
    const languageConfidenceResponse = evalDetails.language_confidence_response || evalDetails.speech_ace_response || {};
    console.log('Language Confidence response:', languageConfidenceResponse);
    
    // Extract transcription with pauses from Language Confidence
    let transcription = evalDetails.transcription || "";
    if (!transcription && languageConfidenceResponse.words && Array.isArray(languageConfidenceResponse.words)) {
      // Reconstruct transcription with pause detection
      const words = [];
      let previousEndTime = 0;
      
      languageConfidenceResponse.words.forEach((word, index) => {
        const wordText = word.word_text || word.text || word.word || "";
        const startTime = word.start_time || 0;
        
        // Detect pauses between words
        if (index > 0 && startTime > previousEndTime) {
          const pauseDuration = startTime - previousEndTime;
          if (pauseDuration > 0.3) { // Pause longer than 300ms
            words.push(`[pause ${pauseDuration.toFixed(1)}s]`);
          }
        }
        
        words.push(wordText);
        previousEndTime = word.end_time || startTime + 0.5;
      });
      
      transcription = words.join(" ");
    }
    console.log('Extracted transcription with pauses:', transcription);

    // Extract word-phoneme data from Language Confidence response
    let wordPhonemes = [];
    
    // Method 1: Use the processed word_phoneme_data if available
    if (evalDetails.word_phoneme_data && Array.isArray(evalDetails.word_phoneme_data)) {
      console.log('Using processed word_phoneme_data:', evalDetails.word_phoneme_data);
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
    // Method 2: Extract directly from Language Confidence words array
    else if (languageConfidenceResponse.words && Array.isArray(languageConfidenceResponse.words)) {
      console.log('Extracting from Language Confidence words array:', languageConfidenceResponse.words);
      
      languageConfidenceResponse.words.forEach((word, wordIndex) => {
        const wordText = word.word_text || word.text || word.word || `word_${wordIndex}`;
        console.log(`Processing word: ${wordText}`, word);
        
        if (word.phonemes && Array.isArray(word.phonemes) && word.phonemes.length > 0) {
          const phonemeData = word.phonemes.map((phoneme, pIndex) => {
            const phonemeObj = {
              ipa: phoneme.ipa_label || phoneme.ipa || phoneme.phoneme || phoneme.phone || `ph_${pIndex}`,
              score: Math.round(
                phoneme.phoneme_score || 
                phoneme.score || 
                phoneme.accuracy_score || 
                phoneme.pronunciation_score || 
                0
              ),
              confidence: phoneme.confidence,
              expected_ipa: phoneme.expected_ipa || phoneme.expected,
              actual_ipa: phoneme.actual_ipa || phoneme.actual,
              start_time: phoneme.start_time,
              end_time: phoneme.end_time
            };
            console.log(`  Phoneme: ${phonemeObj.ipa} (${phonemeObj.score}%)`);
            return phonemeObj;
          });
          
          wordPhonemes.push({
            word: wordText,
            phonemes: phonemeData
          });
        } else {
          console.log(`  No phonemes found for word: ${wordText}`);
        }
      });
    }

    console.log('Final word phonemes:', wordPhonemes);

    // Extract overall scores from raw_scores or language_confidence_response
    const rawScores = evalDetails.raw_scores || {};
    const overallScores = {
      pronunciation: rawScores.pronunciation || languageConfidenceResponse.pronunciation?.overall_score || languageConfidenceResponse.overall_score || 0,
      fluency: rawScores.fluency || languageConfidenceResponse.fluency?.overall_score || 0,
      grammar: rawScores.grammar || languageConfidenceResponse.grammar || 0,
      vocabulary: rawScores.vocabulary || languageConfidenceResponse.vocabulary || 0
    };

    console.log('Overall scores:', overallScores);

    return {
      transcription,
      wordPhonemes,
      isRealData: true,
      overallScores,
      debugInfo: {
        hasEvalDetails: !!evalDetails,
        hasLanguageConfidenceResponse: !!languageConfidenceResponse,
        hasWordPhonemeData: !!(evalDetails.word_phoneme_data),
        languageConfidenceWordsCount: languageConfidenceResponse.words?.length || 0,
        wordPhonemesCount: wordPhonemes.length
      }
    };
  };

  const getPhonemeScoreColor = (score) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 80) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

    const handlePrint = () => {
    // Add print-specific styling
    const printStyles = `
        <style>
        @media print {
            * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
            }
            
            body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            line-height: 1.5 !important;
            color: #1f2937 !important;
            }
            
            .no-print {
            display: none !important;
            }
            
            .print-page-break {
            page-break-before: always !important;
            break-before: page !important;
            }
            
            .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            }
            
            /* Ensure gradients and colors print */
            .bg-gradient-to-br,
            .bg-gradient-to-r {
            background: linear-gradient(135deg, #f3e8ff 0%, #dbeafe 50%, #e0e7ff 100%) !important;
            }
            
            .text-purple-600,
            .text-blue-600 {
            color: #7c3aed !important;
            }
            
            .bg-white {
            background: white !important;
            border: 1px solid #e5e7eb !important;
            }
            
            /* Print-specific spacing */
            .print-container {
            max-width: none !important;
            margin: 0 !important;
            padding: 20px !important;
            }
            
            .print-header {
            margin-bottom: 30px !important;
            }
            
            .print-section {
            margin-bottom: 25px !important;
            padding: 20px !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            }
            
            /* Score circle adjustments for print */
            .score-circle {
            width: 200px !important;
            height: 200px !important;
            }
            
            /* Phoneme squares for print */
            .phoneme-square {
            border: 2px solid #d1d5db !important;
            background: #f9fafb !important;
            }
            
            .phoneme-score-excellent { background: #dcfce7 !important; border-color: #16a34a !important; }
            .phoneme-score-good { background: #dbeafe !important; border-color: #2563eb !important; }
            .phoneme-score-fair { background: #fef3c7 !important; border-color: #d97706 !important; }
            .phoneme-score-poor { background: #fed7d7 !important; border-color: #dc2626 !important; }
            
            /* Ensure proper spacing */
            h1, h2, h3 { margin-bottom: 15px !important; }
            p { margin-bottom: 10px !important; }
            
            /* Skills breakdown */
            .skills-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 15px !important;
            }
        }
        </style>
    `;
    
    // Inject print styles
    const styleElement = document.createElement('div');
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);
    
    // Print
    window.print();
    
    // Clean up
    setTimeout(() => {
        document.head.removeChild(styleElement);
    }, 1000);
    };

  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <Award className="w-20 h-20 mx-auto text-blue-600 mb-4" />
            <h1 className="text-4xl font-bold text-blue-900 mb-2">Exam Complete!</h1>
            <p className="text-blue-700 text-lg">English Proficiency Assessment Results</p>
          </div>
        </div>

        {/* Overall Results Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Overall Results</h2>
          
          {/* Overall Score Circle */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#10b981"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(report.final_score / 100) * 314.16} 314.16`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800">{Math.round(report.final_score || 0)}</div>
                  <div className="text-sm text-gray-600">Overall</div>
                </div>
              </div>
            </div>
          </div>

          {/* Speaking Skills Breakdown */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-center">Speaking Skills</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {report.level_details && report.level_details.length > 0 && report.level_details[0].skill_breakdown && 
                Object.entries(report.level_details[0].skill_breakdown).map(([skill, score]) => (
                <div key={skill} className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-2">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        stroke="#e5e7eb"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        stroke="#10b981"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${(score / 100) * 188.5} 188.5`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">{score?.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="text-sm font-medium capitalize">{skill}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Final Level */}
          <div className="text-center">
            <p className="text-gray-600 mb-2">Your English Level</p>
            <div className={`inline-block px-6 py-3 rounded-full text-2xl font-bold ${getLevelColor(report.final_level)}`}>
              {report.final_level} - {getGradeLabel(report.final_level)}
            </div>
          </div>
        </div>

        {/* Detailed Analysis - Only for Speaking Questions */}
        {report.level_details?.map((level, levelIndex) => {
          // Filter only speaking questions (open_response type)
          const speakingQuestions = level.questions?.filter(q => 
            q.question_info?.original_type === 'open_response' || 
            q.question_info?.q_type === 'open_response' ||
            q.q_id?.includes('-OR-')
          ) || [];

          if (speakingQuestions.length === 0) return null;

          return (
            <div key={levelIndex} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 border-b">
                <button
                  onClick={() => toggleSection(`level-${levelIndex}`)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-lg font-bold ${getLevelColor(level.level)}`}>
                      {level.level}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold">Speaking Analysis - {getGradeLabel(level.level)} Level</h3>
                      <p className="text-gray-600">{speakingQuestions.length} speaking question(s)</p>
                    </div>
                  </div>
                  {expandedSections[`level-${levelIndex}`] ? 
                    <ChevronUp className="w-5 h-5" /> : 
                    <ChevronDown className="w-5 h-5" />
                  }
                </button>
              </div>

              {expandedSections[`level-${levelIndex}`] && (
                <div className="p-6">
                  {speakingQuestions.map((questionData, qIndex) => {
                    const speechData = extractSpeechAcePhonemes(questionData);
                    console.log(`Speech data for question ${qIndex}:`, speechData);

                    return (
                      <div key={qIndex} className="mb-8 last:mb-0">
                        <div className="flex items-center mb-4">
                          <Volume2 className="w-5 h-5 text-blue-600 mr-2" />
                          <h4 className="text-lg font-medium">Speaking Question {qIndex + 1}</h4>
                          {speechData.isRealData ? (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Language Confidence Analysis
                            </span>
                          ) : (
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              No Real Data Available
                            </span>
                          )}
                        </div>

                        {/* Debug info for development */}
                        {process.env.NODE_ENV === 'development' && speechData.debugInfo && (
                          <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
                            <strong>Debug Info:</strong>
                            <br />Has eval details: {speechData.debugInfo.hasEvalDetails ? 'Yes' : 'No'}
                            <br />Has Speech Ace response: {speechData.debugInfo.hasSpeechAceResponse ? 'Yes' : 'No'}
                            <br />Has word phoneme data: {speechData.debugInfo.hasWordPhonemeData ? 'Yes' : 'No'}
                            <br />Speech Ace words count: {speechData.debugInfo.speechAceWordsCount}
                            <br />Word phonemes count: {speechData.debugInfo.wordPhonemesCount}
                          </div>
                        )}

                        {/* Answer Section - Only show if we have real data */}
                        {speechData.isRealData && speechData.wordPhonemes.length > 0 ? (
                          <div className="mb-6">
                            <h5 className="text-base font-medium mb-3">Phoneme Analysis</h5>
                            
                            {/* Word-by-word phoneme analysis */}
                            <div className="space-y-4">
                              {speechData.wordPhonemes.map((wordData, wordIndex) => (
                                <div key={wordIndex} className="bg-gray-50 p-4 rounded-lg">
                                  {/* Word header */}
                                  <div className="text-lg font-medium text-gray-700 mb-3 text-center">
                                    {wordData.word}
                                  </div>
                                  
                                  {/* Phonemes for this word */}
                                  <div className="flex flex-wrap justify-center gap-2">
                                    {wordData.phonemes.map((phoneme, pIndex) => (
                                      <div key={pIndex} className="text-center">
                                        {/* Phoneme symbol */}
                                        <div 
                                          className={`w-12 h-12 rounded text-white font-bold flex items-center justify-center text-sm mb-1 ${getPhonemeScoreColor(phoneme.score)}`}
                                          title={`Expected: ${phoneme.expected_ipa || 'N/A'}, Actual: ${phoneme.actual_ipa || 'N/A'}`}
                                        >
                                          {phoneme.ipa}
                                        </div>
                                        {/* Score percentage */}
                                        <div className="text-xs font-medium">
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
                          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800">
                              <strong>No phoneme data available.</strong> 
                              {speechData.isRealData ? 
                                ' The Speech Ace API response may not contain detailed phoneme information.' : 
                                ' This appears to be mock/demo data.'
                              }
                            </p>
                          </div>
                        )}

                        {/* Full transcription */}
                        {speechData.transcription && (
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h6 className="font-medium text-blue-900 mb-2">Transcription:</h6>
                            <p className="text-blue-800 italic">"{speechData.transcription}"</p>
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
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <AlertCircle className="w-6 h-6 mr-2 text-orange-600" />
              Recommendations
            </h3>
            <div className="space-y-3">
              {report.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
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
            className="border border-gray-300 px-8 py-3 rounded-lg hover:bg-gray-50 flex items-center justify-center"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Report
          </button>
          <button 
            onClick={handleRestart}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Take Another Exam
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFinalReport;