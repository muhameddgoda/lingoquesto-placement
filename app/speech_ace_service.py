# app/speech_ace_service.py - Updated to handle WebM directly
import base64
import requests
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
import tempfile

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

def _detect_audio_format(file_path: str) -> str:
    """Detect audio format from file extension and content"""
    try:
        # Get file extension
        file_ext = Path(file_path).suffix.lower()
        
        # Map extensions to format names that Language Confidence accepts
        format_mapping = {
            '.wav': 'wav',
            '.mp3': 'mp3', 
            '.m4a': 'm4a',
            '.ogg': 'ogg',
            '.webm': 'webm',
            '.mp4': 'mp4',
            '.aac': 'aac'
        }
        
        if file_ext in format_mapping:
            detected_format = format_mapping[file_ext]
            logger.info(f"Detected audio format: {detected_format} from extension {file_ext}")
            return detected_format
        
        # If extension not recognized, check file header
        with open(file_path, 'rb') as f:
            header = f.read(12)
        
        # Check magic bytes for common formats
        if header.startswith(b'RIFF') and b'WAVE' in header:
            logger.info("Detected WAV format from file header")
            return 'wav'
        elif header.startswith(b'ID3') or header[0:2] == b'\xff\xfb':
            logger.info("Detected MP3 format from file header")
            return 'mp3'
        elif header.startswith(b'\x1a\x45\xdf\xa3'):
            logger.info("Detected WebM format from file header")
            return 'webm'
        elif header[4:8] == b'ftyp':
            logger.info("Detected MP4/M4A format from file header")
            return 'mp4'
        elif header.startswith(b'OggS'):
            logger.info("Detected OGG format from file header")
            return 'ogg'
        
        # Default fallback - assume it's WebM since that's what our frontend produces
        logger.warning(f"Could not detect format, defaulting to webm for file: {file_path}")
        return 'webm'
        
    except Exception as e:
        logger.error(f"Error detecting audio format: {e}")
        return 'webm'  # Safe default

def _b64_from_path(file_path: str) -> tuple[str, str]:
    """Convert file to base64 and return (base64_data, format)"""
    try:
        # Detect the audio format
        audio_format = _detect_audio_format(file_path)
        
        # Read the file directly - no conversion needed!
        with open(file_path, "rb") as f:
            audio_data = f.read()
        
        logger.info(f"Audio file size: {len(audio_data)} bytes, format: {audio_format}")
        
        # Convert to base64
        base64_data = base64.b64encode(audio_data).decode("utf-8")
        logger.info(f"Base64 length: {len(base64_data)} characters")
        
        return base64_data, audio_format
        
    except Exception as e:
        logger.error(f"Error processing audio file {file_path}: {e}")
        raise

def lc_unscripted_sync(audio_input, question: str = None, context_description: str = None, accent: str = "us", user_metadata: dict = None):
    """Call Language Confidence unscripted speech assessment API synchronously"""
    
    if not LC_KEY:
        logger.error("LC_API_KEY not found in environment variables")
        return {"error": "api_key_missing", "message": "LC_API_KEY not configured"}
    
    url = f"{LC_BASE}/speech-assessment/unscripted/{accent}"
    
    try:
        # Handle file path input
        if isinstance(audio_input, str):
            if not os.path.exists(audio_input):
                logger.error(f"Audio file does not exist: {audio_input}")
                return {"error": "file_not_found", "message": f"Audio file not found: {audio_input}"}
            
            logger.info(f"Processing audio file for unscripted assessment: {audio_input}")
            audio_base64, audio_format = _b64_from_path(audio_input)
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
            "audio_format": audio_format,  # Use detected format
            "context": context
        }
        
        logger.info(f"Calling Language Confidence unscripted API: {url}")
        logger.info(f"Context: {context}")
        logger.info(f"Audio format: {audio_format}")
        logger.info(f"Payload keys: {list(payload.keys())}")
        
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
        logger.info(f"Full API response: {result}")
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
    """Call Language Confidence pronunciation API synchronously"""
    
    if not LC_KEY:
        logger.error("LC_API_KEY not found in environment variables")
        return {"error": "api_key_missing", "message": "LC_API_KEY not configured"}
    
    url = f"{LC_BASE}/pronunciation/{accent}"
    
    try:
        # Handle file path input
        if isinstance(audio_input, str):
            if not os.path.exists(audio_input):
                logger.error(f"Audio file does not exist: {audio_input}")
                return {"error": "file_not_found", "message": f"Audio file not found: {audio_input}"}
            
            logger.info(f"Processing audio file: {audio_input}")
            audio_base64, audio_format = _b64_from_path(audio_input)
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
            "audio_format": audio_format,  # Use detected format
            "expected_text": expected_text,
            "user_metadata": user_metadata
        }
        
        logger.info(f"Calling Language Confidence API: {url}")
        logger.info(f"Expected text: '{expected_text}'")
        logger.info(f"Audio format: {audio_format}")
        
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