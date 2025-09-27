# app/main.py
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Optional
import logging
import os
import uuid
from pathlib import Path
import json
from fastapi.responses import FileResponse

app = FastAPI()
logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Local development
        "http://localhost:5173",   # Vite dev server
        "https://placement.lingoquesto.com",  # Replace with your actual frontend URL
        # Remove "*" for security in production
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)

# Mount static directories
def setup_static_files():
    """Setup static file serving with error handling"""
    
    # Mount questions/audio directory for dictation and listen_mcq questions
    questions_audio_path = Path("questions/audio")
    if questions_audio_path.exists():
        app.mount("/audio", StaticFiles(directory=str(questions_audio_path)), name="audio")
        print(f"✅ Mounted /audio from {questions_audio_path.absolute()}")
    else:
        print(f"⚠️  Audio directory not found: {questions_audio_path.absolute()}")
    
    # Mount questions/images directory for image description questions
    questions_images_path = Path("questions/images") 
    if questions_images_path.exists():
        app.mount("/images", StaticFiles(directory=str(questions_images_path)), name="images")
        print(f"✅ Mounted /images from {questions_images_path.absolute()}")
    else:
        print(f"⚠️  Images directory not found: {questions_images_path.absolute()}")
    
    # Mount uploads directory for user uploaded audio
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
    print(f"✅ Mounted /uploads from {uploads_dir.absolute()}")

# Call the setup function
setup_static_files()

# Add a debug endpoint to list available files
@app.get("/api/debug/files")
async def debug_files():
    """Debug endpoint to check what files are available"""
    file_info = {}
    
    # Check audio files
    audio_dir = Path("questions/audio")
    if audio_dir.exists():
        audio_files = [f.name for f in audio_dir.glob("*.wav")]
        file_info["audio_files"] = audio_files[:10]  # First 10 files
        file_info["total_audio_files"] = len(audio_files)
    else:
        file_info["audio_files"] = []
        file_info["audio_directory_exists"] = False
    
    # Check image files  
    images_dir = Path("questions/images")
    if images_dir.exists():
        image_files = [f.name for f in images_dir.glob("*")]
        file_info["image_files"] = image_files
        file_info["total_image_files"] = len(image_files)
    else:
        file_info["image_files"] = []
        file_info["images_directory_exists"] = False
    
    file_info["current_directory"] = str(Path.cwd().absolute())
    
    return {
        "success": True,
        "data": file_info
    }

# Serve uploaded files
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Try to initialize exam manager with error handling
exam_manager = None
try:
    from .exam_manager import ExamManager
    exam_manager = ExamManager()
    logger.info("Exam manager initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize exam manager: {e}")
    logger.error("Starting with minimal functionality...")

class StartExamRequest(BaseModel):
    user_id: str

class SubmitResponseRequest(BaseModel):
    session_id: str
    q_id: str
    response_type: str
    response_data: Optional[str] = None
    audio_file_path: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "English Proficiency Exam API is running", "status": "ok"}

@app.get("/api/health")
async def health_check():
    global exam_manager
    return {
        "status": "healthy", 
        "exam_manager": "ready" if exam_manager is not None else "failed",
        "error": "exam_manager not initialized" if exam_manager is None else None
    }

@app.get("/api/debug/config")
async def debug_config():
    """Debug endpoint to check configuration and questions"""
    try:
        if exam_manager is None:
            return {
                "success": False,
                "error": "Exam manager not initialized",
                "suggestions": [
                    "Check if questions folder exists in project root",
                    "Check if config file exists",
                    "Check backend logs for import errors"
                ]
            }
        
        # Check current working directory
        cwd = str(Path.cwd())
        
        # Check if questions folder exists
        questions_dir = Path("questions")
        questions_exists = questions_dir.exists()
        questions_files = []
        if questions_exists:
            questions_files = [f.name for f in questions_dir.glob("*.json")]
        
        # Check config
        config_paths = ["config/exam_config.json", "exam_config.json"]
        config_exists = {}
        for path in config_paths:
            config_exists[path] = Path(path).exists()
        
        return {
            "success": True,
            "data": {
                "exam_manager_status": "initialized",
                "current_directory": cwd,
                "questions_directory_exists": questions_exists,
                "questions_files": questions_files,
                "config_files_exist": config_exists,
                "config": getattr(exam_manager, 'config', {}),
                "questions_database": getattr(exam_manager, 'questions_db', {}),
                "total_questions": sum(
                    len(questions) 
                    for level_data in getattr(exam_manager, 'questions_db', {}).values() 
                    for questions in level_data.values()
                ) if hasattr(exam_manager, 'questions_db') else 0
            }
        }
    except Exception as e:
        logger.error(f"Error in debug config: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "current_directory": str(Path.cwd())
        }

@app.get("/api/debug/reload")
async def debug_reload():
    """Debug endpoint to reload configuration and questions"""
    try:
        global exam_manager
        from .exam_manager import ExamManager
        exam_manager = ExamManager()
        return {
            "success": True,
            "message": "Exam manager reloaded successfully",
            "questions_loaded": sum(
                len(questions) 
                for level_data in exam_manager.questions_db.values() 
                for questions in level_data.values()
            )
        }
    except Exception as e:
        logger.error(f"Error reloading exam manager: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/api/exam/start")
async def start_exam(request: StartExamRequest):
    """Start a new exam session"""
    try:
        if exam_manager is None:
            raise HTTPException(status_code=500, detail="Exam manager not initialized")
        
        result = exam_manager.start_exam(request.user_id)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Error starting exam: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-audio")
async def upload_audio(
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    q_id: str = Form(...)
):
    """Upload audio file and return file path"""
    try:
        # Create unique filename
        file_extension = audio.filename.split('.')[-1] if audio.filename and '.' in audio.filename else 'webm'
        unique_filename = f"{session_id}_{q_id}_{uuid.uuid4().hex}.{file_extension}"
        
        # Ensure upload directory exists
        audio_dir = uploads_dir / "audio"
        audio_dir.mkdir(exist_ok=True)
        
        file_path = audio_dir / unique_filename
        
        # Save the file
        with open(file_path, "wb") as buffer:
            content = await audio.read()
            buffer.write(content)
        
        logger.info(f"Audio file saved: {file_path}")
        
        return {
            "success": True,
            "file_path": str(file_path)
        }
    except Exception as e:
        logger.error(f"Error uploading audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/exam/submit-response")
async def submit_response(request: SubmitResponseRequest):
    """Submit a response and get next question or final results"""
    try:
        if exam_manager is None:
            raise HTTPException(status_code=500, detail="Exam manager not initialized")
        
        response_data = {
            "q_id": request.q_id,
            "response_type": request.response_type,
            "response_data": request.response_data,
            "audio_file_path": request.audio_file_path
        }
        
        result = exam_manager.process_response(
            request.session_id,
            response_data
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Error processing response: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/exam/status/{session_id}")
async def get_exam_status(session_id: str):
    """Get current exam status"""
    try:
        if exam_manager is None:
            raise HTTPException(status_code=500, detail="Exam manager not initialized")
        
        if session_id not in exam_manager.sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = exam_manager.sessions[session_id]
        return {
            "success": True,
            "data": {
                "status": session["status"],
                "current_level": session.get("current_level"),
                "exam_complete": session.get("exam_complete", False),
                "final_level": session.get("final_level"),
                "final_score": session.get("final_score")
            }
        }
    except Exception as e:
        logger.error(f"Error getting exam status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add this to your main.py file

@app.post("/api/debug/test-speech-ace")
async def debug_test_speech_ace(
    audio: UploadFile = File(...),
    test_type: str = Form("unscripted"),  # "scripted" or "unscripted"
    expected_text: str = Form(None)
):
    """Debug endpoint to test Speech Ace API directly"""
    try:
        from .speech_ace_service import lc_unscripted, lc_scripted
        
        # Test the Speech Ace API directly
        if test_type == "scripted" and expected_text:
            result = await lc_scripted(audio, expected_text=expected_text, accent="us")
        else:
            result = await lc_unscripted(
                audio, 
                question="Tell me about your hobbies", 
                context_description="The user should describe their hobbies and interests",
                accent="us"
            )
        
        # Log the raw result
        logger.info(f"Raw Speech Ace API result: {result}")
        
        # Check the structure
        structure_info = {
            "result_type": type(result).__name__,
            "has_words": "words" in result if isinstance(result, dict) else False,
            "words_count": len(result.get("words", [])) if isinstance(result, dict) and "words" in result else 0,
            "has_error": "error" in result if isinstance(result, dict) else False
        }
        
        # Check phoneme structure if words exist
        phoneme_info = []
        if isinstance(result, dict) and "words" in result and isinstance(result["words"], list):
            for i, word in enumerate(result["words"][:3]):  # Check first 3 words
                word_info = {
                    "word_index": i,
                    "word_text": word.get("text") or word.get("word"),
                    "has_phonemes": "phonemes" in word,
                    "phonemes_count": len(word.get("phonemes", [])),
                    "phoneme_keys": list(word.get("phonemes", [{}])[0].keys()) if word.get("phonemes") else []
                }
                phoneme_info.append(word_info)
        
        return {
            "success": True,
            "raw_result": result,
            "structure_info": structure_info,
            "phoneme_info": phoneme_info,
            "test_type": test_type,
            "expected_text": expected_text
        }
        
    except Exception as e:
        logger.error(f"Error testing Speech Ace API: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "test_type": test_type
        }
# Add this to your main.py debug endpoints

@app.get("/api/debug/questions/{level}")
async def debug_level_questions(level: str):
    """Debug what questions are available for a level"""
    try:
        if exam_manager is None:
            raise HTTPException(status_code=500, detail="Exam manager not initialized")
        
        level = level.upper()
        
        if level not in exam_manager.questions_db:
            return {
                "success": False,
                "error": f"Level {level} not found in questions database",
                "available_levels": list(exam_manager.questions_db.keys())
            }
        
        level_questions = exam_manager.questions_db[level]
        question_summary = {}
        
        for q_type, questions in level_questions.items():
            question_summary[q_type] = {
                "count": len(questions),
                "sample_ids": [q["id"] for q in questions[:3]],  # First 3 IDs
                "sample_questions": [
                    {
                        "id": q["id"],
                        "prompt": q["prompt"][:100] + "..." if len(q["prompt"]) > 100 else q["prompt"],
                        "has_expected_text": bool(q.get("metadata", {}).get("expectedText"))
                    }
                    for q in questions[:2]  # First 2 full questions
                ]
            }
        
        # Check config for this level
        level_config = exam_manager.config.get("exam", {}).get("per_level", {}).get(level, {})
        
        return {
            "success": True,
            "level": level,
            "questions_available": question_summary,
            "config_for_level": level_config,
            "total_questions": sum(len(questions) for questions in level_questions.values())
        }
        
    except Exception as e:
        logger.error(f"Error getting debug questions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
# Add this route after your existing routes
@app.get("/audio/{filename}")
async def get_audio_file(filename: str):
    """Serve audio files for dictation questions"""
    audio_path = Path("questions") / "audio" / filename
    
    if audio_path.exists():
        return FileResponse(
            str(audio_path),
            media_type="audio/wav",
            headers={"Cache-Control": "public, max-age=3600"}
        )
    else:
        logger.error(f"Audio file not found: {audio_path}")
        raise HTTPException(status_code=404, detail=f"Audio file {filename} not found")
    
@app.get("/api/debug/audio/{filename}")
async def debug_audio_file(filename: str):
    """Debug endpoint to check if audio file exists"""
    audio_path = Path("questions") / "audio" / filename
    
    return {
        "filename": filename,
        "path": str(audio_path),
        "exists": audio_path.exists(),
        "absolute_path": str(audio_path.absolute()) if audio_path.exists() else None,
        "file_size": audio_path.stat().st_size if audio_path.exists() else None
    }

import base64

@app.get("/api/image/{filename}")
async def get_image_base64(filename: str):
    """Return image as base64 data URL"""
    image_path = Path("questions") / "images" / filename
    
    if image_path.exists():
        try:
            with open(image_path, "rb") as f:
                image_data = f.read()
            
            # Determine MIME type
            ext = filename.lower().split('.')[-1]
            mime_types = {
                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
                'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp'
            }
            mime_type = mime_types.get(ext, 'image/jpeg')
            
            # Convert to base64
            base64_data = base64.b64encode(image_data).decode('utf-8')
            
            return {
                "success": True,
                "data_url": f"data:{mime_type};base64,{base64_data}"
            }
        except Exception as e:
            logger.error(f"Error reading image {filename}: {e}")
            raise HTTPException(status_code=500, detail="Error reading image")
    else:
        raise HTTPException(status_code=404, detail="Image not found")
    

@app.get("/api/debug/images")
async def debug_images():
    """Debug endpoint to check available images"""
    images_dir = Path("questions") / "images"
    
    if not images_dir.exists():
        return {
            "success": False,
            "error": "Images directory doesn't exist",
            "expected_path": str(images_dir.absolute())
        }
    
    image_files = list(images_dir.glob("*"))
    
    return {
        "success": True,
        "images_directory": str(images_dir.absolute()),
        "files_found": [f.name for f in image_files],
        "total_files": len(image_files)
    }

@app.get("/api/audio/{filename}")
async def get_audio_file_api(filename: str):
    """API endpoint to serve audio files"""
    try:
        audio_path = Path("questions") / "audio" / filename
        
        logger.info(f"Looking for audio file: {audio_path}")
        logger.info(f"Full path: {audio_path.absolute()}")
        logger.info(f"File exists: {audio_path.exists()}")
        
        if not audio_path.exists():
            # Try alternative paths
            alt_paths = [
                Path("questions/audio") / filename,
                Path(f"./questions/audio/{filename}"),
                Path.cwd() / "questions" / "audio" / filename
            ]
            
            for alt_path in alt_paths:
                logger.info(f"Trying alternative path: {alt_path.absolute()} - Exists: {alt_path.exists()}")
                if alt_path.exists():
                    audio_path = alt_path
                    break
            else:
                # List what files are actually available
                questions_dir = Path("questions")
                if questions_dir.exists():
                    audio_dir = questions_dir / "audio"
                    if audio_dir.exists():
                        available_files = [f.name for f in audio_dir.glob("*.wav")][:5]  # First 5 files
                        logger.error(f"Audio file {filename} not found. Available files: {available_files}")
                    else:
                        logger.error(f"Audio directory doesn't exist: {audio_dir.absolute()}")
                else:
                    logger.error(f"Questions directory doesn't exist: {questions_dir.absolute()}")
                
                raise HTTPException(
                    status_code=404, 
                    detail=f"Audio file {filename} not found"
                )
        
        return FileResponse(
            str(audio_path),
            media_type="audio/wav",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "*"
            }
        )
        
    except Exception as e:
        logger.error(f"Error serving audio file {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Error serving audio file: {str(e)}")

@app.get("/api/image/{filename}")  
async def get_image_file_api(filename: str):
    """API endpoint to serve image files"""
    try:
        image_path = Path("questions") / "images" / filename
        
        logger.info(f"Looking for image file: {image_path}")
        logger.info(f"File exists: {image_path.exists()}")
        
        if not image_path.exists():
            # List available images
            images_dir = Path("questions") / "images" 
            if images_dir.exists():
                available_images = [f.name for f in images_dir.glob("*")]
                logger.error(f"Image {filename} not found. Available: {available_images}")
            
            raise HTTPException(
                status_code=404, 
                detail=f"Image file {filename} not found"
            )
        
        # Determine MIME type
        ext = filename.lower().split('.')[-1]
        mime_types = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp'
        }
        mime_type = mime_types.get(ext, 'image/jpeg')
        
        return FileResponse(
            str(image_path),
            media_type=mime_type,
            headers={
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET", 
                "Access-Control-Allow-Headers": "*"
            }
        )
        
    except Exception as e:
        logger.error(f"Error serving image file {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Error serving image file: {str(e)}")

# Enhanced debug endpoint
@app.get("/api/debug/files")
async def debug_files():
    """Debug endpoint to check what files are available"""
    file_info = {
        "current_directory": str(Path.cwd().absolute()),
        "questions_directory_exists": False,
        "audio_directory_exists": False,
        "images_directory_exists": False,
        "audio_files": [],
        "image_files": [],
        "directory_contents": []
    }
    
    try:
        # Check current directory contents
        current_dir = Path.cwd()
        file_info["directory_contents"] = [item.name for item in current_dir.iterdir()][:10]
        
        # Check questions directory
        questions_dir = Path("questions")
        file_info["questions_directory_exists"] = questions_dir.exists()
        
        if questions_dir.exists():
            file_info["questions_contents"] = [item.name for item in questions_dir.iterdir()]
            
            # Check audio files
            audio_dir = questions_dir / "audio"
            file_info["audio_directory_exists"] = audio_dir.exists()
            
            if audio_dir.exists():
                audio_files = [f.name for f in audio_dir.glob("*.wav")]
                file_info["audio_files"] = audio_files[:10]  # First 10
                file_info["total_audio_files"] = len(audio_files)
            
            # Check image files
            images_dir = questions_dir / "images"
            file_info["images_directory_exists"] = images_dir.exists()
            
            if images_dir.exists():
                image_files = [f.name for f in images_dir.glob("*")]
                file_info["image_files"] = image_files[:10]  # First 10
                file_info["total_image_files"] = len(image_files)
    
    except Exception as e:
        file_info["error"] = str(e)
    
    return {
        "success": True,
        "data": file_info
    }

# Add this enhanced upload-audio endpoint to your main.py

@app.post("/api/upload-audio")
async def upload_audio(
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    q_id: str = Form(...)
):
    """Upload audio file with enhanced validation and format handling"""
    try:
        logger.info(f"Uploading audio for session {session_id}, question {q_id}")
        logger.info(f"Original filename: {audio.filename}")
        logger.info(f"Content type: {audio.content_type}")
        
        # Read the audio data
        audio_data = await audio.read()
        logger.info(f"Audio data size: {len(audio_data)} bytes")
        
        # Validate minimum file size (at least 1KB)
        if len(audio_data) < 1000:
            logger.error(f"Audio file too small: {len(audio_data)} bytes")
            raise HTTPException(
                status_code=400, 
                detail=f"Audio file too small ({len(audio_data)} bytes). Please record for longer."
            )
        
        # Detect and validate audio format
        detected_format = detect_audio_format(audio_data, audio.filename, audio.content_type)
        logger.info(f"Detected audio format: {detected_format}")
        
        # Create unique filename with detected extension
        unique_filename = f"{session_id}_{q_id}_{uuid.uuid4().hex}.{detected_format['extension']}"
        
        # Ensure upload directory exists
        audio_dir = uploads_dir / "audio"
        audio_dir.mkdir(exist_ok=True)
        
        file_path = audio_dir / unique_filename
        
        # Save the file
        with open(file_path, "wb") as buffer:
            buffer.write(audio_data)
        
        logger.info(f"Audio file saved: {file_path}")
        logger.info(f"File size on disk: {file_path.stat().st_size} bytes")
        
        # Additional validation: try to read the file back
        if not file_path.exists() or file_path.stat().st_size != len(audio_data):
            raise HTTPException(status_code=500, detail="File save verification failed")
        
        return {
            "success": True,
            "file_path": str(file_path),
            "file_size": len(audio_data),
            "detected_format": detected_format,
            "message": f"Audio uploaded successfully ({len(audio_data)} bytes)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


def detect_audio_format(audio_data: bytes, filename: str = None, content_type: str = None):
    """
    Detect audio format from file data, filename, and content type
    Returns dict with format info
    """
    
    # Check magic bytes (file signatures)
    if len(audio_data) < 12:
        return {"format": "unknown", "extension": "bin"}
    
    header = audio_data[:12]
    
    # WebM format
    if header.startswith(b'\x1a\x45\xdf\xa3'):
        return {"format": "webm", "extension": "webm", "mime": "audio/webm"}
    
    # WAV format
    if header.startswith(b'RIFF') and audio_data[8:12] == b'WAVE':
        return {"format": "wav", "extension": "wav", "mime": "audio/wav"}
    
    # MP3 format
    if header.startswith(b'ID3') or header[:2] in [b'\xff\xfb', b'\xff\xfa']:
        return {"format": "mp3", "extension": "mp3", "mime": "audio/mpeg"}
    
    # MP4/M4A format
    if header[4:8] == b'ftyp':
        return {"format": "mp4", "extension": "mp4", "mime": "audio/mp4"}
    
    # OGG format
    if header.startswith(b'OggS'):
        return {"format": "ogg", "extension": "ogg", "mime": "audio/ogg"}
    
    # Fallback to filename extension
    if filename:
        ext = filename.lower().split('.')[-1] if '.' in filename else None
        if ext in ['webm', 'wav', 'mp3', 'mp4', 'm4a', 'ogg']:
            return {
                "format": ext,
                "extension": ext,
                "mime": f"audio/{ext}"
            }
    
    # Fallback to content type
    if content_type and content_type.startswith('audio/'):
        format_name = content_type.split('/')[-1].split(';')[0]
        return {
            "format": format_name,
            "extension": format_name,
            "mime": content_type
        }
    
    # Default fallback - assume WebM since that's what most browsers produce
    logger.warning(f"Could not detect audio format, using webm fallback. Header: {header.hex()}")
    return {"format": "webm", "extension": "webm", "mime": "audio/webm"}


@app.get("/api/debug/test-audio-upload")
async def debug_audio_upload():
    """Debug endpoint to test audio upload functionality"""
    return {
        "upload_directory": str(uploads_dir.absolute()),
        "upload_dir_exists": uploads_dir.exists(),
        "audio_subdir_exists": (uploads_dir / "audio").exists(),
        "permissions": {
            "upload_dir_writable": os.access(uploads_dir, os.W_OK),
            "upload_dir_readable": os.access(uploads_dir, os.R_OK)
        }
    }

# Add these debug endpoints to your main.py for comprehensive audio debugging

@app.post("/api/debug/upload-and-analyze")
async def debug_upload_and_analyze(
    audio: UploadFile = File(...),
    user_agent: str = Form(""),
    platform: str = Form(""),
    browser: str = Form("")
):
    """Debug endpoint to analyze uploaded audio files in detail"""
    try:
        # Read audio data
        audio_data = await audio.read()
        
        analysis = {
            "client_info": {
                "user_agent": user_agent,
                "platform": platform,
                "browser": browser,
                "filename": audio.filename,
                "content_type": audio.content_type
            },
            "file_analysis": {
                "size_bytes": len(audio_data),
                "size_kb": round(len(audio_data) / 1024, 2),
                "header_hex": audio_data[:16].hex() if len(audio_data) >= 16 else audio_data.hex(),
                "is_empty": len(audio_data) == 0,
                "too_small": len(audio_data) < 1000
            }
        }
        
        # Detect format
        detected_format = detect_audio_format(audio_data, audio.filename, audio.content_type)
        analysis["format_detection"] = detected_format
        
        # Save file temporarily for further analysis
        temp_dir = uploads_dir / "debug"
        temp_dir.mkdir(exist_ok=True)
        
        debug_filename = f"debug_{uuid.uuid4().hex}_{detected_format['extension']}"
        debug_path = temp_dir / debug_filename
        
        with open(debug_path, "wb") as f:
            f.write(audio_data)
        
        analysis["file_saved"] = str(debug_path)
        
        # Try to analyze with speech service
        try:
            from .speech_ace_service import _validate_audio_file, _detect_audio_format_enhanced
            
            validation = _validate_audio_file(str(debug_path))
            enhanced_detection = _detect_audio_format_enhanced(str(debug_path))
            
            analysis["speech_service_validation"] = validation
            analysis["enhanced_format_detection"] = enhanced_detection
            
            # Try to process with Speech Ace API
            if validation["valid"]:
                try:
                    from .speech_ace_service import lc_unscripted_sync
                    
                    speech_result = lc_unscripted_sync(
                        str(debug_path),
                        question="This is a test audio file",
                        context_description="Debug test"
                    )
                    
                    analysis["speech_api_result"] = {
                        "success": "error" not in speech_result,
                        "word_count": len(speech_result.get("words", [])),
                        "has_error": "error" in speech_result,
                        "error_type": speech_result.get("error"),
                        "error_message": speech_result.get("message", ""),
                        "processing_info": speech_result.get("audio_processing_info", {})
                    }
                    
                except Exception as e:
                    analysis["speech_api_result"] = {
                        "success": False,
                        "error": f"Exception: {str(e)}"
                    }
            else:
                analysis["speech_api_result"] = {
                    "success": False,
                    "error": "File validation failed",
                    "validation_error": validation["error"]
                }
                
        except Exception as e:
            analysis["speech_service_error"] = str(e)
        
        # Determine likely issues
        issues = []
        if analysis["file_analysis"]["too_small"]:
            issues.append("File too small - likely recording didn't capture audio")
        if analysis["file_analysis"]["is_empty"]:
            issues.append("File is completely empty")
        if detected_format["format"] == "unknown":
            issues.append("Unknown audio format - may not be supported")
        
        analysis["likely_issues"] = issues
        
        # OS-specific recommendations
        recommendations = []
        if "android" in user_agent.lower():
            recommendations.extend([
                "Try using audio/mp4 format instead of WebM",
                "Check if MediaRecorder.start() is actually starting",
                "Verify microphone permissions are granted"
            ])
        elif "windows" in platform.lower() or "win" in user_agent.lower():
            recommendations.extend([
                "Try audio/wav format for better Windows compatibility",
                "Check for Windows audio driver issues",
                "Verify microphone is not being used by other apps"
            ])
        elif "mac" in platform.lower() or "darwin" in user_agent.lower():
            recommendations.extend([
                "Check Safari audio recording permissions",
                "Try audio/mp4 format for better macOS compatibility",
                "Verify System Preferences > Security > Microphone permissions"
            ])
        
        analysis["recommendations"] = recommendations
        
        return {
            "success": True,
            "analysis": analysis
        }
        
    except Exception as e:
        logger.error(f"Debug analysis error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/api/debug/browser-capabilities")
async def debug_browser_capabilities():
    """Return JavaScript code to test browser audio capabilities"""
    
    js_test_code = """
// Paste this code into your browser console to test audio capabilities

console.log('=== BROWSER AUDIO CAPABILITIES TEST ===');

// 1. Basic browser info
console.log('User Agent:', navigator.userAgent);
console.log('Platform:', navigator.platform);

// 2. MediaDevices support
console.log('MediaDevices supported:', !!navigator.mediaDevices);
console.log('getUserMedia supported:', !!navigator.mediaDevices?.getUserMedia);

// 3. MediaRecorder support
console.log('MediaRecorder supported:', !!window.MediaRecorder);

// 4. Test supported MIME types
if (window.MediaRecorder) {
    const formats = [
        'audio/webm;codecs=opus',
        'audio/webm;codecs=pcm', 
        'audio/webm',
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg;codecs=opus'
    ];
    
    console.log('Supported audio formats:');
    formats.forEach(format => {
        const supported = MediaRecorder.isTypeSupported(format);
        console.log(`  ${format}: ${supported}`);
    });
}

// 5. Test microphone access
async function testMicrophone() {
    try {
        console.log('Testing microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = stream.getAudioTracks();
        
        console.log('Microphone access: SUCCESS');
        console.log('Audio tracks:', tracks.length);
        
        if (tracks.length > 0) {
            const settings = tracks[0].getSettings();
            console.log('Track settings:', settings);
        }
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        
        return true;
    } catch (error) {
        console.error('Microphone access failed:', error);
        return false;
    }
}

// 6. Test recording
async function testRecording() {
    try {
        console.log('Testing audio recording...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Try the best format
        let mimeType = '';
        const formats = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
        for (const format of formats) {
            if (MediaRecorder.isTypeSupported(format)) {
                mimeType = format;
                break;
            }
        }
        
        console.log('Using format:', mimeType);
        
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        const chunks = [];
        
        recorder.ondataavailable = (event) => {
            console.log('Data received:', event.data.size, 'bytes');
            chunks.push(event.data);
        };
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            console.log('Recording complete. Blob size:', blob.size, 'bytes');
            console.log('Blob type:', blob.type);
            
            if (blob.size === 0) {
                console.error('❌ Recording produced empty blob!');
            } else if (blob.size < 1000) {
                console.warn('⚠️  Recording is very small, might be problematic');
            } else {
                console.log('✅ Recording seems successful');
            }
        };
        
        recorder.start();
        console.log('Recording started for 3 seconds...');
        
        setTimeout(() => {
            recorder.stop();
            stream.getTracks().forEach(track => track.stop());
        }, 3000);
        
    } catch (error) {
        console.error('Recording test failed:', error);
    }
}

// Run tests
testMicrophone().then(success => {
    if (success) {
        console.log('\\n=== Running recording test ===');
        testRecording();
    }
});
"""
    
    return {
        "success": True,
        "message": "Copy the JavaScript code below and paste it into your browser's developer console",
        "test_code": js_test_code
    }

@app.get("/api/debug/platform-specific-issues")
async def debug_platform_issues():
    """Get known issues and solutions for different platforms"""
    
    platform_issues = {
        "ios_safari": {
            "common_issues": [
                "WebM format not supported",
                "Requires user gesture to start recording",
                "Sample rate limitations"
            ],
            "solutions": [
                "Use audio/mp4 format",
                "Ensure recording starts after user interaction",
                "Use 44.1kHz sample rate or let browser choose"
            ],
            "recommended_settings": {
                "format": "audio/mp4",
                "constraints": {
                    "sampleRate": 44100,
                    "channelCount": 1,
                    "echoCancellation": True
                }
            }
        },
        "android_chrome": {
            "common_issues": [
                "WebM encoding problems",
                "Microphone permission delays",
                "MediaRecorder timing issues"
            ],
            "solutions": [
                "Use audio/mp4 or audio/webm;codecs=opus",
                "Add delay after getUserMedia before starting recorder",
                "Use timeslice parameter in start()"
            ],
            "recommended_settings": {
                "format": "audio/mp4",
                "constraints": {
                    "channelCount": 1,
                    "echoCancellation": True,
                    "noiseSuppression": True
                }
            }
        },
        "windows_chrome": {
            "common_issues": [
                "Audio driver conflicts",
                "Format encoding issues",
                "Timing problems with short recordings"
            ],
            "solutions": [
                "Use audio/wav for compatibility",
                "Add minimum recording duration",
                "Check for exclusive audio device access"
            ],
            "recommended_settings": {
                "format": "audio/wav",
                "constraints": {
                    "sampleRate": 16000,
                    "channelCount": 1
                }
            }
        },
        "macos_safari": {
            "common_issues": [
                "Strict permission requirements",
                "Format limitations",
                "Recording quality variations"
            ],
            "solutions": [
                "Use audio/mp4 format",
                "Ensure clear permission prompts",
                "Test with different sample rates"
            ],
            "recommended_settings": {
                "format": "audio/mp4",
                "constraints": {
                    "sampleRate": 44100,
                    "channelCount": 1
                }
            }
        }
    }
    
    return {
        "success": True,
        "platform_issues": platform_issues,
        "general_recommendations": [
            "Always validate audio blob size before uploading",
            "Implement format fallbacks",
            "Add proper error handling for getUserMedia",
            "Use timeslice parameter for more reliable data collection",
            "Test with actual devices, not just browser dev tools"
        ]
    }


# Add this endpoint to your main.py file

@app.post("/api/debug/test-duration-penalty")
async def test_duration_penalty(
    audio: UploadFile = File(...),
    question_type: str = Form("open_response"),
    expected_duration: int = Form(120),
    simulate_scores: str = Form("high")  # high, medium, low
):
    """Test duration-based fluency penalty with real audio files"""
    try:
        if exam_manager is None:
            raise HTTPException(status_code=500, detail="Exam manager not initialized")
        
        # Save uploaded audio temporarily
        audio_data = await audio.read()
        temp_filename = f"test_{uuid.uuid4().hex}.webm"
        temp_path = uploads_dir / "debug" / temp_filename
        temp_path.parent.mkdir(exist_ok=True)
        
        with open(temp_path, "wb") as f:
            f.write(audio_data)
        
        logger.info(f"Testing duration penalty with {temp_path}")
        
        # Calculate actual duration
        actual_duration = exam_manager._calculate_audio_duration(str(temp_path))
        
        # Create mock question info
        question_info = {
            "original_type": question_type,
            "timing": {
                "response_time_sec": expected_duration
            },
            "metadata": {
                "context": {
                    "question": "Test question for duration penalty analysis"
                }
            }
        }
        
        # Simulate Language Confidence scores
        score_scenarios = {
            "high": {"pronunciation": 85, "fluency": 88, "grammar": 82, "vocabulary": 80},
            "medium": {"pronunciation": 70, "fluency": 72, "grammar": 68, "vocabulary": 65},
            "low": {"pronunciation": 55, "fluency": 58, "grammar": 50, "vocabulary": 48}
        }
        simulated_scores = score_scenarios.get(simulate_scores, score_scenarios["high"])
        
        # Calculate penalty
        penalty_multiplier = exam_manager._calculate_fluency_penalty_multiplier(actual_duration, expected_duration)
        duration_percentage = (actual_duration / expected_duration * 100) if expected_duration > 0 else 100
        
        # Apply penalty to fluency
        original_fluency = simulated_scores["fluency"]
        penalized_fluency = original_fluency * penalty_multiplier if question_type in ["open_response", "image_description", "listen_answer"] else original_fluency
        
        # Get scoring profile
        profile_name = exam_manager.config["type_to_profile"].get(question_type, "unscripted_mixed")
        scoring_profile = exam_manager.config["scoring_profiles"][profile_name]
        
        # Calculate weighted scores (before penalty)
        original_weighted = {}
        for skill, weight in scoring_profile.items():
            original_weighted[skill] = simulated_scores[skill] * weight
        original_overall = sum(original_weighted.values()) / sum(scoring_profile.values())
        
        # Calculate weighted scores (after penalty)
        penalized_scores = simulated_scores.copy()
        penalized_scores["fluency"] = penalized_fluency
        
        penalized_weighted = {}
        for skill, weight in scoring_profile.items():
            penalized_weighted[skill] = penalized_scores[skill] * weight
        penalized_overall = sum(penalized_weighted.values()) / sum(scoring_profile.values())
        
        # Determine penalty status
        if duration_percentage < 25:
            penalty_status = "SEVERE PENALTY (1/4 fluency)"
        elif duration_percentage < 50:
            penalty_status = "HIGH PENALTY (2/4 fluency)"
        elif duration_percentage < 75:
            penalty_status = "MODERATE PENALTY (3/4 fluency)"
        else:
            penalty_status = "NO PENALTY"
        
        result = {
            "test_info": {
                "audio_filename": audio.filename,
                "audio_size_bytes": len(audio_data),
                "question_type": question_type,
                "expected_duration": expected_duration,
                "simulated_quality": simulate_scores
            },
            "duration_analysis": {
                "actual_duration": round(actual_duration, 1),
                "expected_duration": expected_duration,
                "duration_percentage": round(duration_percentage, 1),
                "penalty_applies": question_type in ["open_response", "image_description", "listen_answer"],
                "penalty_multiplier": penalty_multiplier,
                "penalty_status": penalty_status
            },
            "score_comparison": {
                "original_scores": simulated_scores,
                "penalized_scores": penalized_scores,
                "fluency_change": {
                    "before": original_fluency,
                    "after": penalized_fluency,
                    "difference": round(original_fluency - penalized_fluency, 1)
                }
            },
            "weighted_scores": {
                "scoring_profile": scoring_profile,
                "before_penalty": {
                    "scores": {k: round(v, 2) for k, v in original_weighted.items()},
                    "overall": round(original_overall, 1)
                },
                "after_penalty": {
                    "scores": {k: round(v, 2) for k, v in penalized_weighted.items()},
                    "overall": round(penalized_overall, 1)
                },
                "overall_difference": round(original_overall - penalized_overall, 1)
            }
        }
        
        # Clean up temp file
        try:
            temp_path.unlink()
        except:
            pass
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Error testing duration penalty: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/debug/penalty-examples")
async def get_penalty_examples():
    """Get examples of how penalty affects different scenarios"""
    
    scenarios = []
    
    # Test different durations for a 120-second open response
    test_durations = [10, 30, 60, 90, 120, 150]
    expected_duration = 120
    base_scores = {"pronunciation": 85, "fluency": 88, "grammar": 82, "vocabulary": 80}
    
    for actual_duration in test_durations:
        if exam_manager:
            penalty = exam_manager._calculate_fluency_penalty_multiplier(actual_duration, expected_duration)
        else:
            # Fallback calculation
            duration_pct = (actual_duration / expected_duration) * 100
            if duration_pct < 25:
                penalty = 0.25
            elif duration_pct < 50:
                penalty = 0.5
            elif duration_pct < 75:
                penalty = 0.75
            else:
                penalty = 1.0
        
        penalized_fluency = base_scores["fluency"] * penalty
        
        scenarios.append({
            "actual_duration": actual_duration,
            "duration_percentage": round((actual_duration / expected_duration) * 100, 1),
            "penalty_multiplier": penalty,
            "original_fluency": base_scores["fluency"],
            "penalized_fluency": round(penalized_fluency, 1),
            "penalty_status": "SEVERE" if penalty == 0.25 else "HIGH" if penalty == 0.5 else "MODERATE" if penalty == 0.75 else "NONE"
        })
    
    return {
        "success": True,
        "test_setup": {
            "question_type": "open_response",
            "expected_duration": expected_duration,
            "base_scores": base_scores
        },
        "scenarios": scenarios,
        "instructions": "Upload an audio file to /api/debug/test-duration-penalty to test with real audio"
    }