import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-96f01fbd`;

// Transcribe audio file to text
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await fetch(`${BASE_URL}/transcribe`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Transcription failed');
  }

  const result = await response.json();
  return result.text;
}

// Send message to AI coach
export async function sendChatMessage(
  message: string, 
  imageUrl?: string, 
  isSketch?: boolean,
  audioDataUri?: string
): Promise<{ message: string; fluency: any }> {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({
      message,
      imageUrl,
      isSketch,
      audioDataUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Chat request failed');
  }

  const result = await response.json();
  return {
    message: result.message,
    fluency: result.fluency,
  };
}

// Save conversation to history
export async function saveToHistory(userId: string, message: any): Promise<void> {
  await fetch(`${BASE_URL}/history/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(message),
  });
}

// Get conversation history
export async function getHistory(userId: string): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/history/${userId}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to retrieve history');
  }

  const result = await response.json();
  return result.history;
}
