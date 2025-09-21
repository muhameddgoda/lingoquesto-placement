# app/exam_manager.py
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path
import logging
import random

logger = logging.getLogger(__name__)


class ExamManager:

    def __init__(self, config_path: str=None):
        """Initialize exam manager with error handling"""
        self.sessions: Dict[str, Dict] = {}
        self.LEVEL_THRESHOLD = 75
        
        try:
            # Load configuration
            self.config = self._load_configuration()
            # Load questions
            self.questions_db = self._load_questions_database()
            # Setup directories
            self._setup_directories()
            
            logger.info("ExamManager initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize ExamManager: {e}")
            # Create minimal working setup
            self._create_minimal_setup()
    
    def _load_configuration(self) -> Dict:
        """Load configuration with simple fallback"""
        config_paths = ["exam_config.json", "config/exam_config.json"]
        
        for path in config_paths:
            if Path(path).exists():
                try:
                    with open(path, 'r') as f:
                        config = json.load(f)
                    logger.info(f"Loaded config from {path}")
                    return config
                except Exception as e:
                    logger.warning(f"Error loading {path}: {e}")
        
        # Simple default config - UPDATED TO INCLUDE MINIMAL_PAIR
        logger.warning("Using default configuration")
        return {
            "accent": "us",
            "exam": {
                "order": ["A1", "A2", "B1", "B2", "C1", "C2"],
                "gate_threshold": 75,
                "per_level": {
                    "A1": {"type_counts": {"repeat_sentence": 1, "open_response": 1, "minimal_pair": 2}},
                    "A2": {"type_counts": {"repeat_sentence": 1, "open_response": 0, "minimal_pair": 2}},
                    "B1": {"type_counts": {"repeat_sentence": 1, "open_response": 0, "minimal_pair": 1}},
                    "B2": {"type_counts": {"repeat_sentence": 0, "open_response": 1, "minimal_pair": 1}},
                    "C1": {"type_counts": {"repeat_sentence": 1, "open_response": 1, "minimal_pair": 2}},
                    "C2": {"type_counts": {"repeat_sentence": 0, "open_response": 1, "minimal_pair": 1}}
                }
            },
            "type_to_profile": {
                "repeat_sentence": "pron_only",
                "open_response": "unscripted_mixed",
                "minimal_pair": "pron_only"
            },
            "scoring_profiles": {
                "pron_only": {"pronunciation": 1.0, "fluency": 0.0, "grammar": 0.0, "vocabulary": 0.0},
                "unscripted_mixed": {"pronunciation": 0.25, "fluency": 0.55, "grammar": 0.1, "vocabulary": 0.1}
            },
            "question_timing": {
                "repeat_sentence": {
                    "think_time_sec": 3,
                    "response_time_sec": 15,
                    "total_estimated_sec": 18
                },
                "open_response": {
                    "think_time_sec": 30,
                    "response_time_sec": 120,
                    "total_estimated_sec": 150
                },
                "minimal_pair": {
                    "think_time_sec": 2,
                    "response_time_sec": 15,
                    "total_estimated_sec": 17
                }
            }
        }
    
    def _load_questions_database(self) -> Dict:
        """Load questions with simple error handling"""
        questions_db = {}
        
        # Check if questions directory exists
        questions_dir = Path("questions")
        if not questions_dir.exists():
            logger.warning("Questions directory not found")
            return self._create_fallback_questions()
        
        # Load question files
        for level_file in ["a1.json", "a2.json", "b1.json", "b2.json", "c1.json", "c2.json"]:
            file_path = questions_dir / level_file
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        questions = json.load(f)
                    
                    # Process questions
                    for question in questions:
                        if isinstance(question, dict) and "id" in question and "type" in question:
                            # Get level from ID (e.g., "A1-RS-001" -> "A1")
                            level = question["id"].split("-")[0].upper()
                            q_type = question["type"]
                            
                            if level not in questions_db:
                                questions_db[level] = {}
                            if q_type not in questions_db[level]:
                                questions_db[level][q_type] = []
                            
                            questions_db[level][q_type].append(question)
                    
                    logger.info(f"Loaded questions from {level_file}")
                    
                except Exception as e:
                    logger.error(f"Error loading {level_file}: {e}")
        
        if not questions_db:
            logger.warning("No questions loaded, using fallback")
            return self._create_fallback_questions()
        
        return questions_db
    
    def _create_fallback_questions(self) -> Dict:
        """Create minimal questions for testing"""
        return {
            "A1": {
                "open_response": [{
                    "id": "A1-OR-001",
                    "type": "open_response",
                    "prompt": "Please introduce yourself.",
                    "metadata": {"accent": "us"}
                }],
                "repeat_sentence": [{
                    "id": "A1-RS-001",
                    "type": "repeat_sentence",
                    "prompt": "Repeat: Hello, my name is John.",
                    "metadata": {"expectedText": "Hello, my name is John.", "accent": "us"}
                }]
            }
        }
    
    def _setup_directories(self):
        """Setup result directories"""
        try:
            results_dir = Path("exam_results")
            results_dir.mkdir(exist_ok=True)
            (results_dir / "detailed").mkdir(exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not create directories: {e}")
    
    def _create_minimal_setup(self):
        """Create minimal working setup if initialization fails"""
        self.config = {
            "accent": "us",
            "exam": {"order": ["A1"], "gate_threshold": 75, "per_level": {"A1": {"type_counts": {"open_response": 1}}}},
            "type_to_profile": {"open_response": "unscripted_mixed"},
            "scoring_profiles": {"unscripted_mixed": {"pronunciation": 0.25, "fluency": 0.55, "grammar": 0.1, "vocabulary": 0.1}},
            "question_timing": {
                "open_response": {
                    "think_time_sec": 30,
                    "response_time_sec": 120,
                    "total_estimated_sec": 150
                }
            }
        }
        self.questions_db = self._create_fallback_questions()
        logger.warning("Using minimal setup due to initialization errors")
    
    def start_exam(self, user_id: str) -> Dict:
        """Start a new exam session"""
        try:
            session_id = str(uuid.uuid4())
            first_level = self.config["exam"]["order"][0]
            
            # Create session
            self.sessions[session_id] = {
                "user_id": user_id,
                "current_level": first_level,
                "current_question_index": 0,
                "level_questions": [],
                "completed_levels": [],
                "level_scores": {},
                "all_responses": [],
                "started_at": datetime.now().isoformat(),
                "status": "in_progress",
                "exam_complete": False
            }
            
            # Generate questions for first level
            self._generate_level_questions(session_id, first_level)
            
            # Get first question
            first_question = self._get_next_question(session_id)
            if not first_question:
                raise ValueError(f"No questions available for {first_level}")
            
            logger.info(f"Started exam for user {user_id}, session {session_id}")
            
            return {
                "session_id": session_id,
                "question": first_question,
                "exam_status": "started"
            }
            
        except Exception as e:
            logger.error(f"Error starting exam: {e}")
            raise
    
    def _generate_level_questions(self, session_id: str, level: str):
        """Generate questions for a level"""
        try:
            session = self.sessions[session_id]
            
            # Get level configuration
            if level not in self.config["exam"]["per_level"]:
                raise ValueError(f"Level {level} not configured")
            
            level_config = self.config["exam"]["per_level"][level]
            type_counts = level_config["type_counts"]
            
            level_questions = []
            
            # FIXED: Process ALL question types from the config, not just priority list
            for q_type, count in type_counts.items():
                if count > 0:
                    # Check if we have questions of this type
                    if (level in self.questions_db and 
                        q_type in self.questions_db[level] and 
                        self.questions_db[level][q_type]):
                        
                        available = self.questions_db[level][q_type]
                        selected = random.sample(available, min(count, len(available)))
                        
                        for question in selected:
                            formatted = self._format_question_for_frontend(question, level)
                            level_questions.append(formatted)
                            logger.info(f"Added {q_type} question: {question['id']}")
                    else:
                        logger.warning(f"No questions available for type {q_type} in level {level}")
            
            if not level_questions:
                logger.error(f"No questions could be generated for {level}")
                # Add fallback logic here if needed
                raise ValueError(f"No questions could be generated for {level}")
            
            random.shuffle(level_questions)
            session["level_questions"] = level_questions
            
            logger.info(f"Generated {len(level_questions)} questions for {level}: {[q['q_id'] for q in level_questions]}")
            
        except Exception as e:
            logger.error(f"Error generating questions for {level}: {e}")
            raise
    
    def _format_question_for_frontend(self, question: Dict, level: str) -> Dict:
        """Format question for frontend with proper timing integration"""
        q_type = question.get("type", "open_response")
        
        formatted = {
            "q_id": question.get("id", f"unknown-{uuid.uuid4().hex[:8]}"),
            "q_type": q_type,  # KEEP ORIGINAL TYPE - DON'T CONVERT
            "level": level,
            "prompt": question.get("prompt", "Question not available"),
            "original_type": q_type,
            "metadata": question.get("metadata", {})
        }
        
        # Add timing information from configuration
        if q_type in self.config.get("question_timing", {}):
            timing_config = self.config["question_timing"][q_type]
            formatted["timing"] = {
                "think_time_sec": timing_config.get("think_time_sec", 5),
                "response_time_sec": timing_config.get("response_time_sec", 30),
                "total_estimated_sec": timing_config.get("total_estimated_sec", 35)
            }
            logger.info(f"Added timing config to {q_type}: {formatted['timing']}")
        else:
            # Default timing if not configured
            default_timings = {
                "repeat_sentence": {"think_time_sec": 3, "response_time_sec": 15, "total_estimated_sec": 18},
                "minimal_pair": {"think_time_sec": 2, "response_time_sec": 15, "total_estimated_sec": 17},
                "dictation": {"think_time_sec": 3, "response_time_sec": 12, "total_estimated_sec": 15},
                "listen_mcq": {"think_time_sec": 5, "response_time_sec": 25, "total_estimated_sec": 30},
                "image_description": {"think_time_sec": 10, "response_time_sec": 80, "total_estimated_sec": 90},
                "open_response": {"think_time_sec": 30, "response_time_sec": 120, "total_estimated_sec": 150},
                "best_response_mcq": {"think_time_sec": 5, "response_time_sec": 25, "total_estimated_sec": 30},
                "sequence": {"think_time_sec": 3, "response_time_sec": 17, "total_estimated_sec": 20},
                "listen_answer": {"think_time_sec": 5, "response_time_sec": 25, "total_estimated_sec": 30}
            }
            
            if q_type in default_timings:
                formatted["timing"] = default_timings[q_type]
                logger.info(f"Added default timing to {q_type}: {formatted['timing']}")
            else:
                formatted["timing"] = {"think_time_sec": 5, "response_time_sec": 30, "total_estimated_sec": 35}
                logger.warning(f"Using fallback timing for unknown question type {q_type}")
        
        # Handle minimal_pair specifically
        if q_type == "minimal_pair":
            formatted["options"] = question.get("metadata", {}).get("options", [])
            formatted["correct_answer"] = question.get("metadata", {}).get("correctAnswer")
            
            # Add audio reference if present
            audio_ref = question.get("metadata", {}).get("audioRef")
            if audio_ref:
                formatted["audio_ref"] = audio_ref
        
        # Add specific metadata for different question types
        elif q_type == "repeat_sentence":
            expected_text = question.get("metadata", {}).get("expectedText")
            if expected_text:
                formatted["expected_text"] = expected_text
        
        elif q_type == "image_description":
            image_ref = question.get("metadata", {}).get("imageRef")
            if image_ref:
                # Strip 'images/' prefix if present
                if image_ref.startswith("images/"):
                    image_ref = image_ref[7:]  # Remove 'images/' prefix
                formatted["image_ref"] = image_ref
                formatted["image_description"] = question.get("metadata", {}).get("imageDescription", "")
        
        elif q_type == "dictation":
            audio_ref = question.get("metadata", {}).get("audioRef")
            expected_text = question.get("metadata", {}).get("expectedText")
            if audio_ref:
                formatted["audio_ref"] = audio_ref
            if expected_text:
                formatted["expected_text"] = expected_text
        
        elif q_type in ["listen_mcq", "best_response_mcq"]:
            # Add MCQ options
            formatted["options"] = question.get("metadata", {}).get("options", [])
            formatted["correct_answer"] = question.get("metadata", {}).get("correctAnswer")
            
            # Add audio reference if present
            audio_ref = question.get("metadata", {}).get("audioRef")
            if audio_ref:
                formatted["audio_ref"] = audio_ref
            
        return formatted
    
    def _get_next_question(self, session_id: str) -> Optional[Dict]:
        """Get next question"""
        try:
            if session_id not in self.sessions:
                return None
            
            session = self.sessions[session_id]
            
            if session.get("exam_complete"):
                return None
            
            level_questions = session.get("level_questions", [])
            current_index = session.get("current_question_index", 0)
            
            if current_index < len(level_questions):
                question = level_questions[current_index].copy()
                question["question_number"] = current_index + 1
                question["total_questions_in_level"] = len(level_questions)
                question["current_level"] = session["current_level"]
                return question
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting next question: {e}")
            return None
    
    def process_response(self, session_id: str, response_data: Dict) -> Dict:
        """Process user response"""
        try:
            if session_id not in self.sessions:
                raise ValueError(f"Session {session_id} not found")
            
            session = self.sessions[session_id]
            
            # Store response
            response_data["timestamp"] = datetime.now().isoformat()
            response_data["level"] = session["current_level"]
            session["all_responses"].append(response_data)
            
            # Get question info
            question_info = self._get_current_question_info(session_id)
            
            # Evaluate response
            evaluation_result = self._evaluate_response(response_data, question_info)
            
            # Store evaluation
            current_level = session["current_level"]
            if current_level not in session["level_scores"]:
                session["level_scores"][current_level] = {"questions": []}
            
            session["level_scores"][current_level]["questions"].append({
                "q_id": response_data["q_id"],
                "scores": evaluation_result["scores"],
                "weighted_score": evaluation_result["overall_weighted"],
                "evaluation_details": evaluation_result,
                "response_data": response_data,
                "question_info": question_info
            })
            
            # Move to next question
            session["current_question_index"] += 1
            
            # Check if level complete
            if session["current_question_index"] >= len(session["level_questions"]):
                return self._handle_level_complete(session_id)
            else:
                # Get next question
                next_question = self._get_next_question(session_id)
                if not next_question:
                    return self._complete_exam(session_id)
                
                return {
                    "status": "continue",
                    "next_question": next_question,
                    "exam_complete": False
                }
        
        except Exception as e:
            logger.error(f"Error processing response: {e}")
            raise
    
    def _get_current_question_info(self, session_id: str) -> Dict:
        """Get current question info"""
        try:
            session = self.sessions[session_id]
            level_questions = session.get("level_questions", [])
            current_index = session.get("current_question_index", 0)
            
            if current_index < len(level_questions):
                return level_questions[current_index]
            return {}
        except:
            return {}
    
    def _evaluate_response(self, response_data: Dict, question_info: Dict) -> Dict:
        """Evaluate response with Language Confidence API"""
        try:
            q_type = question_info.get("original_type", "open_response")
            profile_name = self.config["type_to_profile"].get(q_type, "unscripted_mixed")
            scoring_profile = self.config["scoring_profiles"][profile_name]
            
            if q_type == "minimal_pair":
                logger.info(f"Processing minimal pair question")
                
                # Get correct answer and user input
                correct_answer = question_info.get("metadata", {}).get("correctAnswer", "")
                user_answer = response_data.get("response_data", "").strip()
                is_correct = user_answer == correct_answer
                
                score = 100 if is_correct else 0
                
                logger.info(f"Minimal pair evaluation: Expected '{correct_answer}', Got '{user_answer}', Correct: {is_correct}")
                
                return {
                    "scores": {skill: score * weight for skill, weight in scoring_profile.items()},
                    "overall_weighted": score,
                    "is_mock_data": False,
                    "minimal_pair_result": {
                        "user_answer": user_answer,
                        "correct_answer": correct_answer,
                        "is_correct": is_correct
                    }
                }

            elif q_type == "dictation":
                logger.info(f"Processing dictation question")
                
                # Get expected text and user input - DICTATION IS TEXT-BASED
                expected_text = (
                    question_info.get("metadata", {}).get("expectedText") or
                    question_info.get("expected_text") or
                    ""
                ).lower().strip()
                
                user_input = response_data.get("response_data", "").lower().strip()
                
                logger.info(f"Dictation inputs - Expected: '{expected_text}', User: '{user_input}'")
    
                if expected_text and user_input:
                    # Remove punctuation for fairer comparison
                    import re
                    expected_clean = re.sub(r'[^\w\s]', '', expected_text).strip()
                    user_clean = re.sub(r'[^\w\s]', '', user_input).strip()
                    
                    # Calculate word-level accuracy
                    expected_words = expected_clean.split()
                    user_words = user_clean.split()
                    
                    # Simple word matching
                    correct_words = 0
                    total_words = len(expected_words)
                    
                    for i, expected_word in enumerate(expected_words):
                        if i < len(user_words) and user_words[i] == expected_word:
                            correct_words += 1
                    
                    # Calculate accuracy percentage
                    accuracy = (correct_words / total_words * 100) if total_words > 0 else 0
                    
                    logger.info(f"Dictation evaluation: Expected '{expected_text}' -> '{expected_clean}', Got '{user_input}' -> '{user_clean}', Accuracy: {accuracy:.1f}%")
                    
                    # For dictation, focus on vocabulary (listening comprehension + spelling)
                    scores = {
                        "pronunciation": 0,  # Not applicable for dictation
                        "fluency": 0,  # Not applicable for dictation  
                        "grammar": 0,  # Not the focus for dictation
                        "vocabulary": accuracy  # Full score goes to vocabulary
                    }
                    
                    overall = accuracy  # Overall score is just the accuracy
                    
                    logger.info(f"Dictation evaluation: Expected '{expected_text}', Got '{user_input}', Accuracy: {accuracy:.1f}%")
                    
                    return {
                        "scores": scores,
                        "overall_weighted": overall,
                        "is_mock_data": False,
                        "dictation_result": {
                            "expected_text": expected_text,
                            "user_input": user_input,
                            "word_accuracy": accuracy,
                            "correct_words": correct_words,
                            "total_words": total_words
                        }
                    }
                else:
                    logger.warning(f"Missing expected text or user input for dictation")
                    return self._get_mock_evaluation(scoring_profile, "Missing dictation data")
                    
            elif q_type in ["listen_mcq", "best_response_mcq"] or response_data.get("response_type") == "text":
                        # MCQ evaluation (including listen_mcq)
                        correct_answer = question_info.get("correct_answer", "")
                        user_answer = response_data.get("response_data", "").strip()
                        is_correct = user_answer == correct_answer
                        
                        score = 100 if is_correct else 0
                        return {
                            "scores": {skill: score * weight for skill, weight in scoring_profile.items()},
                            "overall_weighted": score,
                            "is_mock_data": False,
                            "mcq_result": {
                                "user_answer": user_answer,
                                "correct_answer": correct_answer,
                                "is_correct": is_correct
                            }
                        }

            if response_data.get("response_type") == "audio":
                # Try Language Confidence API
                try:
                    from .speech_ace_service import lc_pronunciation_sync, lc_unscripted_sync
                    
                    audio_file_path = response_data.get("audio_file_path")
                    if not audio_file_path or not Path(audio_file_path).exists():
                        logger.warning(f"Audio file not found: {audio_file_path}")
                        return self._get_mock_evaluation(scoring_profile, "Audio file not found")
                    
                    # For repeat_sentence questions, use pronunciation API
                    if q_type == "repeat_sentence":
                        expected_text = (
                            question_info.get("metadata", {}).get("expectedText") or
                            question_info.get("metadata", {}).get("expected_text") or
                            question_info.get("expected_text") or
                            ""
                        )
                        
                        if expected_text:
                            logger.info(f"Calling Language Confidence pronunciation API with expected text: '{expected_text}'")
                            
                            result = lc_pronunciation_sync(
                                audio_file_path,
                                expected_text=expected_text,
                                accent=self.config["accent"],
                                user_metadata={
                                    "speaker_gender": "male",
                                    "speaker_age": "adult",
                                    "speaker_english_level": "intermediate"
                                }
                            )
                        else:
                            logger.warning(f"No expected text for repeat_sentence question")
                            return self._get_mock_evaluation(scoring_profile, "No expected text provided")
                    
                    # For open_response and other unscripted questions, use unscripted API
                    elif q_type in ["open_response", "image_description", "listen_answer"]:
                        logger.info(f"Calling Language Confidence unscripted API for {q_type}")
                        
                        # Get context from question metadata
                        context = question_info.get("metadata", {}).get("context", {})
                        question_text = context.get("question", question_info.get("prompt", ""))
                        context_description = context.get("context_description", f"{q_type} assessment")
                        
                        result = lc_unscripted_sync(
                            audio_file_path,
                            question=question_text,
                            context_description=context_description,
                            accent=self.config["accent"]
                            # Note: user_metadata not supported for unscripted API
                        )

                    else:
                        # For other question types, use mock for now
                        logger.info(f"Question type {q_type} - using mock evaluation")
                        return self._get_mock_evaluation(scoring_profile, f"Question type {q_type} not yet supported")
                    
                    logger.info(f"Language Confidence API response type: {type(result)}")
                    
                    # Check for API errors
                    if isinstance(result, dict) and "error" in result:
                        logger.error(f"Language Confidence API error: {result}")
                        return self._get_mock_evaluation(scoring_profile, f"API Error: {result.get('error')}")
                    
                    # Parse the result
                    parsed_result = self._parse_language_confidence_result(result, scoring_profile)
                    parsed_result["question_type"] = q_type
                    parsed_result["scoring_profile"] = profile_name
                    
                    return parsed_result
                        
                except ImportError as e:
                    logger.error(f"Language Confidence service import error: {e}")
                    return self._get_mock_evaluation(scoring_profile, "Language Confidence service not available")
                except Exception as e:
                    logger.error(f"Error calling Language Confidence API: {e}")
                    return self._get_mock_evaluation(scoring_profile, f"API Error: {str(e)}")
            
            elif response_data.get("response_type") == "text":
                # MCQ evaluation
                correct_answer = question_info.get("correct_answer", "Option A")
                user_answer = response_data.get("response_data", "").strip()
                is_correct = user_answer == correct_answer
                
                score = 100 if is_correct else 0
                return {
                    "scores": {skill: score * weight for skill, weight in scoring_profile.items()},
                    "overall_weighted": score,
                    "is_mock_data": False,
                    "mcq_result": {
                        "user_answer": user_answer,
                        "correct_answer": correct_answer,
                        "is_correct": is_correct
                    }
                }
            
            # Default fallback
            return self._get_mock_evaluation(scoring_profile, "Unknown response type")
            
        except Exception as e:
            logger.error(f"Error in evaluation: {e}")
            return self._get_mock_evaluation(scoring_profile, f"Evaluation error: {str(e)}")
    
    def _get_mock_evaluation(self, scoring_profile: Dict, note: str="Mock data") -> Dict:
        """Generate mock evaluation with clear marking"""
        import random
        base_score = random.uniform(60, 90)
        
        scores = {}
        for skill, weight in scoring_profile.items():
            if weight > 0:
                variation = random.uniform(-10, 10)
                scores[skill] = max(0, min(100, (base_score + variation) * weight))
            else:
                scores[skill] = 0
        
        overall = sum(scores.values()) / sum(scoring_profile.values()) if sum(scoring_profile.values()) > 0 else base_score
        
        logger.warning(f"Using mock evaluation: {note}")
        
        return {
            "scores": scores,
            "overall_weighted": overall,
            "is_mock_data": True,  # CLEARLY MARK AS MOCK
            "transcription": "Mock data - no real transcription available",
            "word_phoneme_data": [],
            "evaluation_note": note
        }
    
    def _parse_language_confidence_result(self, result: Dict, scoring_profile: Dict) -> Dict:
        """Parse Language Confidence API response (both pronunciation and unscripted)"""
        try:
            logger.info(f"Parsing Language Confidence result")
            
            # Extract transcription and word data
            transcription_words = []
            word_phoneme_data = []
            
            # Handle unscripted API response structure
            if "pronunciation" in result and "words" in result["pronunciation"]:
                logger.info("Processing unscripted API response")
                words_data = result["pronunciation"]["words"]
                
                # Get the transcription from metadata
                transcription = result.get("metadata", {}).get("predicted_text", "")
                logger.info(f"Transcription from unscripted API: '{transcription}'")
                
                # Process each word - FIX THIS SECTION
                for word_index, word_obj in enumerate(words_data):
                    word_text = word_obj.get("word_text", f"word_{word_index}")
                    
                    # Extract phonemes - ENSURE CONSISTENT STRUCTURE
                    phonemes_list = []
                    phonemes_data = word_obj.get("phonemes", [])
                    
                    if isinstance(phonemes_data, list) and phonemes_data:
                        for phoneme_obj in phonemes_data:
                            phoneme_data = {
                                "ipa": phoneme_obj.get("ipa_label", "?"),
                                "score": round(float(phoneme_obj.get("phoneme_score", 0))),
                                "expected_ipa": phoneme_obj.get("expected_ipa"),  # ADD THIS
                                "actual_ipa": phoneme_obj.get("actual_ipa"),  # ADD THIS
                                "confidence": phoneme_obj.get("confidence"),  # ADD THIS
                                "start_time": phoneme_obj.get("start_time"),
                                "end_time": phoneme_obj.get("end_time")
                            }
                            phonemes_list.append(phoneme_data)
                    
                    # ENSURE word_phoneme_data IS POPULATED
                    if phonemes_list:
                        word_phoneme_data.append({
                            "word": word_text,
                            "phonemes": phonemes_list
                        })
                
                # Extract scores from unscripted response
                raw_scores = {
                    "pronunciation": result.get("pronunciation", {}).get("overall_score", 0),
                    "fluency": result.get("fluency", {}).get("overall_score", 0),
                    "grammar": result.get("grammar", {}).get("overall_score", 0),
                    "vocabulary": result.get("vocabulary", {}).get("overall_score", 0)
                }
                
            # Handle pronunciation API response structure (original code)
            elif "words" in result and isinstance(result["words"], list):
                logger.info("Processing pronunciation API response")
                words_data = result["words"]
                previous_end_time = 0
                
                for word_index, word_obj in enumerate(words_data):
                    word_text = word_obj.get("word_text", word_obj.get("text", f"word_{word_index}"))
                    
                    # Detect pauses for pronunciation API
                    word_start_time = word_obj.get("start_time", 0)
                    if word_index > 0 and word_start_time > previous_end_time:
                        pause_duration = word_start_time - previous_end_time
                        if pause_duration > 0.3:
                            transcription_words.append(f"[pause {pause_duration:.1f}s]")
                    
                    transcription_words.append(word_text)
                    previous_end_time = word_obj.get("end_time", word_start_time + 0.5)
                    
                    # Extract phonemes - THIS IS THE KEY FIX
                    phonemes_list = []
                    phonemes_data = word_obj.get("phonemes", [])
                    
                    if isinstance(phonemes_data, list) and phonemes_data:
                        for phoneme_obj in phonemes_data:
                            phoneme_data = {
                                "ipa": (
                                    phoneme_obj.get("ipa_label") or 
                                    phoneme_obj.get("ipa") or 
                                    "?"
                                ),
                                "score": round(float(
                                    phoneme_obj.get("phoneme_score",
                                    phoneme_obj.get("score", 0))
                                )),
                                "expected_ipa": phoneme_obj.get("expected_ipa"),
                                "actual_ipa": phoneme_obj.get("actual_ipa"),
                                "confidence": phoneme_obj.get("confidence"),
                                "start_time": phoneme_obj.get("start_time"),
                                "end_time": phoneme_obj.get("end_time")
                            }
                            phonemes_list.append(phoneme_data)
                    
                    # MAKE SURE THIS RUNS - ADD DEBUG LOG
                    if phonemes_list:
                        word_phoneme_data.append({
                            "word": word_text,
                            "phonemes": phonemes_list
                        })
                        logger.info(f"Added word '{word_text}' with {len(phonemes_list)} phonemes to word_phoneme_data")
                
                transcription = " ".join(transcription_words)
                
                # Extract scores from pronunciation response - FIX THE SCORE EXTRACTION
                raw_scores = {}
                if "overall_score" in result:
                    raw_scores["pronunciation"] = result["overall_score"]
                    raw_scores["fluency"] = max(0, result["overall_score"] - 5)
                    raw_scores["grammar"] = max(0, result["overall_score"] - 10)  
                    raw_scores["vocabulary"] = max(0, result["overall_score"] - 8)
                else:
                    # If no overall_score, try to extract from individual metrics
                    raw_scores["pronunciation"] = result.get("pronunciation", {}).get("overall_score", 0)
                    raw_scores["fluency"] = result.get("fluency", {}).get("overall_score", 0) 
                    raw_scores["grammar"] = result.get("grammar", {}).get("overall_score", 0)
                    raw_scores["vocabulary"] = result.get("vocabulary", {}).get("overall_score", 0)
            
            logger.info(f"Extracted raw scores: {raw_scores}")
            logger.info(f"Total words with phoneme data: {len(word_phoneme_data)}")
            
            # Apply scoring profile weights
            weighted_scores = {}
            for skill, weight in scoring_profile.items():
                if weight > 0 and skill in raw_scores:
                    weighted_scores[skill] = raw_scores[skill] * weight
                else:
                    weighted_scores[skill] = 0
            
            overall = sum(weighted_scores.values()) / sum(scoring_profile.values()) if sum(scoring_profile.values()) > 0 else 0
            
            logger.info(f"Language Confidence parsed successfully - Raw scores: {raw_scores}, Weighted: {weighted_scores}, Overall: {overall:.1f}, Words with phonemes: {len(word_phoneme_data)}")
            
            logger.info(f"Final word_phoneme_data count: {len(word_phoneme_data)}")
            for i, word_data in enumerate(word_phoneme_data[:3]):  # Log first 3 words
                logger.info(f"  Word {i+1}: '{word_data['word']}' with {len(word_data['phonemes'])} phonemes")

            return {
                "scores": weighted_scores,
                "overall_weighted": overall,
                "raw_scores": raw_scores,
                "transcription": transcription,
                "word_phoneme_data": word_phoneme_data,
                "language_confidence_response": result,
                "is_mock_data": False,
                # Add extra data from unscripted API
                "english_proficiency": result.get("overall", {}).get("english_proficiency_scores", {}),
                "content_relevance": result.get("metadata", {}).get("content_relevance"),
                "grammar_feedback": result.get("grammar", {}).get("feedback", {}),
                "fluency_feedback": result.get("fluency", {}).get("feedback", {})
            }
            
        except Exception as e:
            logger.error(f"Error parsing Language Confidence result: {e}")
            return self._get_mock_evaluation(scoring_profile, f"Failed to parse API response: {str(e)}")
    
    def _handle_level_complete(self, session_id: str) -> Dict:
        """Handle level completion"""
        try:
            session = self.sessions[session_id]
            current_level = session["current_level"]
            
            # Calculate level average
            level_data = session["level_scores"][current_level]
            questions = level_data["questions"]
            
            if questions:
                avg_score = sum(q["weighted_score"] for q in questions) / len(questions)
            else:
                avg_score = 0
            
            level_data["average_score"] = avg_score
            level_data["passed"] = avg_score >= self.LEVEL_THRESHOLD
            
            session["completed_levels"].append(current_level)
            
            # Check if passed and has next level
            if avg_score >= self.LEVEL_THRESHOLD:
                next_level = self._get_next_level(current_level)
                if next_level:
                    # Move to next level
                    session["current_level"] = next_level
                    session["current_question_index"] = 0
                    
                    self._generate_level_questions(session_id, next_level)
                    next_question = self._get_next_question(session_id)
                    
                    if next_question:
                        return {
                            "status": "level_complete",
                            "level_result": {
                                "level": current_level,
                                "average_score": avg_score,
                                "passed": True,
                                "next_level": next_level
                            },
                            "next_question": next_question,
                            "exam_complete": False
                        }
            
            # Exam complete (failed level or no more levels)
            return self._complete_exam(session_id)
            
        except Exception as e:
            logger.error(f"Error handling level complete: {e}")
            return self._complete_exam(session_id)
    
    def _get_next_level(self, current_level: str) -> Optional[str]:
        """Get next level"""
        try:
            levels = self.config["exam"]["order"]
            current_index = levels.index(current_level)
            if current_index < len(levels) - 1:
                return levels[current_index + 1]
        except:
            pass
        return None
    
    def _complete_exam(self, session_id: str) -> Dict:
        """Complete exam and generate report"""
        try:
            session = self.sessions[session_id]
            session["exam_complete"] = True
            session["status"] = "completed"
            session["completed_at"] = datetime.now().isoformat()
            
            # Generate cumulative report (this will calculate everything automatically)
            report = self._generate_final_report(session_id)

            # Store final scores in session for backward compatibility
            session["final_score"] = report.get("overall_performance", {}).get("overall_score", 0)
            session["final_level"] = report.get("exam_progress", {}).get("highest_level_attempted", "A1")
            
            return {
                "status": "exam_complete",
                "exam_complete": True,
                "final_report": report
            }
            
        except Exception as e:
            logger.error(f"Error completing exam: {e}")
            return {
                "status": "exam_complete",
                "exam_complete": True,
                "final_report": {"error": "Failed to generate report"}
            }
    
    def _generate_final_report(self, session_id: str) -> Dict:
        """Generate final report with cumulative scoring against entire exam"""
        try:
            session = self.sessions[session_id]
            
            # Calculate total possible and earned points
            total_possible = self._calculate_total_exam_points()
            earned_points = self._calculate_earned_points(session_id)
            
            # Calculate percentages for each skill
            skill_percentages = {}
            for skill in ["pronunciation", "fluency", "grammar", "vocabulary"]:
                if total_possible[skill] > 0:
                    percentage = (earned_points[skill] / total_possible[skill]) * 100
                    skill_percentages[skill] = round(percentage, 1)
                else:
                    skill_percentages[skill] = 0.0
            
            # Calculate overall percentage
            overall_percentage = 0.0
            if total_possible["total"] > 0:
                overall_percentage = (earned_points["total"] / total_possible["total"]) * 100
            
            # Count questions attempted vs total possible
            questions_attempted = sum(
                len(level_data["questions"]) 
                for level_data in session["level_scores"].values()
            )
            
            total_questions_available = sum(
                sum(type_counts.values())
                for level_config in self.config["exam"]["per_level"].values()
                for type_counts in [level_config["type_counts"]]
            )
            
            # Determine where they stopped (highest level attempted)
            attempted_levels = list(session.get("level_scores", {}).keys())
            highest_level_attempted = "A1"
            if attempted_levels:
                level_order = self.config["exam"]["order"]
                highest_level_attempted = max(
                    attempted_levels,
                    key=lambda x: level_order.index(x) if x in level_order else 0
                )
            
            # Generate the report
            report = {
                "session_id": session_id,
                "user_id": session["user_id"],
                "exam_date": session["started_at"],
                "completion_date": session.get("completed_at"),
                "scoring_method": "cumulative_against_full_exam",
                
                # Cumulative Performance Against Full Exam
                "overall_performance": {
                    "overall_score": round(overall_percentage, 1),
                    "points_earned": round(earned_points["total"], 1),
                    "points_possible": round(total_possible["total"], 1)
                },
                
                # Skill Breakdown Against Full Exam
                "skill_breakdown": {
                    "pronunciation": {
                        "percentage": skill_percentages["pronunciation"],
                        "points_earned": round(earned_points["pronunciation"], 1),
                        "points_possible": round(total_possible["pronunciation"], 1)
                    },
                    "fluency": {
                        "percentage": skill_percentages["fluency"],
                        "points_earned": round(earned_points["fluency"], 1),
                        "points_possible": round(total_possible["fluency"], 1)
                    },
                    "grammar": {
                        "percentage": skill_percentages["grammar"],
                        "points_earned": round(earned_points["grammar"], 1),
                        "points_possible": round(total_possible["grammar"], 1)
                    },
                    "vocabulary": {
                        "percentage": skill_percentages["vocabulary"],
                        "points_earned": round(earned_points["vocabulary"], 1),
                        "points_possible": round(total_possible["vocabulary"], 1)
                    }
                },
                
                # Exam Progress Information
                "exam_progress": {
                    "questions_attempted": questions_attempted,
                    "total_questions_available": total_questions_available,
                    "completion_percentage": round((questions_attempted / total_questions_available) * 100, 1),
                    "highest_level_attempted": highest_level_attempted,
                    "levels_attempted": attempted_levels
                },
                
                # Level-by-level details (for diagnostic purposes)
                "level_details": self._generate_level_details(session),
                
                # Certificate eligibility (you can adjust this threshold)
                "certificate_eligible": overall_percentage >= 50.0  # 50% of total exam
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating cumulative final report: {e}")
            return {
                "error": f"Failed to generate report: {str(e)}",
                "session_id": session_id
            }

    def _generate_level_details(self, session: Dict) -> List[Dict]:
        """Generate detailed breakdown by level for diagnostic purposes"""
        try:
            level_details = []
            
            for level in session.get("completed_levels", []):
                if level in session.get("level_scores", {}):
                    level_data = session["level_scores"][level]
                    
                    level_detail = {
                        "level": level,
                        "questions_completed": len(level_data.get("questions", [])),
                        "average_score": round(level_data.get("average_score", 0), 1),
                        "passed_threshold": level_data.get("passed", False),
                        "threshold_required": 75.0,
                        "questions": level_data.get("questions", []) 
                    }
                    
                    level_details.append(level_detail)
            
            return level_details
            
        except Exception as e:
            logger.error(f"Error generating level details: {e}")
            return []

    def _calculate_skill_breakdown(self, questions: List[Dict]) -> Dict:
        """Calculate skill averages"""
        try:
            skills = {"pronunciation": [], "fluency": [], "grammar": [], "vocabulary": []}
            
            for q in questions:
                scores = q.get("scores", {})
                for skill in skills:
                    if skill in scores and isinstance(scores[skill], (int, float)):
                        skills[skill].append(scores[skill])
            
            return {
                skill: sum(scores) / len(scores) if scores else 0
                for skill, scores in skills.items()
            }
        except:
            return {"pronunciation": 0, "fluency": 0, "grammar": 0, "vocabulary": 0}

    def _calculate_total_exam_points(self) -> Dict[str, float]:
        """Calculate total possible points for each skill across entire exam"""
        try:
            total_points = {
                "pronunciation": 0,
                "fluency": 0,
                "grammar": 0,
                "vocabulary": 0,
                "total": 0
            }
            
            # Iterate through all levels in exam configuration
            for level in self.config["exam"]["order"]:
                if level in self.config["exam"]["per_level"]:
                    level_config = self.config["exam"]["per_level"][level]
                    type_counts = level_config["type_counts"]
                    
                    # For each question type in this level
                    for q_type, count in type_counts.items():
                        if count > 0:
                            # Get scoring profile for this question type
                            profile_name = self.config["type_to_profile"].get(q_type, "unscripted_mixed")
                            scoring_profile = self.config["scoring_profiles"][profile_name]
                            
                            # Each question is worth 100 points, distributed by profile weights
                            for skill, weight in scoring_profile.items():
                                skill_points = count * 100 * weight
                                total_points[skill] += skill_points
                                total_points["total"] += skill_points
            
            logger.info(f"Total exam points calculated: {total_points}")
            return total_points
            
        except Exception as e:
            logger.error(f"Error calculating total exam points: {e}")
            # Return safe defaults
            return {
                "pronunciation": 1000,
                "fluency": 1000,
                "grammar": 500,
                "vocabulary": 500,
                "total": 3000
            }

    def _calculate_earned_points(self, session_id: str) -> Dict[str, float]:
        """Calculate points actually earned by the student"""
        try:
            session = self.sessions[session_id]
            earned_points = {
                "pronunciation": 0,
                "fluency": 0,
                "grammar": 0,
                "vocabulary": 0,
                "total": 0
            }
            
            # Sum up points from all attempted questions
            for level_data in session["level_scores"].values():
                for question in level_data["questions"]:
                    scores = question.get("scores", {})
                    
                    # Add the weighted scores (these are already calculated based on profile weights)
                    for skill in ["pronunciation", "fluency", "grammar", "vocabulary"]:
                        if skill in scores:
                            earned_points[skill] += scores[skill]
                            earned_points["total"] += scores[skill]
            
            logger.info(f"Earned points calculated: {earned_points}")
            return earned_points
            
        except Exception as e:
            logger.error(f"Error calculating earned points: {e}")
            return {
                "pronunciation": 0,
                "fluency": 0,
                "grammar": 0,
                "vocabulary": 0,
                "total": 0
            }