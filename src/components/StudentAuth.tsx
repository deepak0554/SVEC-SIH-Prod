import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle2, GraduationCap, Phone, User, BookOpen } from "lucide-react";

interface StudentAuthProps {
  onAuthSuccess: (student: { id: string; email: string; gender?: string; department?: string; mobile?: string; token?: string }) => void;
}

export default function StudentAuth({ onAuthSuccess }: StudentAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [department, setDepartment] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!isLogin) {
      if (!gender) {
        setError("Please select your gender.");
        return;
      }
      if (!department) {
        setError("Please select your department.");
        return;
      }
      if (!mobile.trim()) {
        setError("Mobile number is required.");
        return;
      }
      if (!/^[0-9]{10}$/.test(mobile.trim())) {
        setError("Please enter a valid 10-digit mobile number.");
        return;
      }
    }

    setIsLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin
      ? { email, password }
      : { email, password, gender, department, mobile: mobile.trim() };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        const studentData = { ...data.student, token: data.token };
        if (!isLogin) {
          setSuccess("Account created successfully! Logging you in...");
          setTimeout(() => {
            onAuthSuccess(studentData);
          }, 1500);
        } else {
          onAuthSuccess(studentData);
        }
      } else {
        setError(data.error || "Authentication failed. Please try again.");
      }
    } catch (err) {
      setError("A network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm"
        id="student-auth-card"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 border border-indigo-100">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            {isLogin ? "Student Login" : "Create Student Account"}
          </h2>
          <p className="text-slate-500 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
            {isLogin 
              ? "Sign in to your SVEC student account to register your team for the SIH Internal Hackathon"
              : "Register your student email and create a password before initiating team registration"
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs flex gap-2.5 mb-6 font-medium">
            <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs flex gap-2.5 mb-6 font-medium">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              Student Email ID
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                id="auth-email-input"
                type="email"
                placeholder="e.g., student@svec.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-800 text-sm outline-hidden transition-all placeholder:text-slate-400 font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              {isLogin ? "Password" : "Create Password"}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                id="auth-password-input"
                type="password"
                placeholder={isLogin ? "Enter password" : "Min 6 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-800 text-sm outline-hidden transition-all placeholder:text-slate-400 font-medium"
                required
              />
            </div>
            {isLogin && (
              <p className="text-[11px] text-slate-500 mt-1.5 pl-1 leading-normal" id="password-reset-help-text">
                Forgot password? Please contact your college <span className="font-semibold text-slate-700">SPOC</span> or <span className="font-semibold text-slate-700">Student Coordinator</span> to reset it.
              </p>
            )}
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
                  Gender
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <select
                    id="auth-gender-select"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-800 text-sm outline-hidden transition-all appearance-none font-medium cursor-pointer"
                    required
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
                  Department
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <select
                    id="auth-dept-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-800 text-sm outline-hidden transition-all appearance-none font-medium cursor-pointer"
                    required
                  >
                    <option value="" disabled>Select Department</option>
                    <option value="Computer Science & Engineering (CSE)">Computer Science & Engineering (CSE)</option>
                    <option value="Information Technology (IT)">Information Technology (IT)</option>
                    <option value="Electronics & Communication Engineering (ECE)">Electronics & Communication Engineering (ECE)</option>
                    <option value="Electrical & Electronics Engineering (EEE)">Electrical & Electronics Engineering (EEE)</option>
                    <option value="Mechanical Engineering (MECH)">Mechanical Engineering (MECH)</option>
                    <option value="Civil Engineering (CIVIL)">Civil Engineering (CIVIL)</option>
                    <option value="Artificial Intelligence & Machine Learning (AIML)">Artificial Intelligence & Machine Learning (AIML)</option>
                    <option value="Data Science (DS)">Data Science (DS)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    id="auth-mobile-input"
                    type="tel"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-800 text-sm outline-hidden transition-all placeholder:text-slate-400 font-medium"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button
            id="auth-submit-button"
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3.5 px-4 rounded-2xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer glow-btn mt-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account & Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button
            id="auth-toggle-button"
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
          >
            {isLogin 
              ? "New here? Create a student account" 
              : "Already have an account? Sign in here"
            }
          </button>
        </div>
      </motion.div>
    </div>
  );
}
