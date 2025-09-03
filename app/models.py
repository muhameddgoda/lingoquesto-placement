from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime

class QuestionModel(BaseModel):
    q_id: str
    q_type: str
    level: str
    prompt: str
    options: Optional[List[str]] = None
    metadata: Optional[Dict] = None

class ResponseModel(BaseModel):
    session_id: str
    q_id: str
    response_type: str
    response_data: Optional[str] = None
    audio_file_path: Optional[str] = None
    timestamp: Optional[datetime] = None

class ExamSessionModel(BaseModel):
    session_id: str
    user_id: str
    current_level: str
    status: str
    exam_complete: bool
    final_level: Optional[str] = None
    final_score: Optional[float] = None