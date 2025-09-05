// AudioRecorder.jsx - Enhanced for immediate recording start
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Clock } from 'lucide-react';

const AudioRecorder = ({ onSubmit, disabled, thinkTime = 5, responseTime = 120, questionId }) => {
  const [phase, setPhase] = useState('thinking');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);

  // Auto-start when question loads
  useEffect(() => {
    console.log('Question changed to:', questionId);
    resetAndStart();
  }, [questionId]);

  // Cleanup on unmount
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
    console.log('Resetting and starting recording sequence');
    cleanup();
    setPhase('thinking');
    setTimeLeft(thinkTime);
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    chunksRef.current = [];
    
    // Auto-start thinking phase
    startThinkingPhase();
  };

  const startThinkingPhase = () => {
    console.log('Starting thinking phase');
    setPhase('thinking');
    startTimer(thinkTime, () => {
      console.log('Thinking phase complete, starting recording');
      startRecording();
    });
  };

  const startTimer = (duration, onComplete) => {
    console.log(`Starting timer for ${duration} seconds`);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setTimeLeft(duration);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        const newTime = prevTime - 1;
        console.log(`Timer: ${newTime} seconds left`);
        
        if (newTime <= 0) {
          console.log('Timer complete, executing callback');
          clearInterval(timerRef.current);
          timerRef.current = null;
          onComplete();
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
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        console.log(`Selected audio format: ${format}`);
        return format;
      }
    }
    
    console.warn('No supported audio format found, using default');
    return '';
  };

  const getAudioConstraints = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return {
        sampleRate: 44100,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      };
    } else if (userAgent.includes('android')) {
      return {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      };
    } else {
      return {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      };
    }
  };

  const startRecording = async () => {
    console.log('Starting recording phase');
    try {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.log('Previous recorder already stopped');
        }
      }

      const audioConstraints = getAudioConstraints();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });

      chunksRef.current = [];
      const mimeType = getBestAudioFormat();
      const recorderOptions = mimeType ? { mimeType } : {};
      
      mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);

      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('Audio data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('Recording stopped, creating blob');
        const totalSize = chunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
        
        if (totalSize === 0) {
          console.error('No audio data recorded!');
          setPhase('thinking');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        const blob = new Blob(chunksRef.current, { 
          type: mimeType || 'audio/webm' 
        });
        
        // Clear previous recording
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
        console.log('Recording blob created successfully');
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setPhase('recording');
      
      // Start response timer
      startTimer(responseTime, () => {
        console.log('Recording time complete, stopping recording');
        stopRecording();
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check your permissions and try again.');
      setPhase('thinking');
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording');
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setPhase('completed');
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
  };

  const startNewRecording = async () => {
    console.log('Starting new recording, clearing previous one');
    // Clear previous recording
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    
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
      // Stop recording first, then submit
      stopRecording();
      // The submission will happen in the onstop event
      setTimeout(() => {
        if (audioBlob) {
          onSubmit(audioBlob);
        }
      }, 500);
    } else if (audioBlob) {
      console.log('Submitting audio blob, size:', audioBlob.size, 'bytes');
      onSubmit(audioBlob);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
      <div className="text-center space-y-6">
        {/* Phase Indicator with Timer */}
        {phase === 'thinking' && (
          <div className="space-y-4">
            <div className="text-xl font-semibold text-yellow-600">
              Think About Your Answer...
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Clock className="w-6 h-6 text-yellow-600" />
              <span className="text-4xl font-mono font-bold text-yellow-600">
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200">
              <p className="text-yellow-800 font-medium">
                <strong>Thinking time:</strong> Prepare your answer. Recording will start automatically.
              </p>
            </div>
          </div>
        )}

        {phase === 'recording' && (
          <div className="space-y-4">
            <div className="text-xl font-semibold text-red-600">
              Recording Your Response
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Clock className="w-6 h-6 text-red-600" />
              <span className="text-4xl font-mono font-bold text-red-600">
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-xl border border-red-200">
              <p className="text-red-800 font-medium">
                <strong>Recording now:</strong> Speak clearly into your microphone.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 text-red-600">
              <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
              <span className="font-semibold">Recording in progress...</span>
            </div>
          </div>
        )}

        {phase === 'completed' && (
          <div className="space-y-6">
            <div className="text-xl font-semibold text-green-600">
              Recording Complete!
            </div>
            
            {/* Audio playback controls */}
            {audioUrl && (
              <div className="space-y-4">
                <button 
                  onClick={playAudio}
                  className="border-2 border-purple-300 text-purple-700 px-6 py-3 rounded-xl hover:bg-purple-50 flex items-center mx-auto font-semibold transition-all"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Pause Recording
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Play Recording
                    </>
                  )}
                </button>
                
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          {phase === 'recording' && (
            <button 
              onClick={stopRecording}
              className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-red-700 hover:to-pink-700 flex items-center font-semibold text-lg transition-all transform hover:scale-105"
            >
              <Square className="w-6 h-6 mr-3" />
              Stop Recording
            </button>
          )}

          {phase === 'completed' && (
            <div className="flex space-x-4">
              <button 
                onClick={startNewRecording}
                disabled={disabled}
                className="border-2 border-blue-300 text-blue-700 px-6 py-4 rounded-xl hover:bg-blue-50 flex items-center font-semibold transition-all disabled:opacity-50"
              >
                <Mic className="w-5 h-5 mr-2" />
                Record Again
              </button>

              <button 
                onClick={handleSubmit}
                disabled={disabled}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all transform hover:scale-105"
              >
                Submit Response
              </button>
            </div>
          )}
        </div>

        {/* Submit while recording */}
        {phase === 'recording' && (
          <div className="pt-4">
            <button 
              onClick={handleSubmit}
              disabled={disabled}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
            >
              Submit Current Recording
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;