'use client';

import Link from 'next/link';
import { ArrowRight, Search, DollarSign, Building2, Shield, Star, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/NavBar';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Hero Section with Gradient */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight">
              Find the Best Healthcare
              <span className="block bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                at the Right Price
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-300">
              Compare healthcare costs across providers, make informed decisions, and save money on your medical procedures.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/searchform" className="flex items-center gap-2">
                  Start Comparing <Search size={20} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/signin">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-500">500+</p>
              <p className="mt-2 text-lg text-gray-300">Healthcare Providers</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-500">50K+</p>
              <p className="mt-2 text-lg text-gray-300">Procedures Listed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-500">30%</p>
              <p className="mt-2 text-lg text-gray-300">Average Savings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">Why Choose Us?</h2>
            <p className="mt-4 text-xl text-gray-400">Compare healthcare costs and make informed decisions</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="relative group">
                <div className="bg-gray-800 rounded-xl p-8 hover:bg-gray-700/70 transition-all duration-300 hover:shadow-2xl">
                  <div className="text-blue-500 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">How It Works</h2>
            <p className="mt-4 text-xl text-gray-400">Simple steps to find the best healthcare options</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-gray-800 rounded-xl p-8 hover:bg-gray-700/70 transition-all">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-6">
                    <span className="text-xl font-bold text-white">{index + 1}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to find affordable healthcare?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of people who are saving money on their healthcare costs
          </p>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link href="/searchform" className="flex items-center gap-2">
              Get Started <ArrowRight size={20} />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    icon: <DollarSign size={32} />,
    title: "Cost Transparency",
    description: "Compare procedure costs across different healthcare providers to make informed decisions."
  },
  {
    icon: <Building2 size={32} />,
    title: "Extensive Network",
    description: "Access a wide network of verified healthcare providers and facilities."
  },
  {
    icon: <Shield size={32} />,
    title: "Insurance Coverage",
    description: "See which insurance plans are accepted by different healthcare providers."
  },
  {
    icon: <Star size={32} />,
    title: "Quality Ratings",
    description: "View provider ratings and reviews from verified patients."
  },
  {
    icon: <CheckCircle2 size={32} />,
    title: "Verified Information",
    description: "All healthcare costs and provider information is regularly verified."
  },
  {
    icon: <TrendingUp size={32} />,
    title: "Price Trends",
    description: "Track healthcare cost trends and find the best time to schedule."
  }
];

const steps = [
  {
    title: "Search Procedure",
    description: "Enter the medical procedure you're looking for and your insurance plan."
  },
  {
    title: "Compare Costs",
    description: "View and compare costs from different healthcare providers in your area."
  },
  {
    title: "Make Your Choice",
    description: "Choose the best provider based on cost, location, and quality ratings."
  }
];
