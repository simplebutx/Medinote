import { createBrowserRouter, Navigate } from 'react-router-dom';

import LandingLayout from '../../components/layout/LandingLayout';
import AuthLayout from '../../components/layout/AuthLayout';
import AppLayout from '../../components/layout/AppLayout';

import PrivateRoute from './PrivateRoute';
import RoleRoute from './RoleRoute';

import LandingPage from '../../pages/LandingPage/LandingPage';
import LoginPage from '../../pages/LoginPage/LoginPage';
import SignupPage from '../../pages/SignupPage/SignupPage';

import SchedulePage from '../../pages/SchedulePage/SchedulePage';
import OcrPage from '../../pages/OcrPage/OcrPage';
import ChatPage from '../../pages/ChatPage/ChatPage';
import DrugSearchPage from '../../pages/DrugSearchPage/DrugSearchPage';
// import FaqPage from '../../pages/FaqPage/FaqPage';
import MapPage from '../../pages/MapPage/MapPage';
import NotifPage from '../../pages/NotifPage/NotifPage';
import IotPage from '../../pages/IotPage/IotPage';
import MyPage from '../../pages/MyPage/MyPage';

import PharmDashboardPage from '../../pages/PharmDashboardPage/PharmDashboardPage';
import ConsultPage from '../../pages/ConsultPage/ConsultPage';
import PatientPage from '../../pages/PatientPage/PatientPage';
import PharmDrugSearchPage from '../../pages/PharmDrugSearchPage/PharmDrugSearchPage';
import PharmInventoryPage from '../../pages/PharmInventoryPage/PharmInventoryPage';
import PharmMyPage from '../../pages/PharmMyPage/PharmMyPage';

import AdminDashboardPage from '../../pages/AdminDashboardPage/AdminDashboardPage';
import MemberManagePage from '../../pages/MemberManagePage/MemberManagePage';
import PharmacistManagePage from '../../pages/PharmacistManagePage/PharmacistManagePage';

export const router = createBrowserRouter([
  {
    element: <LandingLayout />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
    ],
  },

  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/signup',
        element: <SignupPage />,
      },
    ],
  },

  {
    element: <PrivateRoute />,
    children: [
      {
        element: <RoleRoute allowedRoles={['USER']} />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: '/app',
                element: <Navigate to="/app/schedule" replace />,
              },
              {
                path: '/app/schedule',
                element: <SchedulePage />,
              },
              {
                path: '/app/ocr',
                element: <OcrPage />,
              },
              {
                path: '/app/chat',
                element: <ChatPage />,
              },
              {
                path: '/app/drugs',
                element: <DrugSearchPage />,
              },
              // {
              //   path: '/app/faq',
              //   element: <FaqPage />,
              // },
              {
                path: '/app/pharmacies',
                element: <MapPage />,
              },
              {
                path: '/app/notifications',
                element: <NotifPage />,
              },
              {
                path: '/app/iot',
                element: <IotPage />,
              },
              {
                path: '/app/my',
                element: <MyPage />,
              },
            ],
          },
        ],
      },

      {
        element: <RoleRoute allowedRoles={['PHARMACIST']} />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: '/pharmacist',
                element: <Navigate to="/pharmacist/dashboard" replace />,
              },
              {
                path: '/pharmacist/dashboard',
                element: <PharmDashboardPage />,
              },
              {
                path: '/pharmacist/consults',
                element: <ConsultPage />,
              },
              {
                path: '/pharmacist/patients',
                element: <PatientPage />,
              },
              {
                path: '/pharmacist/drugs',
                element: <PharmDrugSearchPage />,
              },
              {
                path: '/pharmacist/inventory',
                element: <PharmInventoryPage />,
              },
              {
                path: '/pharmacist/notifications',
                element: <NotifPage />,
              },
              {
                path: '/pharmacist/my',
                element: <PharmMyPage />,
              },
            ],
          },
        ],
      },

      {
        element: <RoleRoute allowedRoles={['ADMIN']} />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: '/admin',
                element: <Navigate to="/admin/dashboard" replace />,
              },
              {
                path: '/admin/dashboard',
                element: <AdminDashboardPage />,
              },
              {
                path: '/admin/members',
                element: <MemberManagePage />,
              },
              {
                path: '/admin/pharmacists',
                element: <PharmacistManagePage />,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    path: '/schedule',
    element: <Navigate to="/app/schedule" replace />,
  },

  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
