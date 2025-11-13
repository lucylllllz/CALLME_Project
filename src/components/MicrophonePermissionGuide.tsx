import { AlertCircle, Mic, CheckCircle, Chrome, Globe } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Card } from "./ui/card";

export function MicrophonePermissionGuide() {
  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200/60 shadow-xl">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-100 rounded-2xl">
          <AlertCircle className="size-6 text-amber-700" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg text-amber-900 mb-2 flex items-center gap-2">
              <Mic className="size-5" />
              How to Enable Microphone Access
            </h3>
            <p className="text-sm text-amber-800">
              To use the voice recording feature, you need to allow microphone access in your browser.
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-white/80 p-4 rounded-2xl border border-amber-200/60">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg mt-0.5">
                  <Chrome className="size-4 text-blue-700" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm text-slate-800 mb-2">For Chrome/Edge:</h4>
                  <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                    <li>Click the lock icon (🔒) or camera/mic icon in the address bar</li>
                    <li>Find "Microphone" in the permissions list</li>
                    <li>Select "Allow" from the dropdown</li>
                    <li>Refresh the page and try recording again</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-white/80 p-4 rounded-2xl border border-amber-200/60">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg mt-0.5">
                  <Globe className="size-4 text-orange-700" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm text-slate-800 mb-2">For Firefox:</h4>
                  <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                    <li>Click the permissions icon in the address bar</li>
                    <li>Click the "X" next to "Blocked Temporarily - Use the Microphone"</li>
                    <li>Click "Allow" when the permission prompt appears</li>
                    <li>Try recording again</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-white/80 p-4 rounded-2xl border border-amber-200/60">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg mt-0.5">
                  <Globe className="size-4 text-purple-700" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm text-slate-800 mb-2">For Safari:</h4>
                  <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                    <li>Go to Safari → Settings → Websites → Microphone</li>
                    <li>Find this website in the list</li>
                    <li>Change the setting to "Allow"</li>
                    <li>Refresh and try recording again</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
              <CheckCircle className="size-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">
                <strong>Tip:</strong> Once you allow microphone access, the browser will remember your choice for this website.
                You won't need to grant permission again unless you clear your browser data.
              </p>
            </div>
            
            <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-200">
              <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Microphone access requires a secure connection (HTTPS) or localhost. 
                If you're on HTTP, the feature won't work.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
