# app/speech_ace_service.py - Fixed with proper audio processing
import base64
import requests
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
import tempfile
from pydub import AudioSegment

# Load environment variables
load_dotenv()

LC_BASE = "https://apis.languageconfidence.ai"
LC_KEY = os.getenv("LC_API_KEY", "").strip()

HEADERS = {
    "api-key": LC_KEY,
    "Accept": "application/json",
    "Content-Type": "application/json",
}

logger = logging.getLogger(__name__)

# Replace the entire _convert_to_wav16k_mono function in speech_ace_service.py

def _convert_to_wav16k_mono(input_path: str) -> str:
    """Convert audio using librosa which handles WebM files"""
    import tempfile
    import os
    
    try:
        # Try using librosa which can handle WebM files
        import librosa
        import soundfile as sf
        
        logger.info(f"Loading audio file with librosa: {input_path}")
        
        # Load audio with librosa (handles many formats including WebM)
        audio_data, sample_rate = librosa.load(
            input_path, 
            sr=16000,  # Resample to 16kHz
            mono=True  # Convert to mono
        )
        
        logger.info(f"Loaded audio: {len(audio_data)} samples at {sample_rate}Hz")
        
        # Create temporary WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_path = temp_file.name
        
        # Write as WAV using soundfile
        sf.write(temp_path, audio_data, sample_rate, format='WAV', subtype='PCM_16')
        
        # Verify the output
        duration_sec = len(audio_data) / sample_rate
        file_size = os.path.getsize(temp_path)
        
        logger.info(f"Successfully converted to: {temp_path}")
        logger.info(f"Output: 16kHz mono WAV, duration: {duration_sec:.2f}s, size: {file_size} bytes")
        
        return temp_path
        
    except ImportError as e:
        logger.error(f"librosa/soundfile not available: {e}")
        return _fallback_copy(input_path)
    except Exception as e:
        logger.error(f"Error with librosa conversion: {e}")
        return _fallback_copy(input_path)

def _fallback_copy(input_path: str) -> str:
    """Fallback: just copy the file"""
    import tempfile
    import shutil
    
    logger.warning("Using direct file copy as fallback")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
        temp_path = temp_file.name
    
    shutil.copy2(input_path, temp_path)
    return temp_path

def _b64_from_path(file_path: str) -> str:
    """Convert file to base64 with proper audio conversion"""
    converted_path = None
    try:
        # Convert to proper format first
        converted_path = _convert_to_wav16k_mono(file_path)
        
        # Read the converted file
        with open(converted_path, "rb") as f:
            audio_data = f.read()
        
        logger.info(f"Audio file size: {len(audio_data)} bytes")
        
        # Convert to base64
        base64_data = base64.b64encode(audio_data).decode("utf-8")
        logger.info(f"Base64 length: {len(base64_data)} characters")
        
        return base64_data
        
    except Exception as e:
        logger.error(f"Error processing audio file {file_path}: {e}")
        raise
    finally:
        # Clean up temporary file
        if converted_path and os.path.exists(converted_path):
            try:
                os.remove(converted_path)
                logger.debug(f"Cleaned up temporary file: {converted_path}")
            except Exception as e:
                logger.warning(f"Could not remove temporary file {converted_path}: {e}")

def lc_unscripted_sync(audio_input, question: str = None, context_description: str = None, accent: str = "us", user_metadata: dict = None):
    """Call Language Confidence unscripted speech assessment API synchronously"""
    
    if not LC_KEY:
        logger.error("LC_API_KEY not found in environment variables")
        return {"error": "api_key_missing", "message": "LC_API_KEY not configured"}
    
    url = f"{LC_BASE}/speech-assessment/unscripted/{accent}"
    
    try:
        # Handle file path input with proper conversion
        if isinstance(audio_input, str):
            if not os.path.exists(audio_input):
                logger.error(f"Audio file does not exist: {audio_input}")
                return {"error": "file_not_found", "message": f"Audio file not found: {audio_input}"}
            
            logger.info(f"Processing audio file for unscripted assessment: {audio_input}")
            audio_base64 = _b64_from_path(audio_input)
        else:
            logger.error(f"Unsupported audio input type: {type(audio_input)}")
            return {"error": "unsupported_input", "message": "Only file paths supported currently"}
        
        # Build context object
        context = {}
        if question:
            context["question"] = question
        if context_description:
            context["context_description"] = context_description
        
        if not context:
            # Default context for open response
            context = {
                "question": "Please speak about the given topic",
                "context_description": "Free speech assessment"
            }
        
        # Note: user_metadata is NOT included for unscripted API
        payload = {
            "audio_base64": audio_base64,
            "audio_format": "wav",
            "context": context
        }
        
        logger.info(f"Calling Language Confidence unscripted API: {url}")
        logger.info(f"Context: {context}")
        logger.info(f"Audio format: WAV 16kHz mono")
        logger.info(f"Payload keys: {list(payload.keys())}")  # Debug what we're sending
        
        # Make synchronous request
        response = requests.post(url, headers=HEADERS, json=payload, timeout=90)
        
        logger.info(f"Unscripted API response status: {response.status_code}")
        
        if response.status_code >= 400:
            logger.error(f"Language Confidence unscripted API error {response.status_code}: {response.text}")
            return {
                "error": "api_error", 
                "status": response.status_code, 
                "message": response.text[:500]
            }
        
        result = response.json()
        logger.info(f"Language Confidence unscripted API SUCCESS!")
        logger.info(f"Full API response: {result}")  # Debug: see full response
        logger.info(f"Response contains {len(result.get('words', []))} words")
        
        # Check if there's any error or message in the response
        if "error" in result:
            logger.error(f"API returned error: {result['error']}")
        if "message" in result:
            logger.info(f"API message: {result['message']}")
        if "warnings" in result:
            logger.warning(f"API warnings: {result['warnings']}")
        
        # Check audio processing info
        if "metadata" in result:
            logger.info(f"Audio metadata from API: {result['metadata']}")
        
        # Log some details about the response
        if "words" in result and result["words"]:
            for i, word in enumerate(result["words"][:3]):  # Log first 3 words
                word_text = word.get("word_text", word.get("text", ""))
                phoneme_count = len(word.get("phonemes", []))
                logger.info(f"  Word {i+1}: '{word_text}' ({phoneme_count} phonemes)")
        else:
            logger.warning("No words detected in audio! Possible issues:")
            logger.warning("  - Audio might be too quiet")
            logger.warning("  - Audio might be silence/no speech")
            logger.warning("  - Audio format might be incompatible")
            logger.warning("  - Speech might be in wrong language")
        
        return result
        
    except requests.exceptions.Timeout:
        logger.error("Language Confidence unscripted API request timed out")
        return {"error": "timeout", "message": "API request timed out"}
    except Exception as e:
        logger.error(f"Error calling Language Confidence unscripted API: {e}")
        return {"error": "client_error", "message": str(e)}

def lc_pronunciation_sync(audio_input, expected_text: str, accent: str = "us", user_metadata: dict = None):
    """Call Language Confidence pronunciation API synchronously with proper audio processing"""
    
    if not LC_KEY:
        logger.error("LC_API_KEY not found in environment variables")
        return {"error": "api_key_missing", "message": "LC_API_KEY not configured"}
    
    url = f"{LC_BASE}/pronunciation/{accent}"
    
    try:
        # Handle file path input with proper conversion
        if isinstance(audio_input, str):
            if not os.path.exists(audio_input):
                logger.error(f"Audio file does not exist: {audio_input}")
                return {"error": "file_not_found", "message": f"Audio file not found: {audio_input}"}
            
            logger.info(f"Processing audio file: {audio_input}")
            audio_base64 = _b64_from_path(audio_input)
        else:
            logger.error(f"Unsupported audio input type: {type(audio_input)}")
            return {"error": "unsupported_input", "message": "Only file paths supported currently"}
        
        # Default metadata
        if user_metadata is None:
            user_metadata = {
                "speaker_gender": "male",
                "speaker_age": "adult",
                "speaker_english_level": "intermediate"
            }
        
        payload = {
            "audio_base64": audio_base64,
            "audio_format": "wav",  # We always convert to WAV
            "expected_text": expected_text,
            "user_metadata": user_metadata
        }
        
        logger.info(f"Calling Language Confidence API: {url}")
        logger.info(f"Expected text: '{expected_text}'")
        logger.info(f"Audio format: WAV 16kHz mono")
        
        # Make synchronous request
        response = requests.post(url, headers=HEADERS, json=payload, timeout=60)
        
        logger.info(f"API response status: {response.status_code}")
        
        if response.status_code >= 400:
            logger.error(f"Language Confidence API error {response.status_code}: {response.text}")
            return {
                "error": "api_error", 
                "status": response.status_code, 
                "message": response.text[:500]
            }
        
        result = response.json()
        logger.info(f"Language Confidence API SUCCESS!")
        logger.info(f"Response contains {len(result.get('words', []))} words")
        
        # Log some details about the response
        if "words" in result:
            for i, word in enumerate(result["words"][:3]):  # Log first 3 words
                word_text = word.get("word_text", word.get("text", ""))
                phoneme_count = len(word.get("phonemes", []))
                logger.info(f"  Word {i+1}: '{word_text}' ({phoneme_count} phonemes)")
        
        return result
        
    except requests.exceptions.Timeout:
        logger.error("Language Confidence API request timed out")
        return {"error": "timeout", "message": "API request timed out"}
    except Exception as e:
        logger.error(f"Error calling Language Confidence API: {e}")
        return {"error": "client_error", "message": str(e)}

# Keep async version for compatibility
async def lc_pronunciation(audio_input, expected_text: str, accent: str = "us", user_metadata: dict = None):
    """Async wrapper around sync function"""
    return lc_pronunciation_sync(audio_input, expected_text, accent, user_metadata)