import { useState } from 'react';
import { Ticket, Moon, Sun, Shield } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ADMIN_PASSWORD = '6969';

interface HeaderProps {
  onAdminTabChange: (tab: string) => void;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (value: boolean) => void;
}

export default function Header({ onAdminTabChange, isAdminAuthenticated, setIsAdminAuthenticated }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleAdminButtonClick = () => {
    if (!isAdminAuthenticated) {
      setShowPasswordDialog(true);
    } else {
      setDropdownOpen(true);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setShowPasswordDialog(false);
      setPasswordError(false);
      setPasswordInput('');
      setTimeout(() => setDropdownOpen(true), 100);
    } else {
      setPasswordError(true);
    }
  };

  const handleDialogClose = () => {
    setShowPasswordDialog(false);
    setPasswordInput('');
    setPasswordError(false);
  };

  const handleMenuItemClick = (tab: string) => {
    onAdminTabChange(tab);
    setDropdownOpen(false);
  };

  return (
    <>
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Ticket className="icon-lg" />
              </div>
              <div>
                <h1 className="text-page-title">Operations Ticketing Portal</h1>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center justify-center gap-16 flex-1 px-12">
              <img 
                src="/assets/onespan logo.jpg" 
                alt="OneSpan" 
                className="h-16 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              />
              <img 
                src="/assets/observeailogo.jpg" 
                alt="Observe.ai" 
                className="h-16 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              />
              <img 
                src="/assets/FWlogo.jpg" 
                alt="Freshworks" 
                className="h-16 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleTheme}
                className="interactive-button focus-ring"
              >
                <Sun className="icon-md rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute icon-md rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              {isAdminAuthenticated ? (
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="default" className="interactive-button focus-ring">
                      <Shield className="mr-2 icon-sm" />
                      Admin
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleMenuItemClick('dashboard')} className="cursor-pointer">
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuItemClick('analysis')} className="cursor-pointer">
                      Analysis
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuItemClick('edit-help')} className="cursor-pointer">
                      Edit Help Center
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="outline" 
                  size="default" 
                  onClick={handleAdminButtonClick}
                  className="interactive-button focus-ring"
                >
                  <Shield className="mr-2 icon-sm" />
                  Admin
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <Dialog open={showPasswordDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-section-title">Admin Access Required</DialogTitle>
            <DialogDescription className="text-card-description">
              Enter the password to access admin features
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-6 mt-2">
            <div className="space-y-3">
              <Label htmlFor="admin-password" className="text-label">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="Enter password"
                autoFocus
                className="focus-ring"
              />
              {passwordError && (
                <p className="text-sm text-destructive font-medium">Incorrect password</p>
              )}
            </div>
            <Button type="submit" className="w-full interactive-button">
              Access Admin
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
