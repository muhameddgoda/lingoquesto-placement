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
            # Validate level weights
            self._validate_level_weights()
            # Load questions
            self.questions_db = self._load_questions_database()
            # Setup directories
            self._setup_directories()
            # Initialize caches
            self._level_weights_cache = {}
            self.total_exam_points = self._calculate_total_exam_points_normalized()
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
            },
            "level_scoring_weights": {
                "A1": {"pronunciation": 0.35, "fluency": 0.35, "grammar": 0.15, "vocabulary": 0.15},
                "A2": {"pronunciation": 0.30, "fluency": 0.30, "grammar": 0.20, "vocabulary": 0.20},
                "B1": {"pronunciation": 0.20, "fluency": 0.30, "grammar": 0.25, "vocabulary": 0.25},
                "B2": {"pronunciation": 0.15, "fluency": 0.25, "grammar": 0.30, "vocabulary": 0.30},
                "C1": {"pronunciation": 0.10, "fluency": 0.20, "grammar": 0.35, "vocabulary": 0.35},
                "C2": {"pronunciation": 0.10, "fluency": 0.15, "grammar": 0.375, "vocabulary": 0.375}
            },
        }

    def _validate_level_weights(self):
        """Validate that level weights sum to 1.0"""
        for level, weights in self.config.get("level_scoring_weights", {}).items():
            total = sum(weights.values())
            if abs(total - 1.0) > 0.001:  # Allow small floating point errors
                logger.warning(f"Level {level} weights sum to {total:.3f}, not 1.0")

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
            },
            "level_scoring_weights": {
                "A1": {"pronunciation": 0.35, "fluency": 0.35, "grammar": 0.15, "vocabulary": 0.15}
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
        
        # Get timing information with level-specific overrides
        timing_found = False
        
        # Step 1: Check for level-specific override first
        level_overrides = self.config.get("level_timing_overrides", {}).get(level, {})
        if q_type in level_overrides:
            timing_config = level_overrides[q_type]
            formatted["timing"] = {
                "think_time_sec": timing_config.get("think_time_sec", 5),
                "response_time_sec": timing_config.get("response_time_sec", 30),
                "total_estimated_sec": timing_config.get("total_estimated_sec", 35)
            }
            logger.info(f"Using level-specific timing for {level} {q_type}: {formatted['timing']}")
            timing_found = True
        
        # Step 2: Fall back to base timing configuration
        elif q_type in self.config.get("question_timing", {}):
            timing_config = self.config["question_timing"][q_type]
            formatted["timing"] = {
                "think_time_sec": timing_config.get("think_time_sec", 5),
                "response_time_sec": timing_config.get("response_time_sec", 30),
                "total_estimated_sec": timing_config.get("total_estimated_sec", 35)
            }
            logger.info(f"Using base timing config for {q_type}: {formatted['timing']}")
            timing_found = True
        
        # Step 3: Use hardcoded defaults as last resort
        if not timing_found:
            default_timings = {
                "repeat_sentence": {"think_time_sec": 3, "response_time_sec": 15, "total_estimated_sec": 18},
                "minimal_pair": {"think_time_sec": 2, "response_time_sec": 15, "total_estimated_sec": 17},
                "dictation": {"think_time_sec": 3, "response_time_sec": 30, "total_estimated_sec": 33},
                "listen_mcq": {"think_time_sec": 5, "response_time_sec": 25, "total_estimated_sec": 30},
                "image_description": {"think_time_sec": 10, "response_time_sec": 80, "total_estimated_sec": 90},
                "open_response": {"think_time_sec": 30, "response_time_sec": 120, "total_estimated_sec": 150},
                "best_response_mcq": {"think_time_sec": 5, "response_time_sec": 25, "total_estimated_sec": 30},
                "sequence": {"think_time_sec": 3, "response_time_sec": 17, "total_estimated_sec": 20},
                "listen_answer": {"think_time_sec": 5, "response_time_sec": 25, "total_estimated_sec": 30}
            }
            
            if q_type in default_timings:
                formatted["timing"] = default_timings[q_type]
                logger.warning(f"Using hardcoded default timing for {q_type}: {formatted['timing']}")
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
            # SHUFFLE MCQ OPTIONS
            original_options = question.get("metadata", {}).get("options", [])
            correct_answer = question.get("metadata", {}).get("correctAnswer")
            
            # Shuffle the options
            shuffled_options = original_options.copy()
            random.shuffle(shuffled_options)
            
            formatted["options"] = shuffled_options
            formatted["correct_answer"] = correct_answer
            
            # Add audio reference if present
            audio_ref = question.get("metadata", {}).get("audioRef")
            if audio_ref:
                formatted["audio_ref"] = audio_ref
            
            logger.info(f"Shuffled {q_type} options: {shuffled_options}")
            
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
            response_data["level"] = session["current_level"]
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
    
    # Enhanced method with duration-based fluency penalty
    def _evaluate_response(self, response_data: Dict, question_info: Dict) -> Dict:
        """Evaluate response with Language Confidence API and duration-based fluency penalty"""
        try:
            q_type = question_info.get("original_type", "open_response")
            profile_name = self.config["type_to_profile"].get(q_type, "unscripted_mixed")
            scoring_profile = self.config["scoring_profiles"][profile_name]
            
            # Handle non-audio question types first (unchanged)
            if q_type == "minimal_pair":
                logger.info(f"Processing minimal pair question")
                
                correct_answer = question_info.get("metadata", {}).get("correctAnswer", "")
                user_answer = response_data.get("response_data", "").strip()
                is_correct = user_answer == correct_answer
                
                score = 100 if is_correct else 0
                
                logger.info(f"Minimal pair evaluation: Expected '{correct_answer}', Got '{user_answer}', Correct: {is_correct}")
                
                # Get current level
                current_level = response_data.get("level", "A1")

                # Apply weights using helper function
                weighted_result = self._apply_level_and_profile_weights(
                    {"pronunciation": score, "fluency": score, "grammar": score, "vocabulary": score},
                    scoring_profile,
                    current_level
                )

                return {
                    **weighted_result,
                    "is_mock_data": False,
                    "minimal_pair_result": {
                        "user_answer": user_answer,
                        "correct_answer": correct_answer,
                        "is_correct": is_correct
                    }
                }

            elif q_type == "dictation":
                logger.info(f"Processing dictation question")
                
                expected_text = (
                    question_info.get("metadata", {}).get("expectedText") or
                    question_info.get("expected_text") or
                    ""
                ).lower().strip()
                
                user_input = response_data.get("response_data", "").lower().strip()
                
                logger.info(f"Dictation inputs - Expected: '{expected_text}', User: '{user_input}'")

                if expected_text:
                    if user_input:
                        import re
                        expected_clean = re.sub(r'[^\w\s]', '', expected_text).strip()
                        user_clean = re.sub(r'[^\w\s]', '', user_input).strip()
                        
                        expected_words = expected_clean.split()
                        user_words = user_clean.split()
                        
                        correct_words = 0
                        total_words = len(expected_words)
                        
                        for i, expected_word in enumerate(expected_words):
                            if i < len(user_words) and user_words[i] == expected_word:
                                correct_words += 1
                        
                        accuracy = (correct_words / total_words * 100) if total_words > 0 else 0
                        
                    else:
                        accuracy = 0.0
                        correct_words = 0
                        total_words = len(expected_text.split())
                        logger.info(f"Dictation: No user input provided - giving 0% accuracy")
                    
                    scores = {
                        "pronunciation": 0,
                        "fluency": 0,
                        "grammar": 0,
                        "vocabulary": accuracy
                    }
                    
                    logger.info(f"Dictation evaluation: Expected '{expected_text}', Got '{user_input}', Accuracy: {accuracy:.1f}%")
                    
                    # Get current level
                    current_level = response_data.get("level", "A1")

                    # Apply weights using helper function
                    weighted_result = self._apply_level_and_profile_weights(
                        {"pronunciation": 0, "fluency": 0, "grammar": 0, "vocabulary": accuracy},
                        scoring_profile,
                        current_level
                    )

                    return {
                        **weighted_result,
                        "is_mock_data": False,
                        "dictation_result": {
                            "expected_text": expected_text,
                            "user_input": user_input,
                            "word_accuracy": accuracy,
                            "correct_words": correct_words,
                            "total_words": len(expected_text.split())
                        }
                    }
                else:
                    logger.warning(f"No expected text available for dictation question")
                    return self._get_mock_evaluation(scoring_profile, response_data.get("level", "A1"), "No expected text available")
                    
            elif q_type in ["listen_mcq", "best_response_mcq"] or response_data.get("response_type") == "text":
                # MCQ evaluation
                correct_answer = question_info.get("correct_answer", "")
                user_answer = response_data.get("response_data", "").strip()
                is_correct = user_answer == correct_answer
                
                score = 100 if is_correct else 0
                # Get current level
                current_level = response_data.get("level", "A1")

                # Apply weights using helper function
                weighted_result = self._apply_level_and_profile_weights(
                    {"pronunciation": score, "fluency": score, "grammar": score, "vocabulary": score},
                    scoring_profile,
                    current_level
                )

                return {
                    **weighted_result,
                    "is_mock_data": False,
                    "mcq_result": {
                        "user_answer": user_answer,
                        "correct_answer": correct_answer,
                        "is_correct": is_correct
                    }
                }

            # ENHANCED AUDIO PROCESSING WITH DURATION-BASED FLUENCY PENALTY
            if response_data.get("response_type") == "audio":
                try:
                    from .speech_ace_service import lc_pronunciation_sync, lc_unscripted_sync
                    
                    audio_file_path = response_data.get("audio_file_path")
                    if not audio_file_path or not Path(audio_file_path).exists():
                        logger.warning(f"Audio file not found: {audio_file_path}")
                        return self._get_mock_evaluation(scoring_profile, response_data.get("level", "A1"), "Audio file not found")
                    
                    # Calculate expected response duration and actual duration
                    expected_duration = self._get_expected_response_duration(question_info, q_type)
                    actual_duration = self._calculate_audio_duration(audio_file_path)
                    
                    logger.info(f"Duration analysis - Expected: {expected_duration}s, Actual: {actual_duration}s")
                    
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
                            return self._get_mock_evaluation(scoring_profile, response_data.get("level", "A1"), "No expected text provided")
                    
                    # For open_response and other unscripted questions, use unscripted API
                    elif q_type in ["open_response", "image_description", "listen_answer"]:
                        logger.info(f"Calling Language Confidence unscripted API for {q_type}")
                        
                        context = question_info.get("metadata", {}).get("context", {})
                        question_text = context.get("question", question_info.get("prompt", ""))
                        context_description = context.get("context_description", f"{q_type} assessment")
                        
                        result = lc_unscripted_sync(
                            audio_file_path,
                            question=question_text,
                            context_description=context_description,
                            accent=self.config["accent"]
                        )

                    else:
                        logger.info(f"Question type {q_type} - using mock evaluation")
                        return self._get_mock_evaluation(scoring_profile, f"Question type {q_type} not yet supported")
                    
                    logger.info(f"Language Confidence API response type: {type(result)}")
                    
                    # Check for API errors
                    if isinstance(result, dict) and "error" in result:
                        logger.error(f"Language Confidence API error: {result}")
                        return self._get_mock_evaluation(scoring_profile, f"API Error: {result.get('error')}")
                    
                    # Parse the result WITH DURATION-BASED FLUENCY PENALTY
                    parsed_result = self._parse_language_confidence_result_with_duration_penalty(
                        result, scoring_profile, actual_duration, expected_duration, q_type, response_data
                    )
                    parsed_result["question_type"] = q_type
                    parsed_result["scoring_profile"] = profile_name
                    parsed_result["duration_analysis"] = {
                        "expected_duration": expected_duration,
                        "actual_duration": actual_duration,
                        "duration_percentage": (actual_duration / expected_duration * 100) if expected_duration > 0 else 100,
                        "fluency_penalty_applied": q_type in ["open_response", "image_description", "listen_answer"]
                    }
                    
                    return parsed_result
                        
                except ImportError as e:
                    logger.error(f"Language Confidence service import error: {e}")
                    return self._get_mock_evaluation(scoring_profile, response_data.get("level", "A1"), "Language Confidence service not available")

                except Exception as e:
                    logger.error(f"Error calling Language Confidence API: {e}")
                    return self._get_mock_evaluation(scoring_profile, response_data.get("level", "A1"), f"API Error: {str(e)}")

            # Default fallback
            return self._get_mock_evaluation(scoring_profile, response_data.get("level", "A1"), "Unknown response type")
            
        except Exception as e:
            logger.error(f"Error in evaluation: {e}")
            return self._get_mock_evaluation(scoring_profile, response_data.get("level", "A1"), f"Evaluation error: {str(e)}")

    def _get_expected_response_duration(self, question_info: Dict, q_type: str) -> int:
        """Get expected response duration from question timing configuration"""
        try:
            # Get from question timing if available
            timing = question_info.get("timing", {})
            if "response_time_sec" in timing:
                return timing["response_time_sec"]
            
            # Fallback to configuration
            if q_type in self.config.get("question_timing", {}):
                return self.config["question_timing"][q_type].get("response_time_sec", 60)
            
            # Default durations by question type
            defaults = {
                "open_response": 120,
                "image_description": 80,
                "listen_answer": 25,
                "repeat_sentence": 15
            }
            
            return defaults.get(q_type, 60)
            
        except Exception as e:
            logger.warning(f"Error getting expected duration: {e}")
            return 60  # Default fallback

    def _calculate_audio_duration(self, audio_file_path: str) -> float:
        """Calculate actual audio duration in seconds"""
        try:
            import wave
            import contextlib
            
            # Try to get duration from wave file
            try:
                with contextlib.closing(wave.open(audio_file_path, 'r')) as f:
                    frames = f.getnframes()
                    rate = f.getframerate()
                    duration = frames / float(rate)
                    return duration
            except:
                pass
            
            # Try using file size estimation (rough approximation)
            try:
                file_size = Path(audio_file_path).stat().st_size
                # Rough estimate: WebM audio is approximately 16KB per second
                estimated_duration = file_size / 16000
                return max(1.0, estimated_duration)  # Minimum 1 second
            except:
                pass
            
            # If all else fails, try to use the response timestamp (if available)
            logger.warning(f"Could not determine audio duration for {audio_file_path}, using default")
            return 30.0  # Default assumption
            
        except Exception as e:
            logger.error(f"Error calculating audio duration: {e}")
            return 30.0  # Default fallback

    def _calculate_fluency_penalty_multiplier(self, actual_duration: float, expected_duration: float) -> float:
        if expected_duration <= 0:
            return 1.0
        
        duration_percentage = (actual_duration / expected_duration) * 100
        
        # More gradual penalty
        if duration_percentage < 10:
            return 0.1  # Very short
        elif duration_percentage < 25:
            return 0.4  # Short
        elif duration_percentage < 50:
            return 0.7  # Moderate
        elif duration_percentage < 75:
            return 0.85  # Good
        else:
            return 1.0  # Full score

    def _apply_level_and_profile_weights(self, raw_scores: Dict, scoring_profile: Dict, current_level: str) -> Dict:
        """Apply both profile and level-specific weights to raw scores"""
        if not isinstance(raw_scores, dict) or not isinstance(scoring_profile, dict):
            logger.error("Invalid input types for weight application")
            return {"scores": {}, "overall_weighted": 0}
        try:
            # Cache level weights to avoid repeated dict lookups
            if current_level not in self._level_weights_cache:
                self._level_weights_cache[current_level] = self.config.get("level_scoring_weights", {}).get(current_level, {
                    "pronunciation": 0.25, "fluency": 0.25, "grammar": 0.25, "vocabulary": 0.25
                })
            level_weights = self._level_weights_cache[current_level]

            # Apply profile weights first, then level weights
            # IMPORTANT: Raw scores are 0-100, we need to scale by (profile_weight * level_weight)
            final_weighted_scores = {}
            for skill in ["pronunciation", "fluency", "grammar", "vocabulary"]:
                profile_weight = scoring_profile.get(skill, 0)
                level_weight = level_weights.get(skill, 0.25)
                
                # Scale the 0-100 score by the combined weights
                final_weighted_scores[skill] = raw_scores.get(skill, 0) * profile_weight * level_weight

            # Calculate overall score
            overall_score = sum(final_weighted_scores.values())

            # Debug logging
            logger.debug(f"Applied weights for {current_level}: profile={scoring_profile}, level={level_weights}")
            logger.debug(f"Final weighted scores: {final_weighted_scores}")

            return {
                "scores": final_weighted_scores,
                "overall_weighted": overall_score
            }

        except Exception as e:
            logger.error(f"Error applying weights: {e}")
            # Fallback to profile weights only
            fallback_scores = {skill: raw_scores.get(skill, 0) * weight for skill, weight in scoring_profile.items()}
            return {
                "scores": fallback_scores,
                "overall_weighted": sum(fallback_scores.values())
            }

    def _calculate_level_max_points(self, level: str) -> Dict[str, float]:
        """Calculate maximum possible points for a specific level based on configured questions"""
        try:
            max_points = {
                "pronunciation": 0,
                "fluency": 0,
                "grammar": 0,
                "vocabulary": 0,
                "total": 0
            }
            
            if level not in self.config["exam"]["per_level"]:
                return max_points
                
            level_config = self.config["exam"]["per_level"][level]
            type_counts = level_config["type_counts"]
            
            # Get level weights
            level_weights = self.config.get("level_scoring_weights", {}).get(level, {
                "pronunciation": 0.25, "fluency": 0.25, "grammar": 0.25, "vocabulary": 0.25
            })
            
            # Calculate max points using same logic as scoring
            for q_type, count in type_counts.items():
                if count > 0:
                    profile_name = self.config["type_to_profile"].get(q_type, "unscripted_mixed")
                    scoring_profile = self.config["scoring_profiles"][profile_name]
                    
                    # For each question of this type
                    for _ in range(count):
                        # Each question can score 100 in each skill, apply same weighting as scoring
                        for skill in ["pronunciation", "fluency", "grammar", "vocabulary"]:
                            profile_weight = scoring_profile.get(skill, 0)
                            level_weight = level_weights.get(skill, 0.25)
                            
                            # Same calculation as in _apply_level_and_profile_weights
                            skill_max = 100 * profile_weight * level_weight
                            max_points[skill] += skill_max
                            max_points["total"] += skill_max
            
            logger.info(f"Level {level} max points: {max_points}")
            return max_points
            
        except Exception as e:
            logger.error(f"Error calculating level max points: {e}")
            return {"pronunciation": 100, "fluency": 100, "grammar": 100, "vocabulary": 100, "total": 400}

    def _extract_relevance_from_lc_result(self, lc_result: Dict) -> str:
        """
        Extract relevance label from LC result using the same comprehensive approach as streamlined_speech_assessment.py
        
        Returns: One of "relevant", "partially_relevant", "not_relevant"
        """
        # Check multiple possible locations for relevance data (same as ConversationScorer)
        relevance_locations = [
            ("metadata", "content_relevance"),
            ("content_relevance",),
            ("relevance",),
            ("metadata", "relevance"),
            ("assessment", "relevance"),
            ("scores", "relevance")
        ]
        
        for location in relevance_locations:
            current_data = lc_result
            try:
                for key in location:
                    current_data = current_data[key]
                
                if isinstance(current_data, str):
                    label = current_data.lower()  # Convert to lowercase for consistency
                    
                    # Normalize variations to our standard format
                    if "partial" in label:
                        return "partially_relevant"
                    elif "not" in label or "irrelevant" in label:
                        return "not_relevant"
                    elif "relevant" in label:
                        return "relevant"
                        
            except (KeyError, TypeError):
                continue
        
        # Default to relevant if no relevance data found
        logger.info("No relevance label found in LC result, defaulting to relevant")
        return "relevant"

    def _apply_relevancy_multiplier(self, scores: Dict, content_relevance: str) -> tuple[Dict, float]:
        """
        Apply relevancy multiplier to scores based on content relevance from LC API
        
        Args:
            scores: Dict with pronunciation, fluency, grammar, vocabulary scores
            content_relevance: String from LC API - "relevant", "partially_relevant", or "not_relevant"
        
        Returns:
            Tuple of (modified_scores, relevancy_multiplier)
        """
        # Normalize the relevance value to lowercase
        relevance_normalized = content_relevance.lower() if content_relevance else "relevant"
        
        # Determine multiplier based on relevance
        relevancy_multiplier = 1.0
        
        if relevance_normalized == "not_relevant" or "not" in relevance_normalized:
            relevancy_multiplier = 0.0
            logger.info(f"Content not relevant - applying 0x multiplier (zeroing all scores)")
        elif relevance_normalized == "partially_relevant" or "partial" in relevance_normalized:
            relevancy_multiplier = 0.5
            logger.info(f"Content partially relevant - applying 0.5x multiplier")
        elif relevance_normalized == "relevant" or relevance_normalized == "":
            relevancy_multiplier = 1.0
            logger.info(f"Content relevant - applying 1.0x multiplier (no penalty)")
        else:
            # Unknown relevance value - log warning but don't penalize
            logger.warning(f"Unknown content_relevance value: {content_relevance}, defaulting to 1.0x")
            relevancy_multiplier = 1.0
        
        # Apply multiplier to all scores
        modified_scores = {}
        for skill in ["pronunciation", "fluency", "grammar", "vocabulary"]:
            if skill in scores:
                original_score = scores[skill]
                modified_scores[skill] = original_score * relevancy_multiplier
                if relevancy_multiplier != 1.0:
                    logger.info(f"{skill} score adjusted for relevancy: {original_score:.1f} -> {modified_scores[skill]:.1f}")
        
        return modified_scores, relevancy_multiplier


    def _parse_language_confidence_result_with_duration_penalty(self, result: Dict, scoring_profile: Dict, actual_duration: float, expected_duration: float, q_type: str, response_data: Dict) -> Dict:
        """Parse Language Confidence API response with duration-based fluency penalty AND relevancy scoring"""
        try:
            logger.info(f"Parsing Language Confidence result with duration penalty and relevancy check")
            
            # Extract content relevance from the API response using comprehensive search
            content_relevance = self._extract_relevance_from_lc_result(result)
            logger.info(f"Content relevance extracted from API: {content_relevance}")
            
            # Extract transcription and word data (unchanged from original method)
            transcription_words = []
            word_phoneme_data = []
            
            # Handle unscripted API response structure
            if "pronunciation" in result and "words" in result["pronunciation"]:
                logger.info("Processing unscripted API response")
                words_data = result["pronunciation"]["words"]
                
                transcription = result.get("metadata", {}).get("predicted_text", "")
                logger.info(f"Transcription from unscripted API: '{transcription}'")
                
                for word_index, word_obj in enumerate(words_data):
                    word_text = word_obj.get("word_text", f"word_{word_index}")
                    
                    phonemes_list = []
                    phonemes_data = word_obj.get("phonemes", [])
                    
                    if isinstance(phonemes_data, list) and phonemes_data:
                        for phoneme_obj in phonemes_data:
                            phoneme_data = {
                                "ipa": phoneme_obj.get("ipa_label", "?"),
                                "score": round(float(phoneme_obj.get("phoneme_score", 0))),
                                "expected_ipa": phoneme_obj.get("expected_ipa"),
                                "actual_ipa": phoneme_obj.get("actual_ipa"),
                                "confidence": phoneme_obj.get("confidence"),
                                "start_time": phoneme_obj.get("start_time"),
                                "end_time": phoneme_obj.get("end_time")
                            }
                            phonemes_list.append(phoneme_data)
                    
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
                
            # Handle pronunciation API response structure
            elif "words" in result and isinstance(result["words"], list):
                logger.info("Processing pronunciation API response")
                words_data = result["words"]
                previous_end_time = 0
                
                for word_index, word_obj in enumerate(words_data):
                    word_text = word_obj.get("word_text", word_obj.get("text", f"word_{word_index}"))
                    
                    word_start_time = word_obj.get("start_time", 0)
                    if word_index > 0 and word_start_time > previous_end_time:
                        pause_duration = word_start_time - previous_end_time
                        if pause_duration > 0.3:
                            transcription_words.append(f"[pause {pause_duration:.1f}s]")
                    
                    transcription_words.append(word_text)
                    previous_end_time = word_obj.get("end_time", word_start_time + 0.5)
                    
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
                    
                    if phonemes_list:
                        word_phoneme_data.append({
                            "word": word_text,
                            "phonemes": phonemes_list
                        })
                        logger.info(f"Added word '{word_text}' with {len(phonemes_list)} phonemes to word_phoneme_data")
                
                transcription = " ".join(transcription_words)
                
                # Extract scores from pronunciation response
                raw_scores = {}
                if "overall_score" in result:
                    raw_scores["pronunciation"] = result["overall_score"]
                    raw_scores["fluency"] = max(0, result["overall_score"] - 5)
                    raw_scores["grammar"] = max(0, result["overall_score"] - 10)  
                    raw_scores["vocabulary"] = max(0, result["overall_score"] - 8)
                else:
                    raw_scores["pronunciation"] = result.get("pronunciation", {}).get("overall_score", 0)
                    raw_scores["fluency"] = result.get("fluency", {}).get("overall_score", 0) 
                    raw_scores["grammar"] = result.get("grammar", {}).get("overall_score", 0)
                    raw_scores["vocabulary"] = result.get("vocabulary", {}).get("overall_score", 0)
            
            logger.info(f"Extracted raw scores before adjustments: {raw_scores}")
            
            # STEP 1: Apply relevancy multiplier FIRST (before any other adjustments)
            raw_scores, relevancy_multiplier = self._apply_relevancy_multiplier(raw_scores, content_relevance)
            logger.info(f"Scores after relevancy adjustment: {raw_scores}")
            
            # STEP 2: Apply duration-based fluency penalty (only if content is relevant)
            fluency_penalty_multiplier = 1.0
            if q_type in ["open_response", "image_description"] and relevancy_multiplier > 0:
                fluency_penalty_multiplier = self._calculate_fluency_penalty_multiplier(actual_duration, expected_duration)
                logger.info(f"Applying fluency penalty: {fluency_penalty_multiplier:.2f}x for {actual_duration:.1f}s/{expected_duration:.1f}s duration")
                
                # Apply penalty ONLY to fluency score
                if "fluency" in raw_scores:
                    original_fluency = raw_scores["fluency"]
                    raw_scores["fluency"] = original_fluency * fluency_penalty_multiplier
                    logger.info(f"Fluency score adjusted for duration: {original_fluency:.1f} -> {raw_scores['fluency']:.1f}")
            else:
                if relevancy_multiplier == 0:
                    logger.info(f"No duration penalty applied due to irrelevant content")
                else:
                    logger.info(f"No duration penalty applied for question type: {q_type}")
            
            # Get the current level for this question
            current_level = response_data.get("level", "A1")
            if not current_level:
                # Fallback to session level - need session_id parameter
                if hasattr(self, 'sessions') and len(self.sessions) > 0:
                    # Get the most recent session (for this context)
                    session_id = list(self.sessions.keys())[-1]  # This is a workaround
                    current_level = self.sessions[session_id]["current_level"]
                else:
                    current_level = "A1"
            
            logger.info(f"Language Confidence parsed successfully - Final scores: {raw_scores}, Relevancy: {relevancy_multiplier:.1f}x, Fluency penalty: {fluency_penalty_multiplier:.2f}x")
            
            # Apply weights using helper function
            weighted_result = self._apply_level_and_profile_weights(raw_scores, scoring_profile, current_level)

            return {
                **weighted_result,
                "raw_scores": raw_scores,
                "transcription": transcription,
                "word_phoneme_data": word_phoneme_data,
                "language_confidence_response": result,
                "is_mock_data": False,
                "relevancy_multiplier": relevancy_multiplier,
                "content_relevance": content_relevance,
                "fluency_penalty_multiplier": fluency_penalty_multiplier,
                "duration_analysis": {
                    "actual_duration": actual_duration,
                    "expected_duration": expected_duration,
                    "duration_percentage": (actual_duration / expected_duration * 100) if expected_duration > 0 else 100
                },
                # Add extra data from unscripted API
                "english_proficiency": result.get("overall", {}).get("english_proficiency_scores", {}),
                "content_relevance": content_relevance,  # Include for reporting
                "grammar_feedback": result.get("grammar", {}).get("feedback", {}),
                "fluency_feedback": result.get("fluency", {}).get("feedback", {})
            }
            
        except Exception as e:
            logger.error(f"Error parsing Language Confidence result with duration penalty and relevancy: {e}")
            return self._get_mock_evaluation(scoring_profile, response_data.get("level", "A1"), f"Failed to parse API response: {str(e)}")
    
    def _get_mock_evaluation(self, scoring_profile: Dict, current_level: str="A1", note: str="Mock data") -> Dict:
        """Generate mock evaluation with level-specific weights"""
        import random
        base_score = random.uniform(60, 90)
        
        raw_scores = {}
        for skill in ["pronunciation", "fluency", "grammar", "vocabulary"]:
            variation = random.uniform(-10, 10)
            raw_scores[skill] = max(0, min(100, base_score + variation))
        
        # Use the same weighting logic as real evaluations
        weighted_result = self._apply_level_and_profile_weights(raw_scores, scoring_profile, current_level)
        
        logger.warning(f"Using mock evaluation: {note}")
        
        return {
            **weighted_result,
            "is_mock_data": True,
            "transcription": "Mock data - no real transcription available",
            "word_phoneme_data": [],
            "evaluation_note": note
        }
    
    def _handle_level_complete(self, session_id: str) -> Dict:
        """Handle level completion with per-level scoring"""
        try:
            session = self.sessions[session_id]
            current_level = session["current_level"]
            
            # Calculate level score as percentage of that level only
            level_max_points = self._calculate_level_max_points(current_level)
            level_data = session["level_scores"][current_level]
            questions = level_data["questions"]
            
            # Sum actual points earned for this level
            level_earned_points = {"pronunciation": 0, "fluency": 0, "grammar": 0, "vocabulary": 0, "total": 0}
            
            for question in questions:
                scores = question.get("scores", {})
                for skill in ["pronunciation", "fluency", "grammar", "vocabulary"]:
                    if skill in scores:
                        level_earned_points[skill] += scores[skill]
                        level_earned_points["total"] += scores[skill]
            
            # Calculate level percentage
            if level_max_points["total"] > 0:
                level_percentage = (level_earned_points["total"] / level_max_points["total"]) * 100
            else:
                level_percentage = 0
            
            level_data["earned_points"] = level_earned_points
            level_data["max_points"] = level_max_points
            level_data["level_percentage"] = level_percentage
            level_data["passed"] = level_percentage >= self.LEVEL_THRESHOLD
            
            session["completed_levels"].append(current_level)
            
            logger.info(f"Level {current_level} completed: {level_percentage:.1f}% ({level_earned_points['total']:.1f}/{level_max_points['total']:.1f})")
            
            # Check if passed and has next level
            if level_percentage >= self.LEVEL_THRESHOLD:
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
                                "level_percentage": level_percentage,
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

            # DEBUG: Log the report structure to see what's being sent to frontend
            logger.info(f"Generated final report structure: {list(report.keys())}")
            if "cumulative_skills" in report:
                logger.info(f"Cumulative skills data: {report['cumulative_skills']}")
            else:
                logger.warning("cumulative_skills not found in report!")

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
        """Generate final report with per-level scores and cumulative skill scores"""
        try:
            session = self.sessions[session_id]
            
            # Calculate per-level scores
            level_scores = {}
            level_details = []  # Add this for frontend compatibility
            
            for level in session.get("completed_levels", []):
                if level in session.get("level_scores", {}):
                    level_data = session["level_scores"][level]
                    level_scores[level] = {
                        "percentage": level_data.get("level_percentage", 0),
                        "earned_points": level_data.get("earned_points", {}),
                        "max_points": level_data.get("max_points", {}),
                        "passed": level_data.get("passed", False),
                        "questions_completed": len(level_data.get("questions", []))
                    }
                    
                    # Add level_details for frontend compatibility
                    level_details.append({
                        "level": level,
                        "average_score": level_data.get("level_percentage", 0),  # Frontend expects this field
                        "level_percentage": level_data.get("level_percentage", 0),
                        "passed": level_data.get("passed", False),
                        "questions": level_data.get("questions", []),
                        "skill_breakdown": {
                            "pronunciation": 0,  # You can calculate these if needed
                            "fluency": 0,
                            "grammar": 0,
                            "vocabulary": 0
                        }
                    })
            
            # Calculate normalized cumulative scores (earned/total possible)
            earned_points = {"pronunciation": 0, "fluency": 0, "grammar": 0, "vocabulary": 0, "total": 0}
            
            # Sum up all earned points from completed questions
            for level_data in session["level_scores"].values():
                for question in level_data["questions"]:
                    scores = question.get("scores", {})
                    for skill in ["pronunciation", "fluency", "grammar", "vocabulary"]:
                        if skill in scores and isinstance(scores[skill], (int, float)):
                            earned_points[skill] += scores[skill]
                            earned_points["total"] += scores[skill]
            
            # Calculate normalized percentages
            cumulative_percentages = {}
            for skill in ["pronunciation", "fluency", "grammar", "vocabulary"]:
                if self.total_exam_points[skill] > 0:
                    cumulative_percentages[skill] = (earned_points[skill] / self.total_exam_points[skill]) * 100
                else:
                    cumulative_percentages[skill] = 0
            
            logger.info(f"Earned points: {earned_points}")
            logger.info(f"Total possible points: {self.total_exam_points}")
            logger.info(f"Normalized cumulative percentages: {cumulative_percentages}")
                        
            # Overall performance based on completed levels
            attempted_levels = list(session.get("level_scores", {}).keys())
            highest_level_attempted = "A1"
            if attempted_levels:
                level_order = self.config["exam"]["order"]
                highest_level_attempted = max(
                    attempted_levels,
                    key=lambda x: level_order.index(x) if x in level_order else 0
                )
            
            return {
            "session_id": session_id,
            "user_id": session["user_id"],
            "exam_date": session["started_at"],
            "completion_date": session.get("completed_at"),
            
            # Per-level performance
            "level_performance": level_scores,
            
            # Add level_details for frontend compatibility
            "level_details": level_details,
            
            # Cumulative skill performance across all levels
            "cumulative_skills": {
                "pronunciation": round(cumulative_percentages["pronunciation"], 1),
                "fluency": round(cumulative_percentages["fluency"], 1),
                "grammar": round(cumulative_percentages["grammar"], 1),
                "vocabulary": round(cumulative_percentages["vocabulary"], 1)
            },
            
            # Exam progress
            "exam_progress": {
                "highest_level_attempted": highest_level_attempted,
                "levels_attempted": attempted_levels,
                "total_questions_completed": sum(
                    len(level_data["questions"]) 
                    for level_data in session["level_scores"].values()
                )
            }
        }
            
        except Exception as e:
            logger.error(f"Error generating final report: {e}")
            return {"error": f"Failed to generate report: {str(e)}", "session_id": session_id}

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
                            
                            # Get level-specific weights
                            level_weights = self.config.get("level_scoring_weights", {}).get(level, {
                                "pronunciation": 0.25, "fluency": 0.25, "grammar": 0.25, "vocabulary": 0.25
                            })
                            
                            # Each question is worth 100 points, distributed by profile AND level weights
                            for skill, profile_weight in scoring_profile.items():
                                level_weight = level_weights.get(skill, 0.25)
                                skill_points = count * 100 * profile_weight * level_weight
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

    def _calculate_total_exam_points_normalized(self) -> Dict[str, float]:
        """Calculate total possible points for each skill across entire exam"""
        try:
            total_points = {
                "pronunciation": 0,
                "fluency": 0, 
                "grammar": 0,
                "vocabulary": 0,
                "total": 0
            }
            
            # Iterate through all levels in exam order
            for level in self.config["exam"]["order"]:
                if level not in self.config["exam"]["per_level"]:
                    continue
                    
                level_config = self.config["exam"]["per_level"][level]
                type_counts = level_config["type_counts"]
                level_weights = self.config.get("level_scoring_weights", {}).get(level, {
                    "pronunciation": 0.25, "fluency": 0.25, "grammar": 0.25, "vocabulary": 0.25
                })
                
                # For each question type in this level
                for q_type, count in type_counts.items():
                    if count > 0:
                        profile_name = self.config["type_to_profile"].get(q_type, "unscripted_mixed")
                        scoring_profile = self.config["scoring_profiles"][profile_name]
                        
                        # Each question can score max 100 points, apply profile weights then level weights
                        for skill in ["pronunciation", "fluency", "grammar", "vocabulary"]:
                            profile_weight = scoring_profile.get(skill, 0)
                            level_weight = level_weights.get(skill, 0.25)
                            
                            # Points for this skill from these questions
                            skill_points = count * 100 * profile_weight * level_weight
                            total_points[skill] += skill_points
                            total_points["total"] += skill_points
            
            logger.info(f"Total exam points breakdown: {total_points}")
            return total_points
            
        except Exception as e:
            logger.error(f"Error calculating total exam points: {e}")
            return {"pronunciation": 1000, "fluency": 1000, "grammar": 500, "vocabulary": 500, "total": 3000}