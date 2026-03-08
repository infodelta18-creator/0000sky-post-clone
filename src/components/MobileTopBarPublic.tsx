import { Menu } from "lucide-react";
import AwajLogo from "@/components/AwajLogo";

export default function MobileTopBarPublic() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-center border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm lg:hidden">
      <AwajLogo className="h-8 w-8" />
    </header>
  );
}
