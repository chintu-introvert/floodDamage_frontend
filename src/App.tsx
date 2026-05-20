import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Static Layout import
import Layout from './components/Layout';

// Lazy Loaded Pages
const Home = React.lazy(() => import('./pages/Home'));
const NewAssessment = React.lazy(() => import('./pages/NewAssessment'));
const AllAssessments = React.lazy(() => import('./pages/AllAssessments'));
const AssessmentDetail = React.lazy(() => import('./pages/AssessmentDetail'));
const Sync = React.lazy(() => import('./pages/Sync'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));

// Premium dynamic page loading indicator
const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-orange-100 animate-pulse"></div>
      <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
    </div>
    <p className="mt-4 text-sm font-semibold text-gray-500 tracking-wide animate-pulse">
      Loading interface...
    </p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Secure Shell Layout Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="new" element={<NewAssessment />} />
              <Route path="assessments" element={<AllAssessments />} />
              <Route path="assessments/:id" element={<AssessmentDetail />} />
              <Route path="sync" element={<Sync />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
