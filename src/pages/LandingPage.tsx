import { useNavigate } from "react-router-dom";
import AwajLogo from "@/components/AwajLogo";
import { X } from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Sky background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, hsl(200 80% 88%) 0%, hsl(200 70% 92%) 40%, hsl(0 0% 100% / 0.6) 100%)",
        }}
      >
        {/* Cloud-like shapes */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{
          background: "radial-gradient(ellipse 120% 80% at 20% 100%, white 0%, transparent 60%), radial-gradient(ellipse 100% 70% at 80% 100%, white 0%, transparent 55%), radial-gradient(ellipse 140% 60% at 50% 110%, white 0%, transparent 50%)",
        }} />
      </div>

      {/* Modal card */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl bg-card/95 backdrop-blur-md px-8 py-10 shadow-2xl">
        {/* Close button */}
        <button
          onClick={() => navigate("/explore")}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-10">
          <AwajLogo className="h-12 w-12 mb-2" />
          <span className="text-xl font-bold text-foreground tracking-tight">Awaj</span>
        </div>

        {/* Tagline */}
        <div className="text-center mb-10">
          <h1 className="text-[1.7rem] leading-tight font-extrabold text-foreground">
            Real people.<br />
            Real conversations.<br />
            <span className="text-foreground/70">Social media you</span><br />
            <span className="text-muted-foreground/60">control.</span>
          </h1>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate("/auth?view=signup")}
            className="w-full max-w-[280px] rounded-full bg-primary py-3 px-6 text-base font-semibold text-primary-foreground shadow-md hover:opacity-90 transition-opacity"
          >
            Create account
          </button>

          <button
            onClick={() => navigate("/explore")}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Explore the app
          </button>

          <p className="mt-2 text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/auth?view=signin")}
              className="font-semibold text-primary hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
