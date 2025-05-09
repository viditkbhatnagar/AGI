import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Bell, User } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { getInitials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, student, logout } = useAuth();
  
  return (
    <header className="bg-white shadow-sm z-10 sticky top-0">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMobileMenuToggle}>
          <Menu className="h-6 w-6" />
        </Button>
        
        <div className="md:hidden flex-1 text-center">
          <h1 className="font-inter font-bold text-xl text-primary">AGI.online</h1>
        </div>
        
        {/* Search */}
        <div className="hidden md:flex items-center flex-1 ml-4">
          <div className="relative w-64">
            <Input
              type="text"
              placeholder="Search..."
              className="pl-8"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
        
        {/* User menu */}
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900">
            <Bell className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-4 relative flex items-center gap-2 hover:bg-gray-100">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                  {user?.username ? getInitials(user.username) : "U"}
                </div>
                <span className="hidden md:block text-sm font-medium">{student?.name || user?.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default Header;
