import { ChatInterface } from "./components/ChatInterface";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { Login } from "./components/Login";
import { ErrorBoundary } from "./components/ErrorBoundary";

const AppContent: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return <ChatInterface />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="h-screen w-full">
          <AppContent />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
