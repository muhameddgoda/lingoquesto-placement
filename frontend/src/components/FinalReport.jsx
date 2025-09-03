// frontend/src/components/FinalReport.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, AlertCircle, CheckCircle, Download, RotateCcw } from 'lucide-react';

const FinalReport = ({ report }) => {
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

  const handlePrint = () => {
    window.print();
  };

  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4 space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="text-center pb-4">
          <Award className="w-20 h-20 mx-auto text-blue-600 mb-4" />
          <CardTitle className="text-4xl font-bold text-blue-900">Exam Complete!</CardTitle>
          <p className="text-blue-700 text-lg">Congratulations on completing your English proficiency assessment</p>
        </CardHeader>
        <CardContent className="text-center pb-8">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Final Level */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Your English Level</p>
              <Badge className={`text-2xl px-4 py-2 ${getLevelColor(report.final_level)}`}>
                {report.final_level}
              </Badge>
              <p className="text-lg text-gray-700 mt-2 font-medium">
                {getGradeLabel(report.final_level)}
              </p>
            </div>
            
            {/* Final Score */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Overall Score</p>
              <div className={`text-4xl font-bold ${getScoreColor(report.final_score)}`}>
                {report.final_score?.toFixed(1)}%
              </div>
              <div className="mt-2">
                {report.certificate_eligible && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Certificate Eligible
                  </Badge>
                )}
              </div>
            </div>

            {/* Levels Progress */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Progress</p>
              <div className="text-2xl font-bold text-blue-600">
                {report.levels_passed}/{report.levels_attempted}
              </div>
              <p className="text-sm text-gray-600 mt-1">Levels Passed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
            Level Progression Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.level_details?.map((level, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge className={getLevelColor(level.level)}>
                      {level.level}
                    </Badge>
                    <span className="font-semibold text-lg">{getGradeLabel(level.level)}</span>
                  </div>
                  <Badge variant={level.passed ? 'default' : 'secondary'} className={level.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {level.passed ? 'Passed' : 'Not Passed'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Average Score:</span>
                    <div className={`font-bold text-lg ${getScoreColor(level.average_score)}`}>
                      {level.average_score?.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Questions:</span>
                    <div className="font-bold text-lg">{level.questions_completed}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Threshold:</span>
                    <div className="font-bold text-lg">75%</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Result:</span>
                    <div className={`font-bold text-lg ${level.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {level.passed ? '+' + (level.average_score - 75).toFixed(1) : (level.average_score - 75).toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Skill Breakdown */}
                {level.skill_breakdown && Object.keys(level.skill_breakdown).length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-3 text-gray-700">Skill Breakdown:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(level.skill_breakdown).map(([skill, score]) => (
                        <div key={skill} className="bg-gray-50 p-2 rounded">
                          <div className="text-xs text-gray-600 capitalize">{skill}</div>
                          <div className={`font-bold ${getScoreColor(score)}`}>
                            {score?.toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <AlertCircle className="w-6 h-6 mr-2 text-orange-600" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                  <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-800 text-sm font-bold">{index + 1}</span>
                  </div>
                  <span className="text-orange-800">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Exam Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Exam Date:</span>
                <span className="font-medium">
                  {new Date(report.exam_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completion Time:</span>
                <span className="font-medium">
                  {report.completion_date ? new Date(report.completion_date).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Session ID:</span>
                <span className="font-mono text-xs">{report.session_id}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Levels Attempted:</span>
                <span className="font-medium">{report.levels_attempted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Levels Passed:</span>
                <span className="font-medium">{report.levels_passed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completion Reason:</span>
                <span className="font-medium capitalize">
                  {report.completion_reason?.replace(/_/g, ' ') || 'Completed'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
        <Button onClick={handlePrint} variant="outline" size="lg" className="px-8">
          <Download className="w-5 h-5 mr-2" />
          Download Report
        </Button>
        <Button onClick={handleRestart} size="lg" className="px-8">
          <RotateCcw className="w-5 h-5 mr-2" />
          Take Another Exam
        </Button>
      </div>
    </div>
  );
};

export default FinalReport;