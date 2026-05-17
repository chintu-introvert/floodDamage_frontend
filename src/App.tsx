import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import NewAssessment from './pages/NewAssessment';
import AllAssessments from './pages/AllAssessments';
import AssessmentDetail from './pages/AssessmentDetail';
import Sync from './pages/Sync';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="new" element={<NewAssessment />} />
          <Route path="assessments" element={<AllAssessments />} />
          <Route path="assessments/:id" element={<AssessmentDetail />} />
          <Route path="sync" element={<Sync />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
