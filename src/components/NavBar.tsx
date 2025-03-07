'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, User, LogOut} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();
  
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setIsAuthenticated(!!user);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/signin');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const toggleMenu = () => {
      setIsMenuOpen(!isMenuOpen);
    };
  
    return (
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and primary nav */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="text-white text-xl font-bold">
                  HealthSearch
                </Link>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:block">
                <div className="ml-10 flex items-center space-x-4">
                  <Link href="/" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                    Home
                  </Link>
                  <Link href="/searchform" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                    Find Price
                  </Link>
                  <Link href="/chat" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                    AI Chat
                  </Link>
                </div>
              </div>
            </div>
  
            {/* Right side buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <Button 
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </Button>
              ) : (
                <Button 
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => router.push('/signin')}
                >
                  <User size={16} />
                  <span>Sign In</span>
                </Button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-gray-300 hover:text-white"
                onClick={toggleMenu}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
            </div>
          </div>
        </div>
  
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                Home
              </Link>
              <Link href="/searchform" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                Find Price
              </Link>
              <Link href="/chat" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                AI Chat
              </Link>
            </div>
            <div className="px-4 py-3 border-t border-gray-700">
              <div className="flex items-center justify-center">
                {isAuthenticated ? (
                  <Button 
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </Button>
                ) : (
                  <Button 
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                    onClick={() => router.push('/signin')}
                  >
                    <User size={16} />
                    <span>Sign In</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    );
  };
  
  export default Navbar;