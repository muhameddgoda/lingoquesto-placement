# Enhanced speech_ace_service.py with better audio handling

import base64
import requests
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
import tempfile
import subprocess
import shutil

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

def _detect_audio_format_enhanced(file_path: str) -> dict:
    """Enhanced audio format detection with more details"""
    try:
        file_path = Path(file_path)
        
        # Get file extension
        file_ext = file_path.suffix.lower()
        
        # Read file header for magic bytes detection
        with open(file_path, 'rb') as f:
            header = f.read(16)  # Read more bytes for better detection
        
        format_info = {
            "extension": file_ext,
            "detected_format": None,
            "magic_bytes": header[:8].hex(),
            "file_size": file_path.stat().st_size,
            "confidence": "low"
        }
        
        # Check magic bytes for accurate detection
        if header.startswith(b'RIFF') and b'WAVE' in header:
            format_info.update({
                "detected_format": "wav",
                "mime_type": "audio/wav",
                "confidence": "high"
            })
        elif header.startswith(b'\x1a\x45\xdf\xa3'):
            format_info.update({
                "detected_format": "webm", 
                "mime_type": "audio/webm",
                "confidence": "high"
            })
        elif header.startswith(b'ID3') or header[:2] in [b'\xff\xfb', b'\xff\xfa']:
            format_info.update({
                "detected_format": "mp3",
                "mime_type": "audio/mpeg", 
                "confidence": "high"
            })
        elif header[4:8] == b'ftyp':
            format_info.update({
                "detected_format": "mp4",
                "mime_type": "audio/mp4",
                "confidence": "high"
            })
        elif header.startswith(b'OggS'):
            format_info.update({
                "detected_format": "ogg",
                "mime_type": "audio/ogg",
                "confidence": "high"
            })
        else:
            # Fallback to extension
            extension_mapping = {
                '.wav': ('wav', 'audio/wav'),
                '.mp3': ('mp3', 'audio/mpeg'),
                '.m4a': ('mp4', 'audio/mp4'),
                '.mp4': ('mp4', 'audio/mp4'),
                '.ogg': ('ogg', 'audio/ogg'),
                '.webm': ('webm', 'audio/webm')
            }
            
            if file_ext in extension_mapping:
                fmt, mime = extension_mapping[file_ext]
                format_info.update({
                    "detected_format": fmt,
                    "mime_type": mime,
                    "confidence": "medium"
                })
            else:
                # Final fallback
                format_info.update({
                    "detected_format": "webm",
                    "mime_type": "audio/webm", 
                    "confidence": "low"
                })
        
        logger.info(f"Audio format detection: {format_info}")
        return format_info
        
    except Exception as e:
        logger.error(f"Error detecting audio format: {e}")
        return {
            "extension": ".unknown",
            "detected_format": "webm",
            "mime_type": "audio/webm",
            "confidence": "fallback",
            "error": str(e)
        }

def _validate_audio_file(file_path: str) -> dict:
    """Validate audio file before processing"""
    try:
        file_path = Path(file_path)
        
        if not file_path.exists():
            return {"valid": False, "error": "File does not exist"}
        
        file_size = file_path.stat().st_size
        
        # Check minimum size (1KB)
        if file_size < 1000:
            return {
                "valid": False, 
                "error": f"File too small: {file_size} bytes. Minimum 1KB required.",
                "file_size": file_size
            }
        
        # Check maximum size (50MB)
        if file_size > 50 * 1024 * 1024:
            return {
                "valid": False,
                "error": f"File too large: {file_size} bytes. Maximum 50MB allowed.",
                "file_size": file_size
            }
        
        # Try to read file
        try:
            with open(file_path, 'rb') as f:
                header = f.read(16)
            
            if len(header) == 0:
                return {"valid": False, "error": "File is empty"}
                
        except Exception as e:
            return {"valid": False, "error": f"Cannot read file: {e}"}
        
        return {
            "valid": True,
            "file_size": file_size,
            "readable": True
        }
        
    except Exception as e:
        return {"valid": False, "error": f"Validation error: {e}"}

def _b64_from_path_enhanced(file_path: str) -> tuple[str, str, dict]:
    """Enhanced conversion with validation and detailed logging"""
    try:
        # Validate file first
        validation = _validate_audio_file(file_path)
        if not validation["valid"]:
            raise ValueError(f"Audio validation failed: {validation['error']}")
        
        # Detect format
        format_info = _detect_audio_format_enhanced(file_path)
        audio_format = format_info["detected_format"]
        
        logger.info(f"Processing audio file: {file_path}")
        logger.info(f"File size: {validation['file_size']} bytes")
        logger.info(f"Detected format: {audio_format} (confidence: {format_info['confidence']})")
        
        # Read the file
        with open(file_path, "rb") as f:
            audio_data = f.read()
        
        if len(audio_data) == 0:
            raise ValueError("Audio file is empty")
        
        if len(audio_data) != validation["file_size"]:
            logger.warning(f"File size mismatch: expected {validation['file_size']}, got {len(audio_data)}")
        
        # Convert to base64
        base64_data = base64.b64encode(audio_data).decode("utf-8")
        
        processing_info = {
            "original_size": len(audio_data),
            "base64_length": len(base64_data),
            "format_info": format_info,
            "validation": validation
        }
        
        logger.info(f"Base64 conversion complete: {len(base64_data)} characters")
        
        return base64_data, audio_format, processing_info
        
    except Exception as e:
        logger.error(f"Error processing audio file {file_path}: {e}")
        raise

def lc_unscripted_sync(audio_input, question: str = None, context_description: str = None, accent: str = "us", user_metadata: dict = None):
    """Enhanced unscripted speech assessment with better error handling"""
    
    if not LC_KEY:
        logger.error("LC_API_KEY not found in environment variables")
        return {"error": "api_key_missing", "message": "LC_API_KEY not configured"}
    
    url = f"{LC_BASE}/speech-assessment/unscripted/{accent}"
    
    try:
        # Handle file path input with enhanced processing
        if isinstance(audio_input, str):
            logger.info(f"Processing audio file for unscripted assessment: {audio_input}")
            audio_base64, audio_format, processing_info = _b64_from_path_enhanced(audio_input)
            
            # Log processing details
            logger.info(f"Audio processing completed:")
            logger.info(f"  - Original size: {processing_info['original_size']} bytes")
            logger.info(f"  - Format: {audio_format}")
            logger.info(f"  - Detection confidence: {processing_info['format_info']['confidence']}")
            
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
            context = {
                "question": "Please speak about the given topic",
                "context_description": "Free speech assessment"
            }
        
        payload = {
            "audio_base64": audio_base64,
            "audio_format": audio_format,
            "context": context
        }
        
        logger.info(f"Calling Language Confidence unscripted API: {url}")
        logger.info(f"Context: {context}")
        logger.info(f"Audio format: {audio_format}")
        logger.info(f"Payload size: {len(str(payload))} characters")
        
        # Make request with extended timeout for larger files
        timeout = 120 if processing_info['original_size'] > 1024*1024 else 90
        response = requests.post(url, headers=HEADERS, json=payload, timeout=timeout)
        
        logger.info(f"API response status: {response.status_code}")
        logger.info(f"Response headers: {dict(response.headers)}")
        
        if response.status_code >= 400:
            error_text = response.text
            logger.error(f"Language Confidence API error {response.status_code}: {error_text}")
            
            # Parse common errors
            if "audio" in error_text.lower():
                return {
                    "error": "audio_error",
                    "status": response.status_code,
                    "message": "Audio processing failed on server side",
                    "details": error_text[:500],
                    "processing_info": processing_info
                }
            else:
                return {
                    "error": "api_error",
                    "status": response.status_code,
                    "message": error_text[:500],
                    "processing_info": processing_info
                }
        
        result = response.json()
        
        # Enhanced result logging
        logger.info("Language Confidence unscripted API SUCCESS!")
        
        if "words" in result:
            word_count = len(result["words"])
            logger.info(f"Response contains {word_count} words")
            
            if word_count == 0:
                logger.warning("No words detected in audio!")
                logger.warning("Possible issues:")
                logger.warning("  - Audio contains no speech")
                logger.warning("  - Audio is too quiet/low quality")
                logger.warning(f"  - Format incompatibility (using {audio_format})")
                logger.warning("  - Language detection issues")
                
                result["processing_info"] = processing_info
                result["warnings"] = ["No speech detected in audio"]
            else:
                # Log sample words for verification
                for i, word in enumerate(result["words"][:3]):
                    word_text = word.get("word_text", word.get("text", ""))
                    phoneme_count = len(word.get("phonemes", []))
                    logger.info(f"  Word {i+1}: '{word_text}' ({phoneme_count} phonemes)")
        
        # Add processing metadata to result
        result["audio_processing_info"] = processing_info
        
        return result
        
    except requests.exceptions.Timeout:
        logger.error(f"Language Confidence API request timed out (timeout: {timeout}s)")
        return {
            "error": "timeout", 
            "message": f"API request timed out after {timeout} seconds",
            "processing_info": processing_info if 'processing_info' in locals() else None
        }
    except Exception as e:
        logger.error(f"Error calling Language Confidence API: {e}")
        return {
            "error": "client_error", 
            "message": str(e),
            "processing_info": processing_info if 'processing_info' in locals() else None
        }

def lc_pronunciation_sync(audio_input, expected_text: str, accent: str = "us", user_metadata: dict = None):
    """Enhanced pronunciation assessment with better error handling"""
    
    if not LC_KEY:
        logger.error("LC_API_KEY not found in environment variables")
        return {"error": "api_key_missing", "message": "LC_API_KEY not configured"}
    
    url = f"{LC_BASE}/pronunciation/{accent}"
    
    try:
        # Handle file path input with enhanced processing
        if isinstance(audio_input, str):
            logger.info(f"Processing audio file for pronunciation assessment: {audio_input}")
            audio_base64, audio_format, processing_info = _b64_from_path_enhanced(audio_input)
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
            "audio_format": audio_format,
            "expected_text": expected_text,
            "user_metadata": user_metadata
        }
        
        logger.info(f"Calling Language Confidence pronunciation API: {url}")
        logger.info(f"Expected text: '{expected_text}'")
        logger.info(f"Audio format: {audio_format}")
        
        # Make request
        response = requests.post(url, headers=HEADERS, json=payload, timeout=90)
        
        logger.info(f"API response status: {response.status_code}")
        
        if response.status_code >= 400:
            error_text = response.text
            logger.error(f"Language Confidence API error {response.status_code}: {error_text}")
            return {
                "error": "api_error",
                "status": response.status_code,
                "message": error_text[:500],
                "processing_info": processing_info
            }
        
        result = response.json()
        logger.info("Language Confidence pronunciation API SUCCESS!")
        
        if "words" in result:
            word_count = len(result["words"])
            logger.info(f"Response contains {word_count} words")
            
            # Log sample words
            for i, word in enumerate(result["words"][:3]):
                word_text = word.get("word_text", word.get("text", ""))
                phoneme_count = len(word.get("phonemes", []))
                logger.info(f"  Word {i+1}: '{word_text}' ({phoneme_count} phonemes)")
        
        # Add processing metadata
        result["audio_processing_info"] = processing_info
        
        return result
        
    except requests.exceptions.Timeout:
        logger.error("Language Confidence pronunciation API request timed out")
        return {
            "error": "timeout", 
            "message": "API request timed out",
            "processing_info": processing_info if 'processing_info' in locals() else None
        }
    except Exception as e:
        logger.error(f"Error calling Language Confidence pronunciation API: {e}")
        return {
            "error": "client_error", 
            "message": str(e),
            "processing_info": processing_info if 'processing_info' in locals() else None
        }

# Keep async version for compatibility
async def lc_unscripted(audio_input, question: str = None, context_description: str = None, accent: str = "us", user_metadata: dict = None):
    """Async wrapper around enhanced sync function"""
    return lc_unscripted_sync(audio_input, question, context_description, accent, user_metadata)

async def lc_pronunciation(audio_input, expected_text: str, accent: str = "us", user_metadata: dict = None):
    """Async wrapper around enhanced sync function"""
    return lc_pronunciation_sync(audio_input, expected_text, accent, user_metadata)