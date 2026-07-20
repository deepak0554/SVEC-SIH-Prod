import React, { useState, useEffect } from "react";
import { LiveUpdate } from "../types";
import { 
  Plus, Trash2, Bell, AlertCircle, CheckCircle, Save, Megaphone, Clock, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LiveUpdatesCustomizerProps {
  passcode: string;
}

export default function LiveUpdatesCustomizer({ passcode }: LiveUpdatesCustomizerProps) {
  const [updatesList, setUpdatesList] = useState<LiveUpdate[]>([]);
  const [newUpdateText, setNewUpdateText] = useState("");
  const [newUpdateIsImportant, setNewUpdateIsImportant] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/updates");
      if (res.ok) {
        const data = await res.json();
        setUpdatesList(data);
      } else {
        setError("Failed to fetch live updates from server.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error fetching live updates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const saveUpdates = async (newList: LiveUpdate[]) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode
        },
        body: JSON.stringify(newList)
      });

      if (res.ok) {
        const data = await res.json();
        setUpdatesList(data.updates);
        setSuccess("Live updates successfully updated!");
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to save live updates.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error saving live updates.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim()) return;

    const newUpdate: LiveUpdate = {
      id: Date.now().toString(),
      text: newUpdateText.trim(),
      createdAt: new Date().toISOString(),
      isImportant: newUpdateIsImportant
    };

    const updatedList = [newUpdate, ...updatesList];
    setUpdatesList(updatedList);
    setNewUpdateText("");
    setNewUpdateIsImportant(false);
    
    saveUpdates(updatedList);
  };

  const handleDeleteUpdate = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement/update?")) {
      return;
    }
    const updatedList = updatesList.filter(u => u.id !== id);
    setUpdatesList(updatedList);
    saveUpdates(updatedList);
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="flex-1">{error}</span>
          </motion.div>
        )}
        
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm font-semibold"
          >
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="flex-1">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ADD NEW UPDATE FORM */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-100 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold font-display text-slate-800">Post New Announcement</h3>
          </div>

          <form onSubmit={handleAddUpdate} className="space-y-4">
            <div>
              <label htmlFor="update-text" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Announcement Message
              </label>
              <textarea
                id="update-text"
                rows={4}
                required
                value={newUpdateText}
                onChange={(e) => setNewUpdateText(e.target.value)}
                placeholder="Type your important notification, registration alert, schedule update or result here..."
                className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-400 transition-all bg-white"
              />
            </div>

            <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-100">
              <input
                type="checkbox"
                id="important-check"
                checked={newUpdateIsImportant}
                onChange={(e) => setNewUpdateIsImportant(e.target.checked)}
                className="h-4 w-4 rounded-sm border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <label htmlFor="important-check" className="text-sm font-bold text-slate-700 select-none cursor-pointer flex items-center gap-1.5">
                Mark as Important / Urgent
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                  Urgent Badge
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving || !newUpdateText.trim()}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              {saving ? "Publishing Announcement..." : "Publish Announcement"}
            </button>
          </form>
        </div>

        {/* LIST OF ACTIVE UPDATES */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold font-display text-slate-800">Active Live Updates ({updatesList.length})</h3>
            </div>
            <button
              onClick={() => fetchUpdates()}
              disabled={loading}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              Refresh List
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm font-semibold">
              <div className="animate-pulse flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                Loading live announcements...
              </div>
            </div>
          ) : updatesList.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-450 p-6">
              <Info className="w-8 h-8 mx-auto text-slate-350 mb-3" />
              <p className="font-bold font-display text-slate-700 text-base mb-1">No Active Updates</p>
              <p className="text-xs max-w-sm mx-auto">
                No scrolling updates have been posted yet. Create one on the left to show it on the homepage ticker.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {updatesList.map((update) => {
                const isImp = update.isImportant;
                const formattedDate = new Date(update.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div
                    key={update.id}
                    className={`p-4 rounded-xl border flex gap-4 items-start transition-all ${
                      isImp 
                        ? "bg-red-50/50 border-red-100" 
                        : "bg-white border-slate-200/80"
                    }`}
                  >
                    <div className="flex-1 min-w-0 text-left space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-450 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formattedDate}
                        </span>
                        {isImp && (
                          <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700 animate-pulse">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-700 leading-relaxed break-words">
                        {update.text}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteUpdate(update.id)}
                      title="Delete announcement"
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer shrink-0 transition-colors"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
