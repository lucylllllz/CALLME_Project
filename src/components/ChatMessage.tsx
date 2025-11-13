import { Avatar, AvatarFallback } from "./ui/avatar";
import { User, Check, CheckCheck } from "lucide-react";
import { CallmeLogo } from "./CallmeLogo";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  image?: string;
}

export function ChatMessage({ message, isUser, timestamp, image }: ChatMessageProps) {
  return (
    <div className={`flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className={`size-12 shadow-xl ring-4 transition-all duration-300 ${isUser ? 'ring-emerald-100 hover:ring-emerald-200' : 'ring-white/80 hover:ring-emerald-100'}`}>
        <AvatarFallback className={isUser 
          ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 text-white shadow-lg' 
          : 'bg-gradient-to-br from-white to-emerald-50 p-2 border-2 border-emerald-200/50'
        }>
          {isUser ? <User className="size-6" /> : <CallmeLogo className="size-full" />}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col gap-2 max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`group relative rounded-3xl px-6 py-4 shadow-xl transition-all duration-300 hover:shadow-2xl ${
          isUser 
            ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 text-white hover:scale-[1.02]' 
            : 'bg-gradient-to-br from-white to-emerald-50/50 border-2 border-emerald-200/60 text-slate-700 hover:border-emerald-300 hover:scale-[1.02] backdrop-blur-sm'
        }`}>
          {/* Decorative corner accent for user messages */}
          {isUser && (
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10" />
          )}
          
          {image && (
            <div className="mb-4 relative group/image">
              <img 
                src={image} 
                alt="Uploaded content" 
                className="rounded-2xl max-w-full h-auto max-h-72 object-contain shadow-lg border-2 border-white/30 hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl opacity-0 group-hover/image:opacity-100 transition-opacity" />
            </div>
          )}
          <p className="whitespace-pre-wrap break-words leading-relaxed relative z-10">{message}</p>
          
          {/* Message status indicator for user messages */}
          {isUser && (
            <div className="flex items-center justify-end gap-1 mt-2">
              <CheckCheck className="size-4 text-white/80" />
            </div>
          )}
        </div>
        
        <div className={`flex items-center gap-2 px-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-slate-500">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && (
            <span className="text-xs text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-200">
              AI Coach
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
