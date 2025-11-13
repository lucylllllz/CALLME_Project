import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { 
  User, 
  MessageSquare, 
  Calendar, 
  BarChart3, 
  Settings, 
  Clock,
  TrendingUp,
  Target,
  Award,
  ChevronRight,
  Zap,
  Trophy,
  Star
} from "lucide-react";

interface UserSidebarProps {
  userName?: string;
  userLevel?: string;
  chattingTimes?: number;
  onSettingsClick?: () => void;
}

export function UserSidebar({ 
  userName = "Guest User",
  userLevel = "Beginner",
  chattingTimes = 0,
  onSettingsClick 
}: UserSidebarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todayChats, setTodayChats] = useState(chattingTimes);
  const [weeklyGoal] = useState(50);
  const weeklyProgress = Math.min((todayChats / weeklyGoal) * 100, 100);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setTodayChats(chattingTimes);
  }, [chattingTimes]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getLevelInfo = (level: string) => {
    switch(level.toLowerCase()) {
      case 'beginner': 
        return { 
          color: 'from-emerald-400 to-green-500',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          icon: '🌱'
        };
      case 'intermediate': 
        return { 
          color: 'from-blue-400 to-cyan-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          icon: '🌿'
        };
      case 'advanced': 
        return { 
          color: 'from-purple-400 to-pink-500',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200',
          icon: '🌳'
        };
      default: 
        return { 
          color: 'from-emerald-400 to-green-500',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          icon: '🌱'
        };
    }
  };

  const levelInfo = getLevelInfo(userLevel);

  const recentActivities = [
    { 
      date: 'Today 2:30 PM', 
      activity: 'Completed lesson on greetings', 
      icon: Award,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    { 
      date: 'Today 1:15 PM', 
      activity: 'Practiced pronunciation', 
      icon: MessageSquare,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    { 
      date: 'Yesterday', 
      activity: 'Achieved 10-day streak', 
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
  ];

  return (
    <div className="w-80 min-h-screen sticky top-0 h-screen bg-gradient-to-b from-white via-emerald-50/30 to-green-50/50 border-r border-emerald-100 flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-200/30 to-transparent rounded-full blur-3xl -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-green-200/30 to-transparent rounded-full blur-3xl translate-y-32 -translate-x-32" />
      
      <div className="relative z-10 flex flex-col h-full">
        {/* User Profile Section */}
        <div className="p-6 bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 relative overflow-hidden animate-gradient">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 border-4 border-white rounded-full -translate-x-16 -translate-y-16" />
            <div className="absolute bottom-0 right-0 w-40 h-40 border-4 border-white rounded-full translate-x-20 translate-y-20" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <Avatar className="size-16 border-4 border-white/40 shadow-2xl ring-4 ring-white/20 hover-lift">
                  <AvatarFallback className="bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm text-white text-xl">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 size-6 bg-green-400 border-4 border-emerald-500 rounded-full animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-white drop-shadow-lg mb-2">{userName}</h3>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${levelInfo.bgColor} ${levelInfo.borderColor} border-2 shadow-lg backdrop-blur-sm`}>
                  <span className="text-lg">{levelInfo.icon}</span>
                  <span className={`text-sm ${levelInfo.textColor}`}>{userLevel}</span>
                </div>
              </div>
            </div>
            
            {/* Date & Time Card */}
            <div className="space-y-2 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/30 shadow-xl">
              <div className="flex items-center gap-2.5 text-sm text-white/90">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Calendar className="size-4" />
                </div>
                <span className="drop-shadow">{formatDate(currentDate)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/90">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Clock className="size-4" />
                </div>
                <span className="drop-shadow">{formatTime(currentDate)}</span>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Stats Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm text-slate-700 flex items-center gap-2">
                  <BarChart3 className="size-4" />
                  Your Progress
                </h4>
                <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-md">
                  Level {Math.floor(chattingTimes / 10)}
                </Badge>
              </div>
              
              {/* Total Conversations Card */}
              <Card className="p-5 bg-gradient-to-br from-white to-emerald-50/50 border-2 border-emerald-200/50 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover-glow group cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-600">Total Conversations</span>
                  <div className="p-2 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
                    <MessageSquare className="size-4 text-emerald-700" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{chattingTimes}</span>
                  <span className="text-sm text-slate-500">chats</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                  <TrendingUp className="size-3" />
                  <span>+{Math.floor(chattingTimes * 0.15)} this week</span>
                </div>
              </Card>

              {/* Weekly Progress Card */}
              <Card className="p-5 bg-gradient-to-br from-white to-blue-50/50 border-2 border-blue-200/50 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-600">Weekly Goal</span>
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <Target className="size-3" />
                    <span>{todayChats}/{weeklyGoal}</span>
                  </div>
                </div>
                <Progress 
                  value={weeklyProgress} 
                  className="h-3 bg-blue-100 shadow-inner" 
                />
                <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                  <Zap className="size-3 text-amber-500" />
                  {weeklyProgress >= 80 ? "Amazing progress! 🎉" : "Keep going! You're doing great! 💪"}
                </p>
              </Card>

              {/* Streak Card */}
              <Card className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200/50 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl shadow-md">
                      <Trophy className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Current Streak</p>
                      <p className="text-2xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">10 days 🔥</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Separator className="bg-emerald-200" />

            {/* Recent Activity */}
            <div className="space-y-3">
              <h4 className="text-sm text-slate-700 flex items-center gap-2">
                <Clock className="size-4" />
                Recent Activity
              </h4>
              
              <div className="space-y-2">
                {recentActivities.map((activity, index) => (
                  <Card 
                    key={index}
                    className="p-4 bg-white/80 backdrop-blur-sm border border-slate-200/60 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`size-10 rounded-xl ${activity.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm`}>
                        <activity.icon className={`size-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 line-clamp-2">{activity.activity}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="size-3" />
                          {activity.date}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-slate-400 flex-shrink-0 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Separator className="bg-emerald-200" />

            {/* Learning Goals */}
            <div className="space-y-3">
              <h4 className="text-sm text-slate-700 flex items-center gap-2">
                <Star className="size-4" />
                Today's Goals
              </h4>
              
              <Card className="p-4 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200/60 shadow-md">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-white/70 rounded-lg">
                    <span className="text-sm text-slate-700">Daily Practice</span>
                    <Badge className="bg-emerald-600 text-white border-0 shadow-sm">5/5 ✓</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/70 rounded-lg">
                    <span className="text-sm text-slate-700">Weekly Goal</span>
                    <Badge className="bg-blue-500 text-white border-0 shadow-sm">{todayChats}/{weeklyGoal}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/70 rounded-lg">
                    <span className="text-sm text-slate-700">Speaking Time</span>
                    <Badge className="bg-purple-500 text-white border-0 shadow-sm">15 min</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </ScrollArea>

        {/* Settings Button */}
        <div className="p-4 border-t border-emerald-200/60 bg-gradient-to-r from-white/80 to-emerald-50/50 backdrop-blur-sm">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-2 border-emerald-300/60 hover:border-emerald-400 bg-white/80 hover:bg-emerald-50 hover:shadow-lg transition-all rounded-xl group h-12"
            onClick={onSettingsClick}
          >
            <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
              <Settings className="size-4 text-emerald-700 group-hover:rotate-90 transition-transform duration-300" />
            </div>
            <span className="text-slate-700 group-hover:text-emerald-700 transition-colors">Settings & Preferences</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
