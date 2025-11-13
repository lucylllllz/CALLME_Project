# CALLME: Your Native English Coach

A multimodal AI-powered English learning application that helps users practice English through interactive conversations with support for text, images, sketches, and voice input.

## Overview

CALLME is an innovative language learning platform that combines multiple input methods to create a natural and engaging English practice environment. The application provides real-time feedback using AI-powered coaching with structured responses covering fluency, expression improvements, and practical learning tips.

## Features

### 🎤 Voice Input
- **Real-time Recording**: Record your voice directly in the browser
- **Audio File Upload**: Upload pre-recorded audio files (.mp3, .wav, .m4a, .ogg, .webm)
- **Automatic Transcription**: Powered by OpenAI Whisper API
- **Fluency Evaluation**: Get detailed fluency metrics through GPU-accelerated backend analysis

### 🖼️ Visual Learning
- **Image Upload**: Share images to practice descriptive English
- **Sketch Canvas**: Draw sketches with built-in drawing tools
- **Sketch-to-Realistic Conversion**: AI-powered sketch processing through GPU backend
- **Multi-color Drawing**: 8 color options with adjustable brush sizes

### 💬 Intelligent Coaching
- **Structured Feedback**: 5-part response format
  1. **Fluency & Understanding**: Fluency metrics and comprehension acknowledgment
  2. **Better Expression**: Natural, fluent rephrasing of your message
  3. **Feedback**: Constructive points on strengths and improvements
  4. **Key Phrases**: Useful vocabulary and expressions
  5. **Speaking Tip**: Practical improvement suggestions
- **GPT-4o-mini**: Powered by OpenAI's latest language model
- **Multimodal Support**: Combines text, images, and audio for comprehensive learning

### 🎨 User Experience
- **Modern UI**: Green gradient theme with glassmorphic design
- **Responsive Layout**: Optimized for desktop and mobile
- **User Profiles**: Track your learning progress
- **Settings & Preferences**: Customizable user levels (Beginner, Intermediate, Advanced)
- **Real-time Feedback**: Toast notifications and visual indicators

## Tech Stack

### Frontend
- **React 18**: Modern UI library with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS v4**: Utility-first styling
- **Shadcn/UI**: High-quality component library
- **Lucide React**: Beautiful icon set
- **Sonner**: Elegant toast notifications

### Backend
- **Supabase Edge Functions**: Serverless backend
- **Hono**: Fast, lightweight web framework
- **Deno**: Secure JavaScript/TypeScript runtime
- **OpenAI APIs**: Whisper (transcription) & GPT-4o-mini (chat)
- **GPU Backend Server**: Custom fluency evaluation and sketch processing

### Key Libraries
- **FileReader API**: Client-side file processing
- **MediaRecorder API**: Browser audio recording
- **Canvas API**: Sketch drawing functionality

## Architecture

```
Frontend (React + TypeScript)
    ↓
Supabase Edge Function (Hono Server)
    ↓
├── OpenAI Whisper API (Transcription)
├── OpenAI GPT-4o-mini API (Chat)
└── GPU Backend Server
    ├── /fluency (Speech fluency evaluation)
    └── /sketch2real (Sketch conversion)
```

## Project Structure

```
/
├── App.tsx                          # Main application component
├── components/
│   ├── CallmeLogo.tsx               # Application logo
│   ├── ChatMessage.tsx              # Chat message bubbles
│   ├── MicrophonePermissionGuide.tsx # Microphone setup help
│   ├── SettingsDialog.tsx           # User settings modal
│   ├── SketchCanvas.tsx             # Drawing canvas component
│   ├── UserSidebar.tsx              # User profile sidebar
│   └── ui/                          # Shadcn UI components
├── styles/
│   └── globals.css                  # Global styles and Tailwind config
├── utils/
│   ├── callmeService.ts             # API service functions
│   └── supabase/
│       └── info.tsx                 # Supabase configuration
└── supabase/
    └── functions/
        └── server/
            ├── index.tsx            # Main server routes
            └── kv_store.tsx         # Key-value store utilities (protected)
```

## API Endpoints

### `/make-server-96f01fbd/transcribe` (POST)
Transcribes audio files to text using OpenAI Whisper.

**Request:**
- `Content-Type: multipart/form-data`
- `audio`: Audio file (Blob/File)

**Response:**
```json
{
  "text": "transcribed text",
  "success": true
}
```

### `/make-server-96f01fbd/chat` (POST)
Processes messages and returns AI coaching feedback.

**Request:**
```json
{
  "message": "text message",
  "imageUrl": "data:image/png;base64,...",
  "isSketch": false,
  "audioDataUri": "data:audio/webm;base64,..."
}
```

**Response:**
```json
{
  "message": "AI coach response",
  "fluency": { /* fluency metrics */ },
  "success": true
}
```

### `/make-server-96f01fbd/fluency` (POST)
Evaluates speech fluency using GPU backend.

**Request:**
```json
{
  "audioDataUri": "data:audio/webm;base64,..."
}
```

**Response:**
```json
{
  "fluency": { /* detailed fluency metrics */ },
  "success": true
}
```

### `/make-server-96f01fbd/sketch2realistic` (POST)
Processes sketch images using GPU backend.

**Request:**
```json
{
  "imageDataUri": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "result": { /* processing results */ },
  "success": true
}
```

### `/make-server-96f01fbd/history/:userId` (GET/POST)
Manages conversation history (up to 100 messages per user).

## Environment Variables

The following environment variables must be configured in Supabase:

- `OPENAI_API_KEY`: Your OpenAI API key
- `SUPABASE_URL`: Supabase project URL (auto-configured)
- `SUPABASE_ANON_KEY`: Supabase anonymous key (auto-configured)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (auto-configured)

## Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (requires microphone permission setup)
- **Requirements**: 
  - HTTPS or localhost (for microphone access)
  - Modern browser with MediaRecorder API support
  - Enabled JavaScript

## Performance Considerations

- **Audio Recording**: WebM format for efficient storage
- **Image Processing**: Base64 encoding for data URIs
- **Lazy Loading**: Components loaded on demand
- **Optimized Animations**: CSS transitions and transforms
- **Debouncing**: Input handling optimizations

## Security

- **API Keys**: Stored securely in Supabase environment variables
- **CORS**: Configured for controlled access
- **Data Privacy**: No persistent storage of audio/images beyond session
- **Input Validation**: Server-side validation for all inputs
- **HTTPS**: Required for microphone access

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Semantic HTML and ARIA labels
- **Visual Indicators**: Clear status messages and feedback
- **Error Handling**: Comprehensive error messages with guidance

## Known Limitations

- Sketch processing requires GPU backend server availability
- Fluency evaluation requires audio input
- Browser microphone permissions must be granted manually
- Maximum conversation history: 100 messages per user

## Contributing

This is a prototype application. For production deployment, consider:
- Adding user authentication
- Implementing persistent storage
- Rate limiting API calls
- Enhanced error recovery
- Analytics integration
- Multi-language support

## License

This project is built as a demonstration of multimodal AI-powered language learning.

## Support

For microphone issues, click the "Need help?" button in the app for detailed browser-specific setup instructions.
