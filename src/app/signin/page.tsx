'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Lock, Chrome } from 'lucide-react';
import Navbar from '@/components/NavBar';
import { auth, googleProvider } from '@/config/firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Add auth state monitoring
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is signed in, redirect to home page
        router.push('/');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  // Update handleGoogleSignIn to use navigate instead of window.location
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch (error) {
      console.error('Error signing in with Google:', error);
      alert('Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update handleEmailSignIn to include navigation and error handling
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (error: any) {
      console.error('Error signing in with email/password:', error);
      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        alert('No user found with this email');
      } else if (error.code === 'auth/wrong-password') {
        alert('Invalid password');
      } else if (error.code === 'auth/invalid-email') {     
        alert('Invalid email format');
      } else {
        alert(error.message || 'Failed to sign in');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-md mx-auto p-4 pt-16">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-gray-400">Sign in to access your account</p>
            </div>

            {/* Google Sign In Button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              variant="outline"
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Chrome className="mr-2" size={20} />
              <span>Continue with Google</span>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Mail size={18} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-gray-300">
                    Remember me
                  </label>
                </div>
                <Link href="/forgot-password" className="text-sm text-blue-500 hover:text-blue-400">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="text-center text-gray-400">
              <span>Don't have an account? </span>
              <Link href="/signup" className="text-blue-500 hover:text-blue-400">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignIn;