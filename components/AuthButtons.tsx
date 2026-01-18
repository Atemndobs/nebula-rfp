import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";

export function AuthButtons() {
  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="px-5 py-2.5 text-sm font-medium text-black bg-white hover:bg-gray-100 rounded-lg transition-all duration-200">
            Get Started
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: {
                width: "2.25rem",
                height: "2.25rem",
              },
            },
          }}
        />
      </SignedIn>
    </div>
  );
}
