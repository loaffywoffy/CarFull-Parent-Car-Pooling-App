import { useEffect } from "react";
import { useLocation } from "wouter";
import LoginForm from "@/components/login-form";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // If user is logged in, redirect to home
  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-100 min-h-screen">
      <div className="container mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-10 mt-10 max-w-5xl mx-auto">
          {/* Form Column */}
          <div className="flex items-center">
            <div className="w-full">
              <LoginForm onSuccess={() => setLocation("/")} />
            </div>
          </div>

          {/* Hero Section */}
          <div className="p-6 flex flex-col justify-center">
            <Card className="border-none shadow-lg bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-primary">Welcome to KidPool</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg">
                  The simplest way to coordinate carpools for kids' events.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <div className="rounded-full bg-primary/20 p-1 mt-0.5">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p>Create or join event groups with a simple code</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="rounded-full bg-primary/20 p-1 mt-0.5">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p>Offer rides or request spots in available carpools</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="rounded-full bg-primary/20 p-1 mt-0.5">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p>Manage pickup and dropoff times with our calendar tools</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}