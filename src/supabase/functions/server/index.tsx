import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-96f01fbd/health", (c) => {
  return c.json({ status: "ok" });
});

// Audio transcription endpoint using OpenAI Whisper API
app.post("/make-server-96f01fbd/transcribe", async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.log(
        "Transcription error: OPENAI_API_KEY not found in environment",
      );
      return c.json({ error: "API key not configured" }, 500);
    }

    const formData = await c.req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File)) {
      console.log(
        "Transcription error: No audio file provided",
      );
      return c.json({ error: "No audio file provided" }, 400);
    }

    // Create form data for OpenAI API
    const openaiFormData = new FormData();
    openaiFormData.append("file", audioFile);
    openaiFormData.append("model", "whisper-1");

    console.log(
      `Transcribing audio file: ${audioFile.name}, size: ${audioFile.size} bytes`,
    );

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: openaiFormData,
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.log(
        `OpenAI Whisper API error: ${response.status} - ${errorData}`,
      );
      return c.json(
        { error: `Transcription failed: ${errorData}` },
        response.status,
      );
    }

    const result = await response.json();
    console.log(`Transcription successful: ${result.text}`);

    return c.json({
      text: result.text,
      success: true,
    });
  } catch (error) {
    console.log(`Error during audio transcription: ${error}`);
    return c.json(
      { error: `Transcription error: ${error.message}` },
      500,
    );
  }
});

// Fluency evaluation endpoint - calls backend_server
app.post("/make-server-96f01fbd/fluency", async (c) => {
  try {
    const BACKEND_SERVER_URL =
      "https://zqzydflnzyyuuiyckzho.supabase.co/functions/v1/backend_server";

    const body = await c.req.json();
    const { audioDataUri } = body;

    if (!audioDataUri) {
      console.log("Fluency error: No audio data provided");
      return c.json({ error: "No audio data provided" }, 400);
    }

    console.log(
      `Calling backend_server fluency endpoint with audio data`,
    );

    // Call backend_server with the audio data URI
    const response = await fetch(BACKEND_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: "fluency",
        audio: audioDataUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.log(
        `Backend server fluency error: ${response.status} - ${errorData}`,
      );
      return c.json(
        { error: `Fluency evaluation failed: ${errorData}` },
        response.status,
      );
    }

    const result = await response.json();
    console.log(
      `Fluency evaluation successful: ${JSON.stringify(result)}`,
    );

    return c.json({
      fluency: result,
      success: true,
    });
  } catch (error) {
    console.log(`Error during fluency evaluation: ${error}`);
    return c.json(
      { error: `Fluency evaluation error: ${error.message}` },
      500,
    );
  }
});

// Sketch to realistic image endpoint - calls backend_server
app.post(
  "/make-server-96f01fbd/sketch2realistic",
  async (c) => {
    try {
      const BACKEND_SERVER_URL =
        "https://zqzydflnzyyuuiyckzho.supabase.co/functions/v1/backend_server";

      const body = await c.req.json();
      const { imageDataUri } = body;

      if (!imageDataUri) {
        console.log(
          "Sketch2Realistic error: No image data provided",
        );
        return c.json({ error: "No image data provided" }, 400);
      }

      console.log(
        `Calling backend_server sketch2real endpoint with image data`,
      );

      // Call backend_server with the image data URI
      const response = await fetch(BACKEND_SERVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: "sketch2real",
          image: imageDataUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.log(
          `Backend server sketch2real error: ${response.status} - ${errorData}`,
        );
        return c.json(
          { error: `Sketch conversion failed: ${errorData}` },
          response.status,
        );
      }

      const result = await response.json();
      console.log(
        `Sketch conversion successful: ${JSON.stringify(result)}`,
      );

      return c.json({
        result: result,
        success: true,
      });
    } catch (error) {
      console.log(`Error during sketch conversion: ${error}`);
      return c.json(
        { error: `Sketch conversion error: ${error.message}` },
        500,
      );
    }
  },
);

// Chat endpoint using OpenAI GPT-4 for English coaching
app.post("/make-server-96f01fbd/chat", async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.log(
        "Chat error: OPENAI_API_KEY not found in environment",
      );
      return c.json({ error: "API key not configured" }, 500);
    }

    const body = await c.req.json();
    const { message, imageUrl, isSketch, audioDataUri } = body;

    if (!message && !imageUrl) {
      console.log("Chat error: No message or image provided");
      return c.json(
        { error: "No message or image provided" },
        400,
      );
    }

    // Step 1: Get fluency evaluation if there's audio
    let fluency = null;
    if (audioDataUri) {
      try {
        console.log(
          "Calling fluency evaluation with audio data...",
        );
        const url = new URL(c.req.url);
        const baseUrl = `${url.protocol}//${url.host}${url.pathname.replace("/chat", "/fluency")}`;
        const fluencyResponse = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: c.req.header("Authorization") || "",
          },
          body: JSON.stringify({ audioDataUri }),
        });

        if (fluencyResponse.ok) {
          const fluencyResult = await fluencyResponse.json();
          fluency = fluencyResult.fluency;
          console.log(
            "Fluency evaluation received:",
            JSON.stringify(fluency),
          );
        } else {
          const errorData = await fluencyResponse.text();
          console.log(
            `Fluency evaluation failed: ${errorData}`,
          );
        }
      } catch (error) {
        console.log(
          `Fluency evaluation failed (non-critical): ${error}`,
        );
      }
    }

    // Step 2: If it's a sketch, convert to realistic/process it
    let sketchResult = null;
    let finalImageUrl = imageUrl;
    if (isSketch && imageUrl) {
      try {
        console.log("Processing sketch image...");
        const url = new URL(c.req.url);
        const baseUrl = `${url.protocol}//${url.host}${url.pathname.replace("/chat", "/sketch2realistic")}`;
        const sketchResponse = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: c.req.header("Authorization") || "",
          },
          body: JSON.stringify({ imageDataUri: imageUrl }),
        });

        if (sketchResponse.ok) {
          const sketchData = await sketchResponse.json();
          sketchResult = sketchData.result;
          console.log(
            "Sketch processing successful:",
            JSON.stringify(sketchResult),
          );
          // Keep using the original sketch URL for display
          finalImageUrl = imageUrl;
        } else {
          const errorData = await sketchResponse.text();
          console.log(`Sketch processing failed: ${errorData}`);
        }
      } catch (error) {
        console.log(
          `Sketch processing failed (non-critical): ${error}`,
        );
      }
    }

    // Step 3: Construct the new prompt with fluency data
    console.log(fluency);
    const prompt =
      `You are an English-speaking coach helping ESL learners express themselves naturally and fluently.\n` +
      `The learner provides either text or speech${fluency ? " (with a fluency evaluation)" : ""}${finalImageUrl ? " and an image" : ""}${isSketch ? " (a sketch they drew)" : ""}.\n\n` +
      `Please respond in five short sections with clear labels:\n` +
      `1. Fluency & Understanding — ` +
      `${
        fluency
          ? `Output the following fluency evaluation fields directly as key-value pairs (use numeric values if applicable). ` +
            `Show all available fields under the "fluency" object in a readable format. Do not add explanations or summaries.\n` +
            `Fluency data: ${JSON.stringify(fluency)}`
          : "Acknowledge their message briefly."
      }` +
      `${sketchResult ? ` The sketch shows: ${JSON.stringify(sketchResult)}.` : ""}\n` +
      `2. Better Expression — Provide a more natural and fluent English version of their message.\n` +
      `3. Feedback — Briefly list what was good and what can be improved.\n` +
      `4. Key Phrases — Highlight 2–3 useful words or expressions.\n` +
      `5. Speaking Tip — Give one short, practical tip for improvement.\n` +
      `Keep your tone encouraging, supportive, and concise.`;

    // Construct messages for GPT-4
    const messages = [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: finalImageUrl
          ? [
              {
                type: "text",
                text:
                  message ||
                  "Can you help me describe this image in English?",
              },
              {
                type: "image_url",
                image_url: { url: finalImageUrl },
              },
            ]
          : message,
      },
    ];

    console.log(
      `Sending chat request to OpenAI with message: "${message}"`,
    );

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: messages,
          max_tokens: finalImageUrl ? 800 : 600,
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.log(
        `OpenAI Chat API error: ${response.status} - ${errorData}`,
      );
      return c.json(
        { error: `Chat request failed: ${errorData}` },
        response.status,
      );
    }

    const result = await response.json();
    const aiMessage =
      result.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response.";

    console.log(`Chat response generated successfully`);

    return c.json({
      message: aiMessage,
      fluency: fluency,
      success: true,
    });
  } catch (error) {
    console.log(`Error during chat request: ${error}`);
    return c.json(
      { error: `Chat error: ${error.message}` },
      500,
    );
  }
});

// Get conversation history for a user
app.get("/make-server-96f01fbd/history/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const historyKey = `conversation_history_${userId}`;

    const history = await kv.get(historyKey);

    return c.json({
      history: history || [],
      success: true,
    });
  } catch (error) {
    console.log(
      `Error retrieving conversation history: ${error}`,
    );
    return c.json(
      { error: `History retrieval error: ${error.message}` },
      500,
    );
  }
});

// Save conversation message
app.post("/make-server-96f01fbd/history/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const historyKey = `conversation_history_${userId}`;
    const body = await c.req.json();

    // Get existing history
    const existingHistory = (await kv.get(historyKey)) || [];

    // Add new message
    const updatedHistory = [
      ...existingHistory,
      {
        ...body,
        timestamp: new Date().toISOString(),
      },
    ];

    // Keep only last 100 messages
    const trimmedHistory = updatedHistory.slice(-100);

    await kv.set(historyKey, trimmedHistory);

    return c.json({
      success: true,
      messageCount: trimmedHistory.length,
    });
  } catch (error) {
    console.log(`Error saving conversation history: ${error}`);
    return c.json(
      { error: `History save error: ${error.message}` },
      500,
    );
  }
});
Deno.serve(app.fetch);