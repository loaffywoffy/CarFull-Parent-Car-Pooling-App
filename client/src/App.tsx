import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import OrganizerHomePage from "@/pages/organizer-home";
import EventPage from "@/pages/event-page";
import JoinCarpoolPage from "@/pages/join-carpool";
import CreateCarpoolPage from "@/pages/create-carpool";

function Router() {
  return (
    <Switch>
      <Route path="/" component={OrganizerHomePage} />
      <Route path="/events/:shareableUrl" component={EventPage} />
      <Route path="/events/:shareableUrl/create-carpool" component={CreateCarpoolPage} />
      <Route path="/create-carpool" component={CreateCarpoolPage} />
      <Route path="/join-carpool" component={JoinCarpoolPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
