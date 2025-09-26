#!/usr/bin/env python3
"""
Script to generate audio files using ElevenLabs API for placement test questions.
Processes JSON files and creates audio files for questions with audioRef metadata.
Modified to handle minimal pairs using the "correctAnswer" field.
Skips audio generation if the file already exists.
"""

import json
import os
import requests
from pathlib import Path
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

class ElevenLabsAudioGenerator:
    def __init__(self):
        self.api_key = os.getenv('ELEVENLABS_API_KEY')
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY not found in environment variables")
        
        self.base_url = "https://api.elevenlabs.io/v1"
        self.headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        
        # Default voice ID (you can change this to your preferred voice)
        # This is Rachel's voice ID - a popular English voice
        self.voice_id = "21m00Tcm4TlvDq8ikWAM"
        
        # Audio output directory
        self.audio_dir = Path("audio")
        self.audio_dir.mkdir(exist_ok=True)
    
    def get_available_voices(self):
        """Fetch available voices from ElevenLabs API"""
        try:
            response = requests.get(f"{self.base_url}/voices", headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching voices: {e}")
            return None
    
    def text_to_speech(self, text, filename):
        """Convert text to speech and save as WAV file"""
        output_path = self.audio_dir / filename
        
        # Check if file already exists
        if output_path.exists():
            print(f"⏭️  Skipped: {filename} (already exists)")
            return True
        
        url = f"{self.base_url}/text-to-speech/{self.voice_id}"
        
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5,
                "speed": 0.75  # Controls speech speed: 0.25 (slow) to 2.0 (fast), default is 1.0
            }
        }
        
        try:
            response = requests.post(url, json=data, headers=self.headers)
            response.raise_for_status()
            
            # Save the audio file
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            print(f"✅ Generated: {filename}")
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error generating {filename}: {e}")
            return False
    
    def process_json_file(self, json_file_path):
        """Process a single JSON file and generate audio for relevant questions"""
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            processed_count = 0
            skipped_count = 0
            
            for item in data:
                metadata = item.get('metadata', {})
                
                # Check if this item has audioRef
                if 'audioRef' in metadata:
                    audio_ref = metadata['audioRef']
                    
                    # Determine which text to use for audio generation
                    text_to_convert = None
                    
                    # For minimal pairs, use the "correctAnswer" field
                    if item.get('type') == 'minimal_pair' and 'correctAnswer' in metadata:
                        text_to_convert = metadata['correctAnswer']
                        print(f"🎯 Minimal pair detected - using correctAnswer: '{text_to_convert}'")
                    # Priority: expectedText first, then audioText
                    elif 'expectedText' in metadata:
                        text_to_convert = metadata['expectedText']
                    elif 'audioText' in metadata:
                        text_to_convert = metadata['audioText']
                    
                    if text_to_convert:
                        # Extract filename from audioRef (e.g., "audio/a1_dict_001.wav" -> "a1_dict_001.wav")
                        filename = Path(audio_ref).name
                        
                        # Check if file already exists before processing
                        output_path = self.audio_dir / filename
                        if output_path.exists():
                            skipped_count += 1
                            print(f"⏭️  Skipped: {filename} (already exists)")
                        else:
                            # Generate audio
                            if self.text_to_speech(text_to_convert, filename):
                                processed_count += 1
                            
                            # Add a small delay to avoid rate limiting
                            time.sleep(0.5)
                    else:
                        print(f"⚠️  Warning: {item.get('id', 'Unknown ID')} has audioRef but no correctAnswer/expectedText/audioText")
            
            print(f"Generated {processed_count} new audio files from {json_file_path.name}")
            if skipped_count > 0:
                print(f"Skipped {skipped_count} existing audio files from {json_file_path.name}")
            return processed_count, skipped_count
            
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"Error processing {json_file_path}: {e}")
            return 0, 0
    
    def process_all_files(self, json_files):
        """Process all JSON files provided"""
        total_processed = 0
        total_skipped = 0
        
        print("Starting audio generation...")
        print(f"Using voice ID: {self.voice_id}")
        print(f"Output directory: {self.audio_dir.absolute()}")
        print("-" * 50)
        
        for json_file in json_files:
            if json_file.exists():
                processed, skipped = self.process_json_file(json_file)
                total_processed += processed
                total_skipped += skipped
            else:
                print(f"Warning: {json_file} not found")
        
        print("-" * 50)
        print(f"Total new audio files generated: {total_processed}")
        print(f"Total existing audio files skipped: {total_skipped}")
        print(f"Total audio files processed: {total_processed + total_skipped}")
    
    def list_voices_info(self):
        """Display available voices for reference"""
        voices = self.get_available_voices()
        if voices:
            print("Available voices:")
            for voice in voices.get('voices', [])[:10]:  # Show first 10 voices
                print(f"  - {voice['name']} (ID: {voice['voice_id']}) - {voice.get('labels', {}).get('accent', 'N/A')}")
            print("...")

def main():
    try:
        generator = ElevenLabsAudioGenerator()
        
        # List available voices (optional - comment out if you don't want to see this)
        # generator.list_voices_info()
        # print()
        
        # Define JSON files to process
        json_files = [
            Path('a1.json'),
            Path('a2.json'),
            Path('b1.json'),
            Path('b2.json'),
            Path('c1.json'),
            Path('c2.json')
        ]
        
        # Process all files
        generator.process_all_files(json_files)
        
    except ValueError as e:
        print(f"Configuration error: {e}")
        print("Please make sure ELEVENLABS_API_KEY is set in your .env file")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()