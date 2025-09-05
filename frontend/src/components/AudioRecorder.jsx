// AudioRecorder.jsx - Single page with modern UI
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Clock, Send, RotateCcw } from 'lucide-react';

const AudioRecorder = ({ onSubmit, disabled, thinkTime = 5, responseTime = 120, questionId }) => {
  const [phase, setPhase] = useState('thinking');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);

  // Auto-start when question loads
  useEffect(() => {
    console.log('Question changed to:', questionId);
    resetAndStart();
  }, [questionId]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log('MediaRecorder already stopped');
      }
    }
  };

  const resetAndStart = () => {
    cleanup();
    setPhase('thinking');
    setTimeLeft(thinkTime);
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    chunksRef.current = [];
    startThinkingPhase();
  };

  const startThinkingPhase = () => {
    setPhase('thinking');
    startTimer(thinkTime, () => {
      startRecording();
    });
  };

  const startTimer = (duration, onComplete) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setTimeLeft(duration);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        const newTime = prevTime - 1;
        
        if (newTime <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          if (onComplete) onComplete();
          return 0;
        }
        return newTime;
      });
    }, 1000);
  };

  const getBestAudioFormat = () => {
    const formats = [
      'audio/mp4',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/wav'
    ];
    
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        return format;
      }
    }
    return '';
  };

  const getAudioConstraints = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return { sampleRate: 44100, channelCount: 1, echoCancellation: true };
    } else if (userAgent.includes('android')) {
      return { channelCount: 1, echoCancellation: true };
    } else {
      return { sampleRate: 16000, channelCount: 1, echoCancellation: true };
    }
  };

  const startRecording = async () => {
    try {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.log('Previous recorder already stopped');
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: getAudioConstraints()
      });

      chunksRef.current = [];
      const mimeType = getBestAudioFormat();
      const recorderOptions = mimeType ? { mimeType } : {};
      
      mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const totalSize = chunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
        
        if (totalSize > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
          
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
          
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setPhase('recording');
      
      // Start response timer
      startTimer(responseTime, () => {
        // Timer expired, auto-stop recording
        stopRecording();
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone.');
      setPhase('thinking');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
  };

  const startNewRecording = async () => {
    // Clear previous recording
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setIsPlaying(false);
    
    // Start fresh recording
    await startRecording();
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSubmit = () => {
    if (isRecording) {
      // Stop recording and submit
      stopRecording();
      setTimeout(() => {
        if (audioBlob) {
          onSubmit(audioBlob);
        }
      }, 500);
    } else if (audioBlob) {
      onSubmit(audioBlob);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
      <div className="text-center space-y-8">
        
        {/* Timer - Always visible */}
        <div className="flex items-center justify-center space-x-3">
          <Clock className={`w-6 h-6 ${
            phase === 'thinking' ? 'text-orange-500' : 
            timeLeft <= 10 ? 'text-red-500' : 'text-blue-500'
          }`} />
          <span className={`text-3xl font-mono font-bold ${
            phase === 'thinking' ? 'text-orange-500' : 
            timeLeft <= 10 ? 'text-red-500' : 'text-blue-500'
          }`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Phase Display */}
        <div className={`text-xl font-semibold ${
          phase === 'thinking' ? 'text-orange-600' : 'text-blue-700'
        }`}>
          {phase === 'thinking' ? 'Think About Your Answer...' : 'Recording Available'}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-600 font-medium">Recording in progress</span>
          </div>
        )}

        {/* Control Buttons - Modern Design */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          
          {/* Record/Stop Button */}
          {phase !== 'thinking' && (
            <button
              onClick={isRecording ? stopRecording : startNewRecording}
              disabled={disabled}
              className={`
                group relative flex items-center space-x-3 px-6 py-4 rounded-2xl font-semibold text-lg
                transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl
                ${isRecording 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              `}
            >
              {isRecording ? (
                <>
                  <Square className="w-5 h-5" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span>Record{audioBlob ? ' Again' : ''}</span>
                </>
              )}
            </button>
          )}

          {/* Play Button */}
          {audioUrl && phase !== 'thinking' && (
            <button
              onClick={playAudio}
              className="
                group relative flex items-center space-x-3 px-6 py-4 rounded-2xl font-semibold text-lg
                bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl
              "
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Play</span>
                </>
              )}
            </button>
          )}

          {/* Submit Button */}
          {phase !== 'thinking' && (audioBlob || isRecording) && (
            <button
              onClick={handleSubmit}
              disabled={disabled}
              className="
                group relative flex items-center space-x-3 px-8 py-4 rounded-2xl font-semibold text-lg
                bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 
                text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              "
            >
              <Send className="w-5 h-5" />
              <span>Submit</span>
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className={`p-4 rounded-xl border-2 ${
          phase === 'thinking' 
            ? 'bg-orange-50 border-orange-200 text-orange-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <p className="font-medium text-sm">
            {phase === 'thinking' 
              ? 'Prepare your answer. Recording will start automatically.'
              : isRecording 
                ? 'Speak clearly. You can stop anytime or submit directly.'
                : audioBlob 
                  ? 'You can play your recording, record again, or submit.'
                  : 'Ready to record your response.'
            }
          </p>
        </div>

        {/* Hidden Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        )}
        
      </div>
    </div>
  );
};

export default AudioRecorder;