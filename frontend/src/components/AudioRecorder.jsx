// frontend/src/components/AudioRecorder.jsx - Enhanced for cross-platform compatibility
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Clock } from 'lucide-react';

const AudioRecorder = ({ onSubmit, disabled, thinkTime = 5, responseTime = 120, questionId }) => {
  const [phase, setPhase] = useState('ready');
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

  // Detect device and browser capabilities
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    setDeviceInfo(`${platform} - ${userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Safari') ? 'Safari' : userAgent.includes('Firefox') ? 'Firefox' : 'Other'}`);
    
    // Log supported MIME types for debugging
    const supportedTypes = [
      'audio/webm;codecs=opus',
      'audio/webm;codecs=pcm', 
      'audio/webm',
      'audio/mp4',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg;codecs=opus'
    ];
    
    const supported = supportedTypes.filter(type => MediaRecorder.isTypeSupported(type));
    console.log('Device info:', deviceInfo);
    console.log('Supported audio types:', supported);
  }, []);

  // Reset component when question changes
  useEffect(() => {
    console.log('Question changed to:', questionId);
    resetRecorder();
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

  const resetRecorder = () => {
    console.log('Resetting recorder');
    cleanup();
    setPhase('ready');
    setTimeLeft(0);
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    chunksRef.current = [];
  };

  // Get best supported audio format for this device
  const getBestAudioFormat = () => {
    // Priority order: most compatible first
    const formats = [
      'audio/mp4',                    // Best for iOS Safari
      'audio/mp4;codecs=mp4a.40.2',  // AAC in MP4 container
      'audio/webm;codecs=opus',       // Good for Chrome/Firefox
      'audio/webm',                   // Fallback WebM
      'audio/ogg;codecs=opus',        // Firefox fallback
      'audio/wav'                     // Universal fallback (large files)
    ];
    
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        console.log(`Selected audio format: ${format}`);
        return format;
      }
    }
    
    console.warn('No supported audio format found, using default');
    return ''; // Let browser choose
  };

  // Get optimal audio constraints for this device  
  const getAudioConstraints = () => {
    const baseConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };

    // Try different sample rates based on device
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      // iOS devices often prefer 44.1kHz
      return {
        ...baseConstraints,
        sampleRate: 44100,
        channelCount: 1
      };
    } else if (userAgent.includes('android')) {
      // Android devices vary, use more conservative settings
      return {
        ...baseConstraints,
        channelCount: 1
        // Don't specify sample rate, let device choose
      };
    } else {
      // Desktop browsers
      return {
        ...baseConstraints,
        sampleRate: 16000,
        channelCount: 1
      };
    }
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

  const startThinking = () => {
    console.log('Starting thinking phase');
    setPhase('thinking');
    startTimer(thinkTime, () => {
      console.log('Thinking phase complete, starting recording');
      startRecording();
    });
  };

  const startRecording = async () => {
    console.log('Starting recording phase');
    try {
      // Stop any existing stream first
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.log('Previous recorder already stopped');
        }
      }

      const audioConstraints = getAudioConstraints();
      console.log('Requesting audio with constraints:', audioConstraints);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });

      console.log('Audio stream obtained, tracks:', stream.getAudioTracks().length);
      
      // Log actual track settings
      const track = stream.getAudioTracks()[0];
      if (track) {
        const settings = track.getSettings();
        console.log('Actual audio track settings:', settings);
      }

      chunksRef.current = [];
      
      const mimeType = getBestAudioFormat();
      console.log('Using MIME type:', mimeType);
      
      const recorderOptions = mimeType ? { mimeType } : {};
      
      // Add timeslice for more reliable data collection
      mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);

      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('Audio data available:', event.data.size, 'bytes', 'Type:', event.data.type);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('Recording stopped, creating blob from', chunksRef.current.length, 'chunks');
        
        // Calculate total size
        const totalSize = chunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
        console.log('Total audio data size:', totalSize, 'bytes');
        
        if (totalSize === 0) {
          console.error('No audio data recorded!');
          alert('No audio was recorded. Please check your microphone and try again.');
          setPhase('ready');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        const blob = new Blob(chunksRef.current, { 
          type: mimeType || 'audio/webm' 
        });
        
        console.log('Created blob:', blob.size, 'bytes, type:', blob.type);
        
        setAudioBlob(blob);
        
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        console.log('Audio blob created successfully');
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        alert(`Recording error: ${event.error?.message || 'Unknown error'}`);
        setPhase('ready');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.onstart = () => {
        console.log('MediaRecorder started successfully');
        console.log('MediaRecorder state:', mediaRecorderRef.current.state);
        console.log('MediaRecorder MIME type:', mediaRecorderRef.current.mimeType);
      };

      // Start recording with timeslice for better data collection
      console.log('Starting MediaRecorder...');
      mediaRecorderRef.current.start(1000); // Collect data every 1000ms
      setIsRecording(true);
      setPhase('recording');
      
      // Start recording timer
      startTimer(responseTime, () => {
        console.log('Recording time complete, stopping recording');
        stopRecording();
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      let errorMessage = 'Unable to access microphone. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Audio recording is not supported on this device.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      alert(errorMessage);
      setPhase('ready');
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording');
    if (mediaRecorderRef.current && isRecording) {
      try {
        console.log('MediaRecorder state before stop:', mediaRecorderRef.current.state);
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setPhase('completed');
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        console.log('Recording stopped successfully');
      } catch (error) {
        console.error('Error stopping recording:', error);
        setPhase('ready');
      }
    }
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
    if (audioBlob) {
      console.log('Submitting audio blob, size:', audioBlob.size, 'bytes, type:', audioBlob.type);
      
      // Additional validation
      if (audioBlob.size < 1000) { // Less than 1KB is probably empty
        console.warn('Audio blob is very small, might be empty');
        if (!confirm('The recording seems very short. Do you want to submit it anyway?')) {
          return;
        }
      }
      
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
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
            Device: {deviceInfo}
          </div>
        )}

        {/* Phase Indicator */}
        <div className={`text-xl font-semibold ${
          phase === 'thinking' ? 'text-yellow-600' :
          phase === 'recording' ? 'text-red-600' :
          phase === 'completed' ? 'text-green-600' :
          'text-gray-700'
        }`}>
          {phase === 'ready' && 'Ready to Record Your Response'}
          {phase === 'thinking' && 'Think About Your Answer...'}
          {phase === 'recording' && 'Recording Your Response'}
          {phase === 'completed' && 'Recording Complete!'}
        </div>

        {/* Timer */}
        {(phase === 'thinking' || phase === 'recording') && (
          <div className="flex items-center justify-center space-x-3">
            <Clock className={`w-6 h-6 ${
              phase === 'thinking' ? 'text-yellow-600' : 'text-red-600'
            }`} />
            <span className={`text-4xl font-mono font-bold ${
              phase === 'thinking' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}

        {/* Instructions */}
        {phase === 'ready' && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-200">
            <p className="text-purple-800 font-medium">
              You will have <strong>{thinkTime} seconds</strong> to prepare your answer, 
              then <strong>{responseTime} seconds</strong> to record your response.
            </p>
          </div>
        )}

        {/* Phase-specific instructions */}
        {phase === 'thinking' && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200">
            <p className="text-yellow-800 font-medium">
              <strong>Thinking time:</strong> Prepare your answer. Recording will start automatically when time is up.
            </p>
          </div>
        )}

        {phase === 'recording' && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-xl border border-red-200">
            <p className="text-red-800 font-medium">
              <strong>Recording now:</strong> Speak clearly into your microphone. You can stop early or let the timer run out.
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          {phase === 'ready' && (
            <button 
              onClick={startThinking}
              disabled={disabled}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all transform hover:scale-105"
            >
              <Mic className="w-6 h-6 mr-3" />
              Start Recording
            </button>
          )}

          {phase === 'thinking' && (
            <button 
              disabled
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-xl opacity-75 cursor-not-allowed flex items-center font-semibold text-lg"
            >
              <Clock className="w-6 h-6 mr-3" />
              Thinking...
            </button>
          )}

          {phase === 'recording' && (
            <button 
              onClick={stopRecording}
              className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-red-700 hover:to-pink-700 flex items-center font-semibold text-lg transition-all transform hover:scale-105"
            >
              <Square className="w-6 h-6 mr-3" />
              Stop Recording
            </button>
          )}

          {phase === 'completed' && audioUrl && (
            <div className="flex space-x-4">
              <button 
                onClick={playAudio}
                className="border-2 border-purple-300 text-purple-700 px-6 py-4 rounded-xl hover:bg-purple-50 flex items-center font-semibold transition-all"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Play Recording
                  </>
                )}
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

        {/* Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-3 text-red-600">
            <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
            <span className="font-semibold">Recording in progress...</span>
          </div>
        )}

        {/* Debug info for completed recordings */}
        {phase === 'completed' && audioBlob && process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
            Recorded: {audioBlob.size} bytes, Type: {audioBlob.type}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;