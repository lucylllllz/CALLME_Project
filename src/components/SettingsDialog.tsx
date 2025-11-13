import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { User, Target, Bell, Globe, Palette } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userLevel: string;
  onSave?: (settings: { userName: string; userLevel: string }) => void;
}

export function SettingsDialog({ 
  open, 
  onClose, 
  userName: initialName,
  userLevel: initialLevel,
  onSave 
}: SettingsDialogProps) {
  const [userName, setUserName] = useState(initialName);
  const [userLevel, setUserLevel] = useState(initialLevel);
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  const handleSave = () => {
    onSave?.({ userName, userLevel });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-2 border-emerald-300/60 shadow-2xl bg-gradient-to-br from-white to-emerald-50/30 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-md">
              <User className="size-5 text-white" />
            </div>
            Settings & Preferences
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Settings */}
          <div className="space-y-4 bg-white/80 p-5 rounded-3xl border-2 border-emerald-200/60 shadow-lg">
            <h3 className="flex items-center gap-2 text-slate-700">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <User className="size-4 text-emerald-700" />
              </div>
              Profile Information
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="userName" className="text-sm text-slate-700">Display Name</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="border-2 border-emerald-300/60 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200/50 rounded-2xl h-11 bg-white shadow-sm"
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userLevel" className="text-sm text-slate-700">English Level</Label>
              <Select value={userLevel} onValueChange={setUserLevel}>
                <SelectTrigger className="border-2 border-emerald-300/60 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200/50 rounded-2xl h-11 bg-white shadow-sm">
                  <SelectValue placeholder="Select your level" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-emerald-200">
                  <SelectItem value="Beginner" className="rounded-xl">🌱 Beginner</SelectItem>
                  <SelectItem value="Intermediate" className="rounded-xl">🌿 Intermediate</SelectItem>
                  <SelectItem value="Advanced" className="rounded-xl">🌳 Advanced</SelectItem>
                  <SelectItem value="Native" className="rounded-xl">✨ Native</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-emerald-200/60" />

          {/* Learning Preferences */}
          <div className="space-y-4 bg-white/80 p-5 rounded-3xl border-2 border-blue-200/60 shadow-lg">
            <h3 className="flex items-center gap-2 text-slate-700">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Target className="size-4 text-blue-700" />
              </div>
              Learning Preferences
            </h3>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-white to-blue-50/30 rounded-2xl border border-blue-200/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Bell className="size-4 text-blue-700" />
                </div>
                <Label htmlFor="notifications" className="text-sm text-slate-700 cursor-pointer">
                  Daily Reminders
                </Label>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-white to-purple-50/30 rounded-2xl border border-purple-200/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <Palette className="size-4 text-purple-700" />
                </div>
                <Label htmlFor="soundEffects" className="text-sm text-slate-700 cursor-pointer">
                  Sound Effects
                </Label>
              </div>
              <Switch
                id="soundEffects"
                checked={soundEffects}
                onCheckedChange={setSoundEffects}
              />
            </div>
          </div>

          <Separator className="bg-emerald-200/60" />

          {/* App Info */}
          <div className="space-y-3 bg-gradient-to-br from-emerald-50 to-green-50 p-5 rounded-3xl border-2 border-emerald-200/60 shadow-lg">
            <div className="flex items-center gap-2 text-sm text-emerald-800">
              <div className="p-1.5 bg-emerald-200 rounded-lg">
                <Globe className="size-4 text-emerald-700" />
              </div>
              <span>App Version: 1.0.0</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              CALLME helps you practice English naturally through AI-powered conversations. 
              Learn at your own pace with personalized feedback! 🚀
            </p>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-2 border-slate-300/60 hover:bg-slate-50 hover:border-slate-400 rounded-2xl shadow-md hover:shadow-lg transition-all h-11 px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 rounded-2xl h-11 px-6"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
