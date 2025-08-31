import { Link } from 'wouter';

export function Footer() {
  return (
    <footer className="w-full py-4 px-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex items-center justify-between text-sm text-muted-foreground">
        <div>
          © {new Date().getFullYear()} Smart File Manager. All rights reserved.
        </div>
        <nav className="space-x-4">
          <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
