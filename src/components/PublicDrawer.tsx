import { NavLink, useNavigate } from "react-router-dom";
import { Home, Hash, Search } from "lucide-react";
import { MessageCircle } from "lucide-react";
import AwajLogo from "@/components/AwajLogo";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface PublicDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PublicDrawer({ open, onOpenChange }: PublicDrawerProps) {
  const navigate = useNavigate();

  const navItems = [
    { label: "Home", path: "/explore", icon: Home },
    { label: "Feeds", path: "/feeds", icon: Hash },
    { label: "Explore", path: "/search", icon: Search },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
        {/* Logo + Join */}
        <div className="px-5 pt-5 pb-4">
          <AwajLogo className="h-10 w-10 mb-3" />
          <h2 className="text-2xl font-extrabold text-foreground leading-tight">
            Join the<br />conversation
          </h2>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => { onOpenChange(false); navigate("/auth?view=signup"); }}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Create account
            </button>
            <button
              onClick={() => { onOpenChange(false); navigate("/auth?view=signin"); }}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-2 px-3">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={label}
              to={path}
              onClick={() => onOpenChange(false)}
              className={({ isActive }) =>
                `flex items-center gap-4 rounded-lg px-3 py-3 text-lg font-bold transition-colors ${isActive ? "text-foreground bg-accent" : "text-foreground hover:bg-accent"}`
              }
            >
              <Icon className="h-6 w-6" strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border" />

        {/* Footer links */}
        <div className="px-5 py-3">
          <div className="flex gap-3 text-xs mb-3">
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </div>
          <div className="flex gap-1.5">
            <button className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-foreground hover:bg-accent">
              <MessageCircle className="h-3 w-3" /> Feedback
            </button>
            <button className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground hover:bg-accent">
              Help
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
