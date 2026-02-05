import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Calendar from './components/Calendar'
import Login from './components/Login'
import AdminLayout from './components/AdminLayout'
import DataMonitoring from './components/DataMonitoring'
import DataDepartment from './components/DataDepartment'
import DataUser from './components/DataUser'
import DataFasilitas from './components/DataFasilitas'
import DataRuangan from './components/DataRuangan'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/calendar" element={<Calendar />} />

        {/* Admin Routes - Protected */}
        <Route path="/admin" element={<Navigate to="/admin/monitoring" replace />} />
        <Route
          path="/admin/monitoring"
          element={
            <AdminLayout>
              <DataMonitoring />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/department"
          element={
            <AdminLayout>
              <DataDepartment />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/user"
          element={
            <AdminLayout>
              <DataUser />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/fasilitas"
          element={
            <AdminLayout>
              <DataFasilitas />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/ruangan"
          element={
            <AdminLayout>
              <DataRuangan />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/calendar"
          element={
            <AdminLayout>
              <Calendar />
            </AdminLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App
