import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./components/ChatMessage";
import { SketchCanvas } from "./components/SketchCanvas";
import { CallmeLogo } from "./components/CallmeLogo";
import { UserSidebar } from "./components/UserSidebar";
import { SettingsDialog } from "./components/SettingsDialog";
import { MicrophonePermissionGuide } from "./components/MicrophonePermissionGuide";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { ScrollArea } from "./components/ui/scroll-area";
import { Textarea } from "./components/ui/textarea";
import { Toaster } from "./components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import {
  Send,
  MessageCircle,
  Image,
  Pencil,
  Mic,
  MicOff,
  FileAudio,
} from "lucide-react";
import { toast } from "sonner";
import {
  transcribeAudio,
  sendChatMessage,
} from "./utils/callmeService";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  image?: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm CALLME, your Native English Coach! 🌟 I'm here to help you speak English naturally and confidently. You can send me text, images, sketches, or voice messages. Let's practice together!",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<
    string | null
  >(null);
  const [isSketchImage, setIsSketchImage] = useState(false);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [showSketchDialog, setShowSketchDialog] =
    useState(false);
  const [showSettingsDialog, setShowSettingsDialog] =
    useState(false);
  const [showPermissionGuide, setShowPermissionGuide] =
    useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [userName, setUserName] = useState("Alex Johnson");
  const [userLevel, setUserLevel] = useState("Intermediate");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setIsSketchImage(false);
        toast.success("Image selected!");
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAudioFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFileName(file.name);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAudioDataUri(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.info("Transcribing audio file...", { duration: 2000 });
      try {
        const text = await transcribeAudio(file);
        setInputValue((v) => (v ? `${v} ${text}` : text));
        toast.success(
          `✅ Transcribed: \"${text.slice(0, 50)}${text.length > 50 ? "…" : ""}\"`,
          { duration: 4000 },
        );
      } catch (err: any) {
        toast.error(`Transcription failed: ${err.message}`);
      }
    }
    if (audioFileInputRef.current) {
      audioFileInputRef.current.value = "";
    }
  };

  const handleSketchSave = (imageData: string) => {
    setSelectedImage(imageData);
    setIsSketchImage(true);
    toast.success("Sketch saved!");
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          toast.error(
            "Your browser doesn't support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.",
          );
          return;
        }
        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0)
            audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          stream.getTracks().forEach((t) => t.stop());
          
          setAudioFileName("recorded-audio.webm");
          
          const reader = new FileReader();
          reader.onloadend = () => {
            setAudioDataUri(reader.result as string);
          };
          reader.readAsDataURL(audioBlob);
          
          toast.info("Transcribing audio...", {
            duration: 2000,
          });
          try {
            const text = await transcribeAudio(audioBlob);
            setInputValue((v) => (v ? `${v} ${text}` : text));
            toast.success(
              `✅ Transcribed: "${text.slice(0, 50)}${text.length > 50 ? "…" : ""}"`,
              { duration: 4000 },
            );
          } catch (err: any) {
            toast.error(`Transcription failed: ${err.message}`);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        toast.success("🎤 Recording started! Speak now...", {
          duration: 2000,
        });
      } catch (err: any) {
        console.error(err);
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setShowPermissionGuide(true);
          toast.error(
            "Microphone access denied. Click to see how to enable it.",
            {
              duration: 6000,
              action: {
                label: "Show Guide",
                onClick: () => setShowPermissionGuide(true),
              },
            },
          );
        } else if (err.name === "NotFoundError") {
          toast.error(
            "No microphone found. Please connect one and try again.",
          );
        } else if (err.name === "NotReadableError") {
          toast.error("Microphone is in use by another app.");
        } else if (err.name === "SecurityError") {
          toast.error(
            "Microphone blocked due to security settings. Use HTTPS or localhost.",
          );
        } else {
          toast.error(`Microphone error: ${err.message}`);
        }
      }
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !selectedImage) {
      toast.error("Please enter a message or select an image!");
      return;
    }
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue || "Sent an image",
      isUser: true,
      timestamp: new Date(),
      image: selectedImage || undefined,
    };
    setMessages((m) => [...m, userMessage]);
    const messageText = inputValue;
    const messageImage = selectedImage;
    const isSketch = isSketchImage;
    const messageAudio = audioDataUri;
    setInputValue("");
    setSelectedImage(null);
    setIsSketchImage(false);
    setAudioDataUri(null);
    setAudioFileName(null);
    setIsTyping(true);
    try {
      const result = await sendChatMessage(
        messageText,
        messageImage || undefined,
        isSketch,
        messageAudio || undefined,
      );
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: result.message,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((m) => [...m, aiMsg]);
      
      if (result.fluency) {
        console.log("Fluency evaluation received:", result.fluency);
      }
    } catch (err: any) {
      const fallback: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now. Please check that your OpenAI API key is configured correctly. In the meantime, keep practicing!",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((m) => [...m, fallback]);
      toast.error(`AI response failed: ${err.message}`);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSettingsSave = (s: {
    userName: string;
    userLevel: string;
  }) => {
    setUserName(s.userName);
    setUserLevel(s.userLevel);
    toast.success("Settings saved!");
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-50 via-emerald-50/40 to-green-50/60 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-emerald-200/20 to-transparent rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-gradient-to-tr from-green-200/20 to-transparent rounded-full blur-3xl"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <UserSidebar
        userName={userName}
        userLevel={userLevel}
        chattingTimes={messages.length}
        onSettingsClick={() => setShowSettingsDialog(true)}
      />

      <div className="flex-1 flex flex-col min-h-screen bg-white/60 backdrop-blur-xl border-l border-emerald-100/50 relative z-10 shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center gap-5 px-8 py-6 border-b border-white/60 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 shadow-xl animate-gradient overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-40 h-40 border-4 border-white rounded-full -translate-x-20 -translate-y-20" />
            <div className="absolute bottom-0 right-0 w-32 h-32 border-4 border-white rounded-full translate-x-16 translate-y-16" />
          </div>
          <div className="relative flex items-center justify-center size-16 rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl p-3 ring-4 ring-white/40 hover:scale-105 transition-transform">
            <CallmeLogo className="size-full" />
          </div>
          <div className="flex-1">
            <h2 className="text-white drop-shadow-lg tracking-tight mb-1">
              CALLME: Your Native English Coach
            </h2>
            <p className="text-sm text-white/90 drop-shadow">
              Practice speaking naturally with AI assistance ✨
            </p>
          </div>
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/25 backdrop-blur-md border-2 border-white/40 shadow-xl">
            <div className="size-3 bg-green-300 rounded-full animate-pulse shadow-lg shadow-green-300/60 ring-2 ring-white/50"></div>
            <span className="text-sm text-white drop-shadow">
              Online
            </span>
          </div>
        </div>

        <div className="flex-1 p-8 bg-gradient-to-b from-white/30 via-emerald-50/20 to-white/40 backdrop-blur-sm overflow-y-auto h-full">
          <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg.text}
                isUser={msg.isUser}
                timestamp={msg.timestamp}
                image={msg.image}
              />
            ))}
            {isTyping && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="size-11 rounded-2xl bg-gradient-to-br from-white to-emerald-50 flex items-center justify-center shadow-xl p-2 ring-4 ring-emerald-100/50 border-2 border-white">
                  <CallmeLogo className="size-full animate-pulse" />
                </div>
                <div className="bg-gradient-to-br from-white to-emerald-50/50 border-2 border-emerald-200/60 rounded-2xl px-6 py-4 shadow-lg backdrop-blur-sm">
                  <div className="flex gap-2">
                    <span
                      className="size-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-bounce shadow-md"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="size-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-bounce shadow-md"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="size-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-bounce shadow-md"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="sticky bottom-0 z-20 p-6 border-t border-white/60 bg-gradient-to-br from-white/95 via-emerald-50/30 to-white/90 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-wrap gap-3 mb-4">
            {selectedImage && (
              <div className="relative inline-block animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="relative group">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="h-28 rounded-3xl border-3 border-emerald-300/60 shadow-2xl ring-4 ring-emerald-100/50 hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-3 -right-3 size-9 p-0 rounded-full shadow-xl hover:scale-110 hover:rotate-90 transition-all ring-4 ring-white"
                  onClick={() => setSelectedImage(null)}
                >
                  ×
                </Button>
              </div>
            )}
            
            {audioFileName && (
              <div className="relative inline-block animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-purple-50 to-purple-100/50 border-3 border-purple-300/60 rounded-3xl shadow-2xl ring-4 ring-purple-100/50 group hover:scale-105 transition-transform">
                  <div className="p-2 bg-purple-200 rounded-2xl">
                    <FileAudio className="size-6 text-purple-700" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-purple-900 max-w-[200px] truncate">
                      {audioFileName}
                    </span>
                    <span className="text-xs text-purple-600">
                      Audio file ready
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-3 -right-3 size-9 p-0 rounded-full shadow-xl hover:scale-110 hover:rotate-90 transition-all ring-4 ring-white"
                  onClick={() => {
                    setAudioDataUri(null);
                    setAudioFileName(null);
                  }}
                >
                  ×
                </Button>
              </div>
            )}
          </div>

          {isRecording && (
            <div className="mb-4 flex items-center gap-4 bg-gradient-to-r from-red-50 via-pink-50 to-red-50 border-2 border-red-300/80 text-red-600 px-6 py-4 rounded-3xl shadow-xl animate-in fade-in slide-in-from-bottom-4 backdrop-blur-sm ring-4 ring-red-100/50">
              <div className="relative">
                <div className="size-4 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/60"></div>
                <div className="absolute inset-0 size-4 bg-red-500 rounded-full animate-ping"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    Recording Audio
                  </span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                    {formatTime(recordingTime)}
                  </span>
                </div>
                <div className="text-xs text-red-500/70 mt-1">
                  Speak clearly into your microphone
                </div>
              </div>
              <div className="px-3 py-1.5 bg-red-500 text-white rounded-full text-xs animate-pulse shadow-md">
                ● REC
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
              onChange={handleAudioFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="default"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping || isRecording}
              className="border-2 border-emerald-300/60 bg-white/80 hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-lg transition-all rounded-2xl group px-5 h-11"
            >
              <div className="p-1.5 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors mr-2">
                <Image className="size-4 text-emerald-700" />
              </div>
              <span className="text-emerald-700">
                Upload Image
              </span>
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowSketchDialog(true)}
              disabled={isTyping || isRecording}
              className="border-2 border-blue-300/60 bg-white/80 hover:bg-blue-50 hover:border-blue-400 hover:shadow-lg transition-all rounded-2xl group px-5 h-11"
            >
              <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors mr-2">
                <Pencil className="size-4 text-blue-700" />
              </div>
              <span className="text-blue-700">Sketch</span>
            </Button>
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="default"
              onClick={handleToggleRecording}
              disabled={isTyping}
              className={
                isRecording
                  ? "shadow-xl hover:shadow-2xl transition-all rounded-2xl px-5 h-11"
                  : "border-2 border-purple-300/60 bg-white/80 hover:bg-purple-50 hover:border-purple-400 hover:shadow-lg transition-all rounded-2xl group px-5 h-11"
              }
              title="Click to record your voice. You may need to grant microphone permission."
            >
              {isRecording ? (
                <>
                  <MicOff className="size-4 mr-2" />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <div className="p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors mr-2">
                    <Mic className="size-4 text-purple-700" />
                  </div>
                  <span className="text-purple-700">
                    Record Audio
                  </span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => audioFileInputRef.current?.click()}
              disabled={isTyping || isRecording}
              className="border-2 border-purple-300/60 bg-white/80 hover:bg-purple-50 hover:border-purple-400 hover:shadow-lg transition-all rounded-2xl group px-5 h-11"
              title="Upload an audio file for transcription and fluency evaluation"
            >
              <div className="p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors mr-2">
                <FileAudio className="size-4 text-purple-700" />
              </div>
              <span className="text-purple-700">
                Upload Audio
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPermissionGuide(true)}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-2xl"
              title="Need help with microphone permissions?"
            >
              <span className="text-xs">Need help?</span>
            </Button>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message, or use voice/image to practice English..."
                className="flex-1 min-h-[80px] max-h-[160px] resize-none border-2 border-emerald-300/60 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200/50 rounded-3xl bg-white/90 shadow-xl hover:shadow-2xl transition-all backdrop-blur-sm px-5 py-4 text-slate-700 placeholder:text-slate-400"
                disabled={isTyping || isRecording}
              />
              {inputValue && (
                <div className="absolute bottom-3 right-3 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs shadow-sm">
                  {inputValue.length} chars
                </div>
              )}
            </div>
            <Button
              onClick={handleSend}
              disabled={
                (!inputValue.trim() && !selectedImage) ||
                isTyping ||
                isRecording
              }
              className="px-8 h-14 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all rounded-3xl group disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed ring-4 ring-emerald-200/50 hover:ring-emerald-300/60"
            >
              <Send className="size-6 text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform drop-shadow-lg" />
            </Button>
          </div>
        </div>
      </div>

      <SketchCanvas
        open={showSketchDialog}
        onClose={() => setShowSketchDialog(false)}
        onSave={handleSketchSave}
      />

      <SettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        userName={userName}
        userLevel={userLevel}
        onSave={handleSettingsSave}
      />

      <Dialog
        open={showPermissionGuide}
        onOpenChange={setShowPermissionGuide}
      >
        <DialogContent className="max-w-3xl border-2 border-amber-300/60 shadow-2xl bg-gradient-to-br from-white to-amber-50/30 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-md">
                <Mic className="size-5 text-white" />
              </div>
              Microphone Permission Required
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              The voice recording feature needs access to your
              microphone. Follow the steps below to enable it.
            </DialogDescription>
          </DialogHeader>
          <MicrophonePermissionGuide />
          <div className="flex justify-end">
            <Button
              onClick={() => setShowPermissionGuide(false)}
              className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all rounded-2xl h-11 px-6"
            >
              Got It
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
