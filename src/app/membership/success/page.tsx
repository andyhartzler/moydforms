import Link from 'next/link';
import { CheckCircle, Users, Calendar, MessageCircle, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Welcome to MOYD! | Missouri Young Democrats',
  description: 'Your membership application has been received.',
};

export default function MembershipSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="max-w-lg w-full">
        {/* Main success card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center mb-6">
          {/* Animated checkmark */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-6 animate-bounce-once">
            <CheckCircle className="h-14 w-14 text-green-600" />
          </div>

          <h1
            className="text-3xl font-bold text-gray-900 mb-3 normal-case"
            style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.04em' }}
          >
            Welcome to MOYD! 🎉
          </h1>

          <p className="text-lg text-gray-600 mb-6 normal-case leading-relaxed">
            Your membership application has been received! We&apos;re thrilled to have you join the movement. 
            Check your email for a welcome message with next steps.
          </p>

          {/* What happens next */}
          <div className="bg-blue-50 rounded-xl p-6 text-left mb-6">
            <h3 className="font-semibold text-blue-900 mb-3 text-sm uppercase tracking-wide">
              What Happens Next
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-800">
                  You&apos;ll receive a welcome email with information about getting involved
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-800">
                  We&apos;ll connect you with your local chapter (if one exists in your area)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-800">
                  You&apos;ll be invited to our next statewide meeting and events
                </span>
              </li>
            </ul>
          </div>

          {/* CTA buttons */}
          <div className="space-y-3">
            <a
              href="https://moyoungdemocrats.org"
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold transition-all shadow-md hover:shadow-lg"
            >
              Visit Our Website
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="https://instagram.com/moyoungdems"
              className="flex items-center justify-center gap-2 w-full bg-white border-2 border-gray-200 text-gray-700 px-4 py-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-semibold transition-all"
            >
              Follow Us on Instagram
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-blue-100 text-center">
          Powered by <span className="font-semibold text-white">Missouri Young Democrats</span>
        </p>
      </div>
    </div>
  );
}
