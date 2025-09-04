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